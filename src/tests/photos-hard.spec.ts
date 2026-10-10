/**
 * Жёсткая проверка загрузки картинок: всё, что может прислать телефон,
 * браузер или человек со скриптом.
 *
 *   — форматы: всё, что умеет выдать камера или редактор, включая
 *     настоящий HEIC (HEVC) с айфона и 16-битный PNG;
 *   — поворот по EXIF во всех восьми положениях;
 *   — «бомбы»: крошечный файл с объявленным разрешением в 900 Мп;
 *   — мусор, пустые файлы, SVG, обрезанные на полпути JPEG;
 *   — подмена ключей: чужое мероприятие, `../`, ключ обложки вместо фото;
 *   — гонки: десять подтверждений разом при лимите в пять, повтор
 *     подтверждения того же файла.
 *
 * HEIC лежит в `fixtures/` — его собирает `scripts/make-heic-fixture.mjs`:
 * sharp HEIC не пишет, а проверять надо ровно то, что шлёт айфон.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { crc32 } from "node:zlib";
import path from "node:path";
import sharp from "sharp";
import { testDb, resetDb } from "./helpers/db";
import { GUEST_PHOTO, INVITE_ASSET, convertImage } from "@/server/images/convert";
import { completeUpload, startUpload } from "@/server/services/photos";
import { completeAssetUpload, startAssetUpload } from "@/server/services/assets";
import { deleteEvent } from "@/server/repositories/events";
import {
  assetKey, deletePrefix, getObject, headObject, photoKeys, readObject,
} from "@/server/storage/s3";
import { normalizeName } from "@/lib/name-normalize";
import type { EventContext } from "@/server/context";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name));

const solid = (width: number, height: number, background = "#8a7") =>
  sharp({ create: { width, height, channels: 3, background } });

/** Кадр «как с телефона»: шум, чтобы JPEG весил как настоящий снимок. */
async function phoneShot(width: number, height: number): Promise<Buffer> {
  const raw = randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } }).blur(1.5).jpeg({ quality: 92 }).toBuffer();
}

/** PNG, который объявляет о себе `width × height`, а весит сотню байт. */
async function pngBomb(width: number, height: number): Promise<Buffer> {
  const png = Buffer.from(await solid(1, 1).png().toBuffer());
  // IHDR идёт сразу за сигнатурой: длина(4) тип(4) ширина(4) высота(4)…
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
  return png;
}

async function expectGoodOutput(input: Buffer) {
  const out = await convertImage(input, GUEST_PHOTO);
  const meta = await sharp(out.body).metadata();
  expect(meta.format).toBe("webp");
  expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2560);
  expect(meta.exif).toBeUndefined();
  expect([out.width, out.height]).toEqual([meta.width, meta.height]);

  const thumb = await sharp(out.thumb!).metadata();
  expect(thumb.format).toBe("webp");
  expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(480);
  return out;
}

