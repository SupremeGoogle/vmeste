/**
 * Картинки организатора: загрузка, отдача, разделение мероприятий.
 *
 * Тест ходит в настоящее хранилище, как и тесты гостевых фотографий:
 * весь риск этого контура сидит в стыке с S3, и мок его не проверяет,
 * а имитирует.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import {
  completeAssetUpload, deleteAsset, listAssets, startAssetUpload, assetUrl,
} from "@/server/services/assets";
import { assetKey, headObject } from "@/server/storage/s3";
import type { EventContext } from "@/server/context";

let a: EventContext;
let b: EventContext;

async function makeEvent(name: string): Promise<EventContext> {
  const org = await testDb.organization.create({
    data: {
      name,
      slug: `${name}-${Math.random().toString(36).slice(2, 8)}`,
      members: {
        create: {
          role: "OWNER",
          user: {
            create: {
              email: `${name}-${Math.random().toString(36).slice(2, 8)}@example.com`,
              name,
              passwordHash: "scrypt$00$00",
            },
          },
        },
      },
    },
    include: { members: true },
  });

  const event = await testDb.event.create({
    data: {
      orgId: org.id,
      title: name,
      slug: `e-${Math.random().toString(36).slice(2, 8)}`,
      shortCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      eventDate: new Date("2026-08-15T13:00:00Z"),
      guestLinkSecret: "secret",
    },
  });

  return { kind: "org", role: "OWNER", orgId: org.id, userId: org.members[0].userId, eventId: event.id };
}

beforeEach(async () => {
  await resetDb();
  a = await makeEvent("Первая");
  b = await makeEvent("Вторая");
});
afterAll(resetDb);

/** Кладёт настоящий файл в хранилище по подписанной ссылке. */
async function upload(ctx: EventContext, bytes = 2048) {
  const started = await startAssetUpload(ctx, "image/jpeg", bytes);
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error(started.message);

  const put = await fetch(started.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: new Uint8Array(bytes),
  });
  expect(put.ok, "хранилище не поднято? см. CLAUDE.md про MinIO").toBe(true);

  return started.key;
}

describe("загрузка картинки организатором", () => {
  it("строка появляется только после подтверждения", async () => {
    const key = await upload(a);
    expect(await listAssets(a)).toHaveLength(0);

    const done = await completeAssetUpload(a, key, "Обложка");
    expect(done.ok).toBe(true);
    expect(await listAssets(a)).toHaveLength(1);
  });

  it("размер берётся у хранилища, а не со слов браузера", async () => {
    const key = await upload(a, 4096);
    const done = await completeAssetUpload(a, key, "");
    expect(done.ok && done.asset.bytes).toBe(4096);

    const head = await headObject(key);
    expect(head.bytes).toBe(4096);
  });

  it("не изображение не принимается", async () => {
    const result = await startAssetUpload(a, "application/pdf", 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("изображения");
  });

  it("слишком большой файл отвергается по-человечески", async () => {
    const result = await startAssetUpload(a, "image/jpeg", 99_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("МБ");
  });

  it("подтверждение без файла в хранилище не создаёт строку", async () => {
    const key = assetKey(a.eventId);
    const done = await completeAssetUpload(a, key, "");
    expect(done.ok).toBe(false);
    expect(await listAssets(a)).toHaveLength(0);
  });

  it("чужой ключ не подтвердить", async () => {
    const key = await upload(a);
    // Организатор другого мероприятия знает ключ и пробует его присвоить.
    const stolen = await completeAssetUpload(b, key, "");
    expect(stolen.ok).toBe(false);
    expect(await listAssets(b)).toHaveLength(0);
  });
});

describe("разделение мероприятий", () => {
  it("картинки соседа не видны и не удаляются", async () => {
    const key = await upload(a);
    const done = await completeAssetUpload(a, key, "Наша");
    expect(done.ok).toBe(true);
    if (!done.ok) return;

    expect(await listAssets(b)).toHaveLength(0);
    expect(await deleteAsset(b, done.asset.id)).toBe(false);
    expect(await listAssets(a)).toHaveLength(1);

    expect(await deleteAsset(a, done.asset.id)).toBe(true);
    expect(await listAssets(a)).toHaveLength(0);
  });

  it("адрес картинки всегда содержит мероприятие", () => {
    // Без него запрос был бы поиском по одному id — а это запрещает
    // страж мультиарендности.
    expect(assetUrl("ev1", "as1")).toBe("/api/asset/ev1/as1");
  });
});
