/**
 * Вход по QR без списка и подарки без брони.
 *
 *  — по умолчанию на свадьбу пускают только по списку: «меня нет в
 *    списке» отказывает, пока организатор не откроет вход;
 *  — открытый вход заводит гостя «добавился сам», а второй вход с того
 *    же телефона под тем же именем двойника не плодит;
 *  — подарок без брони забронировать нельзя даже прямым запросом,
 *    а уже сделанную бронь гость снять может.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
}));

const { POST: enter } = await import("@/app/api/e/[shortCode]/enter/route");
const { reserveGift } = await import("@/server/services/gifts");
const { resetRateLimits } = await import("@/server/rate-limit");

let ip = 0;
async function send(code: string, name: string) {
  ip += 1;
  const response = await enter(
    new Request(`http://localhost/api/e/${code}/enter`, {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${ip}` },
    }),
    { params: Promise.resolve({ shortCode: code }) },
  );
  return { status: response.status, body: await response.json() as { ok: boolean; message?: string } };
}

async function makeEvent(opts: { qrEntryOpen?: boolean } = {}) {
  const slug = `qr-${Math.random().toString(36).slice(2, 8)}`;
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  return testDb.event.create({
    data: {
      orgId: org.id, title: "Свадьба", slug, shortCode: slug.slice(3).toUpperCase(), status: "PUBLISHED",
      eventDate: new Date(Date.now() + 24 * 3600 * 1000), giftsEnabled: true, qrEntryOpen: opts.qrEntryOpen ?? false,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  jar.clear();
  resetRateLimits();
});
afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("вход по QR без списка", () => {
  it("по умолчанию закрыт: гость не заводится", async () => {
    const event = await makeEvent();
    expect(event.qrEntryOpen).toBe(false);
    const result = await send(event.shortCode, "Ольга Смирнова");
    expect(result.status).toBe(403);
    expect(await testDb.guest.count({ where: { eventId: event.id } })).toBe(0);
  });

  it("открытый вход заводит гостя «добавился сам» и не плодит двойника", async () => {
    const event = await makeEvent({ qrEntryOpen: true });
    expect((await send(event.shortCode, "Ольга Смирнова")).body.ok).toBe(true);
    // Тот же телефон, то же имя (уменьшительное) — тот же гость.
    expect((await send(event.shortCode, "Оля")).body.ok).toBe(true);
    const guests = await testDb.guest.findMany({ where: { eventId: event.id } });
    expect(guests).toHaveLength(1);
    expect(guests[0]).toMatchObject({ displayName: "Ольга Смирнова", selfRegistered: true, rsvpStatus: "ACCEPTED" });
  });

  it("ссылки вместо имени не пускает", async () => {
    const event = await makeEvent({ qrEntryOpen: true });
    const result = await send(event.shortCode, "https://spam.example");
    expect(result.body.ok).toBe(false);
    expect(await testDb.guest.count({ where: { eventId: event.id } })).toBe(0);
  });
});

describe("подарок без брони", () => {
  it("забронировать нельзя, а снять уже сделанную бронь — можно", async () => {
    const event = await makeEvent();
    const guest = await testDb.guest.create({
      data: { orgId: event.orgId, eventId: event.id, displayName: "Анна", searchKey: "анна", linkToken: `t-${event.id}` },
    });
    const identity = { orgId: event.orgId, eventId: event.id, guestId: guest.id, displayName: "Анна", eventTitle: "Свадьба", photosEnabled: true, wishesEnabled: true };
    const idea = await testDb.gift.create({ data: { orgId: event.orgId, eventId: event.id, title: "Цветы", reservable: false } });
    const normal = await testDb.gift.create({ data: { orgId: event.orgId, eventId: event.id, title: "Кофемашина" } });
    expect(normal.reservable).toBe(true);

    expect((await reserveGift(identity, idea.id, false)).ok).toBe(false);
    expect(await testDb.giftReservation.count({ where: { giftId: idea.id } })).toBe(0);
    expect((await reserveGift(identity, normal.id, false)).ok).toBe(true);

    // Бронь выключили после выбора — гость всё равно может её снять.
    await testDb.gift.update({ where: { id: normal.id }, data: { reservable: false } });
    expect((await reserveGift(identity, normal.id, true)).ok).toBe(true);
  });
});