describe("форматы: всё, что может прислать гость, становится WebP", () => {
  const cases: Array<[string, () => Promise<Buffer>]> = [
    ["JPEG", () => solid(800, 600).jpeg().toBuffer()],
    ["прогрессивный JPEG", () => solid(800, 600).jpeg({ progressive: true }).toBuffer()],
    ["JPEG в оттенках серого", () => solid(800, 600).grayscale().jpeg().toBuffer()],
    ["JPEG в CMYK (из типографии)", () => solid(800, 600).toColourspace("cmyk").jpeg().toBuffer()],
    ["JPEG с профилем Display P3 (айфон)", () => solid(800, 600).withIccProfile("p3").jpeg().toBuffer()],
    ["PNG", () => solid(800, 600).png().toBuffer()],
    ["PNG 16 бит", () => solid(800, 600).toColourspace("rgb16").png().toBuffer()],
    ["PNG с прозрачностью", () =>
      sharp({ create: { width: 800, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.3 } } })
        .png().toBuffer()],
    ["WebP", () => solid(800, 600).webp().toBuffer()],
    ["WebP без потерь", () => solid(800, 600).webp({ lossless: true }).toBuffer()],
    ["AVIF (Android 12+)", () => solid(800, 600).avif().toBuffer()],
    ["TIFF (сканер)", () => solid(800, 600).tiff().toBuffer()],
    ["GIF", () => solid(800, 600).gif().toBuffer()],
    ["HEIC с айфона (HEVC)", async () => fixture("photo.heic")],
    ["1 × 1 пиксель", () => solid(1, 1).jpeg().toBuffer()],
    ["панорама 12000 × 20", () => solid(12000, 20).jpeg().toBuffer()],
  ];

  for (const [name, make] of cases) {
    it(name, async () => {
      await expectGoodOutput(await make());
    });
  }

  it("снимок 12 Мп ужимается до 2560 px и в разы теряет вес", async () => {
    const shot = await phoneShot(4032, 3024);
    const out = await expectGoodOutput(shot);
    expect([out.width, out.height]).toEqual([2560, 1920]);
    expect(out.body.byteLength).toBeLessThan(shot.byteLength / 2);
  });

  it("обрезанный на полпути JPEG (гость потерял связь) всё равно принимается", async () => {
    const shot = await phoneShot(1600, 1200);
    await expectGoodOutput(shot.subarray(0, Math.floor(shot.length * 0.6)));
  });

  it("анимированный GIF гостя становится одним кадром", async () => {
    const frames = await Promise.all(["#f00", "#0f0", "#00f"].map((c) => solid(60, 40, c).png().toBuffer()));
    const gif = await sharp(frames, { join: { animated: true } }).gif().toBuffer();
    const out = await convertImage(gif, GUEST_PHOTO);
    expect((await sharp(out.body).metadata()).pages ?? 1).toBe(1);
  });

  it("прозрачность сохраняется, а не заливается чёрным", async () => {
    const png = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer();
    const out = await convertImage(png, INVITE_ASSET);
    const { data } = await sharp(out.body).raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
  });
});

describe("поворот: фото стоит так, как его снимали", () => {
  /** Слева красная полоса — по ней видно, куда повернули кадр. */
  async function marked(orientation: number) {
    const raw = Buffer.alloc(400 * 200 * 3, 200);
    for (let y = 0; y < 200; y++) for (let x = 0; x < 100; x++) raw.set([255, 0, 0], (y * 400 + x) * 3);
    return sharp(raw, { raw: { width: 400, height: 200, channels: 3 } })
      .jpeg()
      .withMetadata({ orientation })
      .toBuffer();
  }

  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`EXIF orientation ${orientation}`, async () => {
      const out = await convertImage(await marked(orientation), GUEST_PHOTO);
      // 5–8 — кадр повёрнут на 90°: ширина и высота меняются местами.
      expect([out.width, out.height]).toEqual(orientation >= 5 ? [200, 400] : [400, 200]);
    });
  }

  it("orientation 6 (айфон вертикально): красная полоса оказывается сверху", async () => {
    const out = await convertImage(await marked(6), GUEST_PHOTO);
    const { data, info } = await sharp(out.body).raw().toBuffer({ resolveWithObject: true });
    const red = (x: number, y: number) => data[(y * info.width + x) * info.channels] > 200 &&
      data[(y * info.width + x) * info.channels + 1] < 80;
    expect(red(100, 20)).toBe(true);
    expect(red(100, 380)).toBe(false);
  });

  it("HEIC с поворотом в контейнере (irot) тоже встаёт правильно", async () => {
    const out = await convertImage(fixture("photo-rot90.heic"), GUEST_PHOTO);
    expect([out.width, out.height]).toEqual([960, 1280]);
    // В исходнике красный угол — слева сверху; после поворота на 90°
    // против часовой он внизу слева.
    const { data, info } = await sharp(out.body).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
    expect(at(20, info.height - 20)[0]).toBeGreaterThan(200);
    expect(at(20, info.height - 20)[1]).toBeLessThan(60);
  });
});

