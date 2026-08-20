/**
 * Фотографии: лимит, подтверждение загрузки, модерация.
 *
 * Тесты ходят в НАСТОЯЩЕЕ хранилище (MinIO на :9000), как остальные — в
 * настоящий PostgreSQL. Причина та же: весь риск этапа сидит в стыке с
 * S3 — подпись, тип содержимого, реальный размер объекта, — и мок этот
 * стык не проверяет, а имитирует.
 *
 * Если MinIO не поднят, тесты падают с понятным сообщением, а не молча
 * пропускаются: молчаливый пропуск здесь опаснее падения.
 */
import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import {
  completeUpload, deletePhoto, guestQuota, listApprovedPhotos, listGuestPhotos,
  listPendingPhotos, moderatePhoto, startUpload,
} from "@/server/services/photos";
import { deletePrefix, getObject, keyBelongsToEvent, photoKeys } from "@/server/storage/s3";
import { normalizeName } from "@/lib/name-normalize";

/** Однопиксельный PNG — минимальный файл, который хранилище примет. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

type World = { orgId: string; eventId: string; guestId: string; ref: GuestRefLike };
type GuestRefLike = { orgId: string; eventId: string; guestId: string };

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: code,
      eventDate: new Date("2026-09-12"),
    },
  });
  const guest = await testDb.guest.create({
    data: {
      orgId: org.id, eventId: event.id, displayName: "Анна Петрова",
      searchKey: normalizeName("Анна Петрова"),
      linkToken: randomBytes(16).toString("base64url"),
    },
  });
  const ref = { orgId: org.id, eventId: event.id, guestId: guest.id };
  return { orgId: org.id, eventId: event.id, guestId: guest.id, ref };
}

/** Загрузка целиком: подписанная ссылка → PUT в хранилище → подтверждение. */
async function upload(ref: GuestRefLike, body: Buffer = PNG) {
  const started = await startUpload(ref, { contentType: "image/png", bytes: body.byteLength });
  if (!started.ok) throw new Error(`не выдалась ссылка: ${started.message}`);

  const put = await fetch(started.ticket.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png" },
    body: new Uint8Array(body),
  });
  expect(put.ok).toBe(true);

  return completeUpload(ref, {
    storageKey: started.ticket.storageKey,
    thumbKey: started.ticket.thumbKey,
    width: 1,
    height: 1,
    previewOk: false,
  });
}

beforeAll(async () => {
  const health = await fetch("http://localhost:9000/minio/health/live").catch(() => null);
  if (!health?.ok) {
    throw new Error(
      "Хранилище не отвечает на :9000. Поднимите MinIO: см. «Команды» в CLAUDE.md",
    );
  }
});

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("photo-a", "PHOTOA");
  b = await makeWorld("photo-b", "PHOTOB");
});

/** Тесты прибирают за собой не только в базе, но и в бакете: иначе
 *  за месяц прогонов там накопятся тысячи однопиксельных PNG. */
