/**
 * Сроки хранения: через 10 дней после свадьбы — архив, через 15 — фото
 * удаляются насовсем, вместе с файлами в хранилище (настоящий MinIO).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import { runRetention } from "@/server/services/retention";
import { deletePrefix, getObject, photoKeys, putObject } from "@/server/storage/s3";
import { archiveAt, purgeAt, retentionStage } from "@/lib/retention";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-06T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

const created: string[] = [];

async function wedding(slug: string, eventDate: Date, photos = 2, status: "DRAFT" | "PUBLISHED" = "PUBLISHED") {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: { orgId: org.id, title: slug, slug, shortCode: `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`, eventDate, status },
  });
  created.push(event.id);
  const keys: string[] = [];
  for (let i = 0; i < photos; i++) {
    const { storageKey, thumbKey } = photoKeys(event.id);
    await putObject(storageKey, Buffer.from("photo"), "image/webp");
    await putObject(thumbKey, Buffer.from("thumb"), "image/webp");
    await testDb.photo.create({
      data: { orgId: org.id, eventId: event.id, storageKey, thumbKey, width: 1, height: 1, bytes: 5, status: "APPROVED" },
    });
    keys.push(storageKey, thumbKey);
  }
  return { id: event.id, keys };
}

const status = async (id: string) => (await testDb.event.findUniqueOrThrow({ where: { id } })).status;
const photoCount = (eventId: string) => testDb.photo.count({ where: { eventId } });

beforeAll(async () => {
  const health = await fetch("http://localhost:9000/minio/health/live").catch(() => null);
  if (!health?.ok) throw new Error("Хранилище не отвечает на :9000 — поднимите MinIO");
});
beforeEach(() => resetDb());
afterEach(async () => {
  delete process.env.RETENTION_EXEMPT_EMAILS;
  await Promise.all(created.splice(0).map((id) => deletePrefix(`events/${id}/`)));
});

describe("сроки по дате свадьбы", () => {
  it("10 дней — активна, после — архив, после 15 — фото удалены", () => {
    const date = new Date("2026-07-12T13:00:00Z");
    expect(archiveAt(date).toISOString()).toBe("2026-07-22T13:00:00.000Z");
    expect(purgeAt(date).toISOString()).toBe("2026-07-27T13:00:00.000Z");
    expect(retentionStage(date, new Date("2026-07-22T12:59:00Z"))).toBe("active");
    expect(retentionStage(date, new Date("2026-07-22T13:00:00Z"))).toBe("archived");
    expect(retentionStage(date, new Date("2026-07-27T13:00:00Z"))).toBe("purged");
  });
});

describe("фоновая задача", () => {
  it("свежую свадьбу не трогает, прошедшую 10 дней назад — в архив с фото, 15 — удаляет фото", async () => {
    const fresh = await wedding("ret-fresh", daysAgo(3));
    const future = await wedding("ret-future", new Date(NOW.getTime() + 30 * DAY), 1, "DRAFT");
    const archived = await wedding("ret-archive", daysAgo(11));
    const old = await wedding("ret-old", daysAgo(16), 3);

    const report = await runRetention(NOW);

    expect(await status(fresh.id)).toBe("PUBLISHED");
    expect(await status(future.id)).toBe("DRAFT");
    expect(await photoCount(fresh.id)).toBe(2);

    // Архив: гостям закрыто, но фото ещё можно скачать.
    expect(await status(archived.id)).toBe("ARCHIVED");
    expect(await photoCount(archived.id)).toBe(2);
    expect(await getObject(archived.keys[0])).not.toBeNull();

    // 15 дней: в архиве, фото нет ни в базе, ни в хранилище.
    expect(await status(old.id)).toBe("ARCHIVED");
    expect(await photoCount(old.id)).toBe(0);
    for (const key of old.keys) expect(await getObject(key)).toBeNull();

    expect(report).toEqual({ archived: 2, purgedEvents: 1, purgedPhotos: 3 });
  });

  it("повторный запуск ничего не ломает и ничего не делает дважды", async () => {
    await wedding("ret-old2", daysAgo(20));
    await runRetention(NOW);
    expect(await runRetention(NOW)).toEqual({ archived: 0, purgedEvents: 0, purgedPhotos: 0 });
  });

  it("брошенная загрузка (файл без строки) тоже удаляется", async () => {
    const old = await wedding("ret-orphan", daysAgo(16), 0);
    const orphan = photoKeys(old.id).storageKey;
    await putObject(orphan, Buffer.from("x"), "image/webp");
    await runRetention(NOW);
    expect(await getObject(orphan)).toBeNull();
  });

  it("свадьбы суперадмина (владелец платформы и RETENTION_EXEMPT_EMAILS) не архивируются и не теряют фото", async () => {
    process.env.RETENTION_EXEMPT_EMAILS = "helper@vmeste.test";
    const mine = await wedding("ret-admin", daysAgo(30), 2);
    const owner = await wedding("ret-owner", daysAgo(30), 1);
    const planner = await wedding("ret-planner", daysAgo(30), 1);
    const link = async (eventId: string, email: string, role: "OWNER" | "PLANNER") => {
      const event = await testDb.event.findUniqueOrThrow({ where: { id: eventId } });
      const user = await testDb.user.upsert({ where: { email }, create: { email, name: email }, update: {} });
      await testDb.membership.create({ data: { orgId: event.orgId, userId: user.id, role } });
    };
    await link(mine.id, "helper@vmeste.test", "OWNER");
    await link(owner.id, "AkbarChik0071@gmail.com", "OWNER");
    // Админ лишь помогает чужой паре — её сроки действуют как обычно.
    await link(planner.id, "helper@vmeste.test", "PLANNER");

    await runRetention(NOW);

    expect(await status(mine.id)).toBe("PUBLISHED");
    expect(await photoCount(mine.id)).toBe(2);
    expect(await getObject(mine.keys[0])).not.toBeNull();
    expect(await status(owner.id)).toBe("PUBLISHED");
    expect(await photoCount(owner.id)).toBe(1);
    expect(await status(planner.id)).toBe("ARCHIVED");
    expect(await photoCount(planner.id)).toBe(0);
  });

  it("гости и ответы остаются после удаления фото", async () => {
    const old = await wedding("ret-guests", daysAgo(16), 1);
    const event = await testDb.event.findUniqueOrThrow({ where: { id: old.id } });
    await testDb.guest.create({
      data: { orgId: event.orgId, eventId: event.id, displayName: "Анна", searchKey: "анна", linkToken: `t${Date.now()}`, rsvpStatus: "ACCEPTED" },
    });
    await runRetention(NOW);
    expect(await testDb.guest.count({ where: { eventId: old.id } })).toBe(1);
    expect(await photoCount(old.id)).toBe(0);
  });
});