describe("то, что принимать нельзя", () => {
  const rejects = async (input: Buffer) =>
    expect(convertImage(input, GUEST_PHOTO)).rejects.toThrow();

  it("SVG — документ со ссылками и скриптами, а не фото", async () => {
    await rejects(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'));
  });
  it("случайные байты", async () => rejects(randomBytes(5000)));
  it("пустой файл", async () => rejects(Buffer.alloc(0)));
  it("PDF", async () => rejects(Buffer.from("%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF")));
  it("видео вместо фото", async () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypmp42"), Buffer.alloc(100)]);
    await rejects(mp4);
  });
  it("«HEIC» с правильным заголовком и мусором внутри", async () => {
    await rejects(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), randomBytes(500)]));
  });

  it("PNG-бомба: 100 байт, объявляющие 900 Мп, отвергаются сразу и без выделения памяти", async () => {
    const bomb = await pngBomb(30000, 30000);
    expect(bomb.byteLength).toBeLessThan(200);
    const before = process.memoryUsage().rss;
    const started = Date.now();
    await rejects(bomb);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(process.memoryUsage().rss - before).toBeLessThan(100 * 1024 * 1024);
  });
});

// ─── Через хранилище и базу ─────────────────────────────────────────────

type World = { ref: { orgId: string; eventId: string; guestId: string }; ctx: EventContext };

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: { orgId: org.id, title: slug, slug, shortCode: code, eventDate: new Date("2026-09-12") },
  });
  const guest = await testDb.guest.create({
    data: {
      orgId: org.id, eventId: event.id, displayName: "Анна Петрова",
      searchKey: normalizeName("Анна Петрова"), linkToken: randomBytes(16).toString("base64url"),
    },
  });
  return {
    ref: { orgId: org.id, eventId: event.id, guestId: guest.id },
    ctx: { kind: "org", role: "OWNER", orgId: org.id, userId: "u1", eventId: event.id },
  };
}

async function put(url: string, body: Buffer, contentType: string) {
  return fetch(url, { method: "PUT", headers: { "content-type": contentType }, body: new Uint8Array(body) });
}

async function uploadPhoto(world: World, body: Buffer, contentType: string) {
  const started = await startUpload(world.ref, { contentType, bytes: body.byteLength });
  if (!started.ok) throw new Error(started.message);
  expect((await put(started.ticket.uploadUrl, body, contentType)).ok).toBe(true);
  return started.ticket.storageKey;
}

let a: World;
let b: World;

/** Ключ, под которым фото лежит после проверки, — из базы. */
async function storedKey(world: World) {
  const photo = await testDb.photo.findFirstOrThrow({ where: { eventId: world.ref.eventId }, select: { storageKey: true } });
  return photo.storageKey;
}

beforeAll(async () => {
  const health = await fetch("http://localhost:9000/minio/health/live").catch(() => null);
  if (!health?.ok) throw new Error("Хранилище не отвечает на :9000 — поднимите MinIO");
});

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("hard-a", "HARDA1");
  b = await makeWorld("hard-b", "HARDB1");
});