afterEach(async () => {
  await Promise.all([
    deletePrefix(`events/${a.eventId}/`),
    deletePrefix(`events/${b.eventId}/`),
  ]);
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("ключи объектов", () => {
  it("кладёт фото под префикс мероприятия", () => {
    const keys = photoKeys("evt123");
    expect(keys.storageKey.startsWith("events/evt123/photos/")).toBe(true);
    expect(keys.thumbKey.startsWith("events/evt123/thumbs/")).toBe(true);
  });

  it("имя файла с телефона в ключ не попадает", () => {
    const keys = photoKeys("evt123");
    expect(keys.storageKey).not.toContain(".");
    expect(keys.storageKey.split("/")).toHaveLength(4);
  });

  it("чужой префикс не признаёт своим", () => {
    expect(keyBelongsToEvent("events/other/photos/x", "evt123")).toBe(false);
  });
});

describe("выдача ссылки на загрузку", () => {
  it("отказывает, если загрузка выключена организатором", async () => {
    await testDb.event.update({ where: { id: a.eventId }, data: { photosEnabled: false } });
    const result = await startUpload(a.ref, { contentType: "image/jpeg", bytes: 1000 });
    expect(result).toMatchObject({ ok: false, reason: "disabled" });
  });

  it("не принимает файл, который не фотография", async () => {
    const result = await startUpload(a.ref, { contentType: "application/pdf", bytes: 1000 });
    expect(result).toMatchObject({ ok: false, reason: "type" });
  });

  it("не принимает файл больше 12 МБ", async () => {
    const result = await startUpload(a.ref, {
      contentType: "image/jpeg",
      bytes: 13 * 1024 * 1024,
    });
    expect(result).toMatchObject({ ok: false, reason: "size" });
  });
});

describe("загрузка целиком", () => {
  it("доходит до строки в БД и до объекта в хранилище", async () => {
    const result = await upload(a.ref);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const photo = await testDb.photo.findUniqueOrThrow({ where: { id: result.photoId } });
    expect(photo.status).toBe("PENDING");
    // Размер берётся у хранилища, а не со слов клиента.
    expect(photo.bytes).toBe(PNG.byteLength);
    expect(photo.previewOk).toBe(false);

    const object = await getObject(photo.storageKey);
    expect(object).not.toBeNull();
  });

  it("шестое фото не принимается", async () => {
    for (let i = 0; i < 5; i++) expect((await upload(a.ref)).ok).toBe(true);

    const sixth = await startUpload(a.ref, { contentType: "image/png", bytes: PNG.byteLength });
    expect(sixth).toMatchObject({ ok: false, reason: "limit" });

    const count = await testDb.photo.count({ where: { eventId: a.eventId } });
    expect(count).toBe(5);
  });

  it("отклонённое фото освобождает место в лимите", async () => {
    const first = await upload(a.ref);
    if (!first.ok) throw new Error("не загрузилось");
    for (let i = 0; i < 4; i++) await upload(a.ref);

    expect((await guestQuota(a.ref)).left).toBe(0);
    await moderatePhoto({ ...a.ref, userId: "u1" }, first.photoId, "REJECTED");
    expect((await guestQuota(a.ref)).left).toBe(1);
  });

  it("не даёт приписать себе файл чужого мероприятия", async () => {
    const foreign = photoKeys(b.eventId);
    const result = await completeUpload(a.ref, {
      storageKey: foreign.storageKey,
      thumbKey: foreign.thumbKey,
      width: 1, height: 1, previewOk: false,
    });
    expect(result).toMatchObject({ ok: false, reason: "foreign" });
  });

  it("не создаёт строку, если файл до хранилища не долетел", async () => {
    const keys = photoKeys(a.eventId);
    const result = await completeUpload(a.ref, {
      storageKey: keys.storageKey,
      thumbKey: keys.thumbKey,
      width: 1, height: 1, previewOk: false,
    });
    expect(result).toMatchObject({ ok: false, reason: "missing" });
    expect(await testDb.photo.count({ where: { eventId: a.eventId } })).toBe(0);
  });

  it("подтверждение сверх лимита убирает за собой файл из хранилища", async () => {
    // Ссылку берём, пока место есть, а подтверждаем — когда его уже нет:
    // ровно то, что делают две открытые вкладки.
    const started = await startUpload(a.ref, {
      contentType: "image/png",
      bytes: PNG.byteLength,
    });
    if (!started.ok) throw new Error("не выдалась ссылка");
    await fetch(started.ticket.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(PNG),
    });
    for (let i = 0; i < 5; i++) await upload(a.ref);

    const result = await completeUpload(a.ref, {
      storageKey: started.ticket.storageKey,
      thumbKey: started.ticket.thumbKey,
      width: 1, height: 1, previewOk: false,
    });
    expect(result).toMatchObject({ ok: false, reason: "limit" });
    expect(await getObject(started.ticket.storageKey)).toBeNull();
  });
});

describe("модерация", () => {
  it("одобренное попадает в галерею, ожидающее — нет", async () => {
    const first = await upload(a.ref);
    await upload(a.ref);
    if (!first.ok) throw new Error("не загрузилось");

    expect(await listApprovedPhotos(a.eventId)).toHaveLength(0);
    await moderatePhoto({ ...a.ref, userId: "u1" }, first.photoId, "APPROVED");

    const approved = await listApprovedPhotos(a.eventId);
    expect(approved).toHaveLength(1);
    expect(approved[0].id).toBe(first.photoId);
    expect(await listPendingPhotos(a.eventId)).toHaveLength(1);
  });

  it("не дотягивается до фото чужого мероприятия", async () => {
    const foreign = await upload(b.ref);
    if (!foreign.ok) throw new Error("не загрузилось");

    const ok = await moderatePhoto({ ...a.ref, userId: "u1" }, foreign.photoId, "APPROVED");
    expect(ok).toBe(false);

    const photo = await testDb.photo.findUniqueOrThrow({ where: { id: foreign.photoId } });
    expect(photo.status).toBe("PENDING");
  });

  it("удаление убирает и строку, и оба объекта", async () => {
    const result = await upload(a.ref);
    if (!result.ok) throw new Error("не загрузилось");
    const photo = await testDb.photo.findUniqueOrThrow({ where: { id: result.photoId } });

    expect(await deletePhoto(a.ref, result.photoId)).toBe(true);
    expect(await testDb.photo.findUnique({ where: { id: result.photoId } })).toBeNull();
    expect(await getObject(photo.storageKey)).toBeNull();
  });

  it("удаление чужого фото ничего не делает", async () => {
    const foreign = await upload(b.ref);
    if (!foreign.ok) throw new Error("не загрузилось");
    expect(await deletePhoto(a.ref, foreign.photoId)).toBe(false);
    expect(await testDb.photo.findUnique({ where: { id: foreign.photoId } })).not.toBeNull();
  });

  it("гость видит свои фото в любом статусе и не видит чужих", async () => {
    const mine = await upload(a.ref);
    await upload(b.ref);
    if (!mine.ok) throw new Error("не загрузилось");

    const list = await listGuestPhotos(a.ref);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(mine.photoId);
  });
});