afterEach(async () => {
  await Promise.all([deletePrefix(`events/${a.ref.eventId}/`), deletePrefix(`events/${b.ref.eventId}/`)]);
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("загрузка целиком: сквозь хранилище и базу", () => {
  it("HEIC без типа (Chrome на Windows) доходит до галереи как WebP", async () => {
    const key = await uploadPhoto(a, fixture("photo.heic"), "application/octet-stream");
    const result = await completeUpload(a.ref, { storageKey: key });
    expect(result.ok).toBe(true);
    expect((await headObject(await storedKey(a))).contentType).toBe("image/webp");
  });

  it("исходник заменяется, а не лежит рядом: в хранилище только WebP и превью", async () => {
    const key = await uploadPhoto(a, await phoneShot(3000, 2000), "image/jpeg");
    const result = await completeUpload(a.ref, { storageKey: key });
    if (!result.ok) throw new Error(result.message);
    const stored = await sharp(await readObject(await storedKey(a))).metadata();
    expect(stored.format).toBe("webp");
    await expect(headObject(key)).rejects.toThrow();
    expect(await testDb.photo.count({ where: { eventId: a.ref.eventId } })).toBe(1);
  });

  it("повторный PUT по той же ссылке не подменяет уже принятое фото", async () => {
    // Подписанная ссылка живёт 15 минут. Раньше готовое фото лежало по ключу
    // загрузки, и второй PUT заменял его в обход перекодирования и фильтра.
    const body = await solid(300, 200).jpeg().toBuffer();
    const started = await startUpload(a.ref, { contentType: "image/jpeg", bytes: body.byteLength });
    if (!started.ok) throw new Error(started.message);
    expect((await put(started.ticket.uploadUrl, body, "image/jpeg")).ok).toBe(true);
    const result = await completeUpload(a.ref, { storageKey: started.ticket.storageKey });
    if (!result.ok) throw new Error(result.message);
    const key = await storedKey(a);
    expect(key).not.toBe(started.ticket.storageKey);
    const before = await readObject(key);

    const swap = await solid(300, 200, "#f00").jpeg().toBuffer();
    expect((await put(started.ticket.uploadUrl, swap, "image/jpeg")).ok).toBe(true);
    expect(Buffer.compare(await readObject(key), before)).toBe(0);
    expect(await completeUpload(a.ref, { storageKey: started.ticket.storageKey })).toMatchObject({ reason: "duplicate" });
    await expect(headObject(started.ticket.storageKey)).rejects.toThrow();
  });

  it("хранилище не примет файл с другим типом, чем подписан", async () => {
    const started = await startUpload(a.ref, { contentType: "image/jpeg", bytes: 100 });
    if (!started.ok) throw new Error(started.message);
    const response = await put(started.ticket.uploadUrl, await solid(10, 10).png().toBuffer(), "image/png");
    expect(response.ok).toBe(false);
  });

  it("браузер соврал о размере: 41 МБ отвергаются и удаляются", async () => {
    const started = await startUpload(a.ref, { contentType: "image/jpeg", bytes: 1000 });
    if (!started.ok) throw new Error(started.message);
    await put(started.ticket.uploadUrl, Buffer.alloc(41 * 1024 * 1024, 1), "image/jpeg");
    const result = await completeUpload(a.ref, { storageKey: started.ticket.storageKey });
    expect(result).toMatchObject({ ok: false, reason: "size" });
    expect(await getObject(started.ticket.storageKey)).toBeNull();
  });

  it("мусор под видом JPEG отвергается, в базе и хранилище пусто", async () => {
    const key = await uploadPhoto(a, randomBytes(20000), "image/jpeg");
    expect(await completeUpload(a.ref, { storageKey: key })).toMatchObject({ reason: "unreadable" });
    expect(await getObject(key)).toBeNull();
    expect(await testDb.photo.count({ where: { eventId: a.ref.eventId } })).toBe(0);
  });
});

describe("подмена ключей", () => {
  const foreign = (storageKey: string) =>
    expect(completeUpload(a.ref, { storageKey })).resolves.toMatchObject({ ok: false, reason: "foreign" });

  it("ключ чужого мероприятия", async () => foreign(photoKeys(b.ref.eventId).storageKey));
  it("выход наверх через ../", async () =>
    foreign(`events/${a.ref.eventId}/photos/../../${b.ref.eventId}/photos/x`));
  it("ключ превью вместо фото", async () => foreign(photoKeys(a.ref.eventId).thumbKey));
  it("ключ обложки организатора", async () => foreign(assetKey(a.ref.eventId)));
  it("ключ с расширением", async () => foreign(`events/${a.ref.eventId}/photos/abc.webp`));
  it("пустой и мусорный ключ", async () => {
    await foreign("");
    await foreign("events//photos/");
  });
});

describe("гонки", () => {
  it("десять подтверждений разом при лимите в пять — ровно пять фото", async () => {
    const img = await solid(1200, 900).jpeg().toBuffer();
    const keys: string[] = [];
    for (let i = 0; i < 10; i++) keys.push(await uploadPhoto(a, img, "image/jpeg"));

    const results = await Promise.all(keys.map((storageKey) => completeUpload(a.ref, { storageKey })));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    expect(await testDb.photo.count({ where: { eventId: a.ref.eventId } })).toBe(5);

    // Лишние файлы не остаются висеть в бакете.
    const rejected = keys.filter((_, i) => !results[i].ok);
    for (const key of rejected) expect(await getObject(key)).toBeNull();
  });

  it("повтор подтверждения того же файла не заводит вторую строку", async () => {
    const key = await uploadPhoto(a, await solid(300, 200).jpeg().toBuffer(), "image/jpeg");
    const [first, second] = await Promise.all([
      completeUpload(a.ref, { storageKey: key }),
      completeUpload(a.ref, { storageKey: key }),
    ]);
    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    expect(await completeUpload(a.ref, { storageKey: key })).toMatchObject({ reason: "duplicate" });
    expect(await testDb.photo.count({ where: { eventId: a.ref.eventId } })).toBe(1);
  });

  it("два гостя грузят одновременно — лимит у каждого свой", async () => {
    const img = await solid(400, 300).jpeg().toBuffer();
    const keysA = await Promise.all([0, 1, 2].map(() => uploadPhoto(a, img, "image/jpeg")));
    const keysB = await Promise.all([0, 1, 2].map(() => uploadPhoto(b, img, "image/jpeg")));
    const results = await Promise.all([
      ...keysA.map((storageKey) => completeUpload(a.ref, { storageKey })),
      ...keysB.map((storageKey) => completeUpload(b.ref, { storageKey })),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
  });
});

describe("картинки организатора", () => {
  async function uploadAsset(body: Buffer, contentType: string) {
    const started = await startAssetUpload(a.ctx, contentType, body.byteLength);
    if (!started.ok) throw new Error(started.message);
    expect((await put(started.uploadUrl, body, contentType)).ok).toBe(true);
    return started.key;
  }

  it("HEIC без типа становится WebP", async () => {
    const key = await uploadAsset(fixture("photo.heic"), "application/octet-stream");
    const done = await completeAssetUpload(a.ctx, key, "");
    expect(done.ok).toBe(true);
    expect((await headObject(key)).contentType).toBe("image/webp");
  });

  it("сжимается мягче, чем фото гостя: качество видно по весу", async () => {
    const shot = await phoneShot(2400, 1600);
    const asGuest = await convertImage(shot, GUEST_PHOTO);
    const asAsset = await convertImage(shot, INVITE_ASSET);
    expect(asAsset.body.byteLength).toBeGreaterThan(asGuest.body.byteLength);
  });

  it("песня не перекодируется и не проверяется как картинка", async () => {
    const mp3 = Buffer.concat([Buffer.from("ID3"), randomBytes(4000)]);
    const key = await uploadAsset(mp3, "audio/mpeg");
    const done = await completeAssetUpload(a.ctx, key, "");
    expect(done.ok).toBe(true);
    expect((await readObject(key)).equals(mp3)).toBe(true);
  });

  it("мусор под видом картинки отвергается и удаляется", async () => {
    const key = await uploadAsset(randomBytes(3000), "image/png");
    expect((await completeAssetUpload(a.ctx, key, "")).ok).toBe(false);
    expect(await getObject(key)).toBeNull();
  });
});

describe("удаление свадьбы", () => {
  it("уносит из хранилища фото, превью и брошенные загрузки, а не только строки", async () => {
    const key = await uploadPhoto(a, await solid(300, 200).jpeg().toBuffer(), "image/jpeg");
    const done = await completeUpload(a.ref, { storageKey: key });
    if (!done.ok) throw new Error(done.message);
    await uploadPhoto(a, await solid(300, 200).jpeg().toBuffer(), "image/jpeg"); // загрузка без подтверждения
    const stored = await storedKey(a);

    const ok = await deleteEvent({ kind: "org", userId: "u", orgId: a.ref.orgId, role: "OWNER" }, a.ref.eventId);
    expect(ok).toBe(true);
    expect(await testDb.event.count({ where: { id: a.ref.eventId } })).toBe(0);
    await expect(headObject(stored)).rejects.toThrow();
    expect(await deletePrefix(`events/${a.ref.eventId}/`)).toBe(0);
  });

  it("чужая организация не удаляет ни строки, ни файлы", async () => {
    const key = await uploadPhoto(a, await solid(300, 200).jpeg().toBuffer(), "image/jpeg");
    expect(await deleteEvent({ kind: "org", userId: "u", orgId: b.ref.orgId, role: "OWNER" }, a.ref.eventId)).toBe(false);
    expect((await headObject(key)).bytes).toBeGreaterThan(0);
    expect(await testDb.event.count({ where: { id: a.ref.eventId } })).toBe(1);
  });
});
