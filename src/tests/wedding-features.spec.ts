import "dotenv/config";
import { randomBytes } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { testDb } from "./helpers/db";
import { saveEnvelope, saveGift, reserveGift } from "@/server/services/gifts";
import { guestWishlistSection } from "@/server/guest-html/guest-feature-links";
import { djPlaylist } from "@/server/services/playlist";
import { albumFilter } from "@/server/services/album";
import { changeTeamLink, runDayStep, saveDayStep, teamPlanAccess } from "@/server/services/day-plan";
import { createRaffle, fixEntries, drawWinner } from "@/server/services/raffle";
import { screenSnapshot } from "@/server/services/screen";
import { archiveGuest } from "@/server/repositories/guests";
import type { EventContext } from "@/server/context";
import type { GuestIdentity } from "@/server/guest-access/identify";

type World = { ctx: EventContext; guests: GuestIdentity[]; tableId: string };
const orgIds: string[] = [];
async function world(): Promise<World> {
  const tag = randomBytes(8).toString("hex");
  const org = await testDb.organization.create({ data: { name: "Проверка свадебных функций", slug: `feature-test-${tag}` } });
  orgIds.push(org.id);
  const event = await testDb.event.create({ data: { orgId: org.id, title: "Тестовая свадьба", slug: tag, shortCode: tag, eventDate: new Date("2026-09-30T16:00Z"), timezone: "Europe/Kaliningrad", giftsEnabled: true, status: "PUBLISHED" } });
  const guests: GuestIdentity[] = [];
  for (const name of ["Анна", "Борис", "Вера"]) {
    const guest = await testDb.guest.create({ data: { orgId: org.id, eventId: event.id, displayName: name, searchKey: name.toLowerCase(), linkToken: randomBytes(16).toString("hex") } });
    guests.push({ orgId: org.id, eventId: event.id, guestId: guest.id, displayName: name, eventTitle: event.title, photosEnabled: true, wishesEnabled: true });
  }
  const table = await testDb.seatTable.create({ data: { orgId: org.id, eventId: event.id, label: "Стол 1", x: 100, y: 100, seats: { create: guests.slice(0, 2).map((guest, index) => ({ orgId: org.id, guestId: guest.guestId, index })) } } });
  for (const [index, guest] of guests.entries()) {
    await testDb.photo.create({ data: { orgId: org.id, eventId: event.id, guestId: guest.guestId, storageKey: `test/${tag}/${index}`, thumbKey: `test/${tag}/${index}-thumb`, width: 10, height: 10, bytes: 100, status: "APPROVED" } });
  }
  await testDb.photo.create({ data: { orgId: org.id, eventId: event.id, guestId: guests[0].guestId, storageKey: `test/${tag}/pending`, thumbKey: `test/${tag}/pending-thumb`, width: 10, height: 10, bytes: 100, status: "PENDING" } });
  return { ctx: { kind: "org", userId: "test", orgId: org.id, eventId: event.id, role: "OWNER" }, guests, tableId: table.id };
}
let a: World;
let b: World;
// Только отдельная тестовая база. Убираем лишь созданные этим файлом организации.
describe.skipIf(!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL)("свадебные функции в базе", () => {
  beforeAll(async () => { a = await world(); b = await world(); });
  afterAll(async () => { await testDb.organization.deleteMany({ where: { id: { in: orgIds } } }); await testDb.$disconnect(); });
  async function gift() {
    // Гостю положен один подарок: брони прошлых проверок не должны мешать.
    await testDb.giftReservation.deleteMany({ where: { eventId: a.ctx.eventId } });
    await saveGift(a.ctx, "", { title: randomBytes(4).toString("hex"), description: "", url: "" });
    return (await testDb.gift.findFirstOrThrow({ where: { eventId: a.ctx.eventId }, orderBy: { createdAt: "desc" } })).id;
  }
  async function step(action = "NONE", raffleId = "") {
    const title = randomBytes(4).toString("hex");
    const saved = await saveDayStep(a.ctx, "", { title, responsible: "Ведущий", notes: "", localTime: "2026-09-30T18:30", reminderMinutes: 10, action, raffleId });
    expect(saved.ok).toBe(true);
    return await testDb.dayStep.findFirstOrThrow({ where: { eventId: a.ctx.eventId, title } });
  }
  it("ровно один из двух одновременных гостей получает подарок", async () => {
    const id = await gift();
    const results = await Promise.all([reserveGift(a.guests[0], id, false), reserveGift(a.guests[1], id, false)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await testDb.giftReservation.count({ where: { eventId: a.ctx.eventId, giftId: id } })).toBe(1);
  });
  it("чужой гость не может снять бронь или выбрать подарок другой свадьбы", async () => {
    const id = await gift();
    expect((await reserveGift(a.guests[0], id, false)).ok).toBe(true);
    expect((await reserveGift(a.guests[1], id, true)).ok).toBe(false);
    expect((await reserveGift(b.guests[0], id, false)).ok).toBe(false);
    expect((await saveGift(b.ctx, id, { title: "Подмена", description: "", url: "" })).ok).toBe(false);
    expect((await reserveGift(a.guests[0], id, true)).ok).toBe(true);
    expect((await reserveGift(a.guests[1], id, false)).ok).toBe(true);
  });
  it("подарки закрываются настройкой, реквизиты проходят проверку", async () => {
    const id = await gift();
    expect((await saveEnvelope(a.ctx, { enabled: false, label: "На мечту", details: "Банк", url: "https://example.com/pay" })).ok).toBe(true);
    expect((await reserveGift(a.guests[0], id, false)).ok).toBe(false);
    expect((await saveEnvelope(a.ctx, { enabled: true, label: "На мечту", details: "Банк", url: "javascript:alert(1)" })).ok).toBe(false);
    await saveEnvelope(a.ctx, { enabled: true, label: "На мечту", details: "Банк", url: "" });
  });
  it("виш-лист: картинка только своего мероприятия, раздел внизу приглашения", async () => {
    const own = `/api/asset/${a.ctx.eventId}/asset1`;
    expect((await saveGift(a.ctx, "", { title: "Плед", description: "", url: "", imageUrl: own })).ok).toBe(true);
    expect((await saveGift(a.ctx, "", { title: "Чужое", description: "", url: "", imageUrl: `/api/asset/${b.ctx.eventId}/asset1` })).ok).toBe(false);
    expect((await saveGift(a.ctx, "", { title: "Внешнее", description: "", url: "", imageUrl: "https://evil.example/x.png" })).ok).toBe(false);

    const section = await guestWishlistSection(a.ctx.eventId, "/i/slug/token/guest");
    expect(section).toContain("Наш виш-лист");
    expect(section).toContain(own);
    expect(section).toContain("/i/slug/token/guest?section=gifts");

    await saveEnvelope(a.ctx, { enabled: false, label: "На мечту", details: "", url: "" });
    expect(await guestWishlistSection(a.ctx.eventId)).toBe("");
    await saveEnvelope(a.ctx, { enabled: true, label: "На мечту", details: "Банк", url: "" });
  });
  it("один гость берёт не больше одного подарка, даже нажимая одновременно", async () => {
    const first = await gift();
    const second = await saveGift(a.ctx, "", { title: "Второй", description: "", url: "" }).then(async () =>
      (await testDb.gift.findFirstOrThrow({ where: { eventId: a.ctx.eventId, title: "Второй" } })).id);
    const results = await Promise.all([reserveGift(a.guests[2], first, false), reserveGift(a.guests[2], second, false)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)?.message).toMatch(/Вы уже выбрали/);
    expect(await testDb.giftReservation.count({ where: { eventId: a.ctx.eventId, guestId: a.guests[2].guestId } })).toBe(1);
  });
  it("составные ключи блокируют бронь с гостем другой свадьбы", async () => {
    const id = await gift();
    await expect(testDb.giftReservation.create({ data: { orgId: a.ctx.orgId, eventId: a.ctx.eventId, giftId: id, guestId: b.guests[0].guestId } })).rejects.toMatchObject({ code: "P2003" });
  });
  it("подборки альбома содержат только одобренные снимки нужных гостей", async () => {
    const query = async (scope: "all" | "mine" | "table", guest = a.guests[0]) => await testDb.photo.findMany({ where: await albumFilter(guest.eventId, guest.guestId, scope), select: { guestId: true } });
    expect(await query("all")).toHaveLength(3);
    expect(await query("mine")).toEqual([{ guestId: a.guests[0].guestId }]);
    expect((await query("table")).map((p) => p.guestId).sort()).toEqual(a.guests.slice(0, 2).map((g) => g.guestId).sort());
    expect(await query("table", a.guests[2])).toHaveLength(0);
    expect((await query("all", b.guests[0])).every((p) => b.guests.some((g) => g.guestId === p.guestId))).toBe(true);
  });
  it("диджей получает песни из анкеты одним списком, только своего мероприятия", async () => {
    await testDb.guest.update({ where: { id: b.guests[1].guestId }, data: { musicWish: "Queen — Don't Stop Me Now", rsvpAt: new Date("2020-01-01") } });
    const list = await djPlaylist(b.ctx.eventId, b.ctx.orgId);
    expect(list.map((row) => [row.song, row.who, row.source])).toEqual([["Queen — Don't Stop Me Now", "Борис", "Анкета"]]);
    expect(await djPlaylist(b.ctx.eventId, a.ctx.orgId)).toEqual([]);
  });
  it("командная ссылка отзывается, перевыпускается и не работает в архиве", async () => {
    await changeTeamLink(a.ctx, false);
    const first = (await testDb.event.findUniqueOrThrow({ where: { id: a.ctx.eventId } })).teamPlanToken!;
    expect((await teamPlanAccess(first))?.eventId).toBe(a.ctx.eventId);
    expect(await teamPlanAccess("guess")).toBeNull();
    await changeTeamLink(a.ctx, false);
    expect(await teamPlanAccess(first)).toBeNull();
    const second = (await testDb.event.findUniqueOrThrow({ where: { id: a.ctx.eventId } })).teamPlanToken!;
    await testDb.event.update({ where: { id: a.ctx.eventId }, data: { status: "ARCHIVED" } });
    expect(await teamPlanAccess(second)).toBeNull();
    await testDb.event.update({ where: { id: a.ctx.eventId }, data: { status: "PUBLISHED" } });
    await changeTeamLink(a.ctx, true);
    expect(await teamPlanAccess(second)).toBeNull();
  });
  it("два одновременных запуска выполняют этап лишь один раз", async () => {
    const item = await step("SCREEN_PHOTOS");
    expect(item.startsAt.toISOString()).toBe("2026-09-30T16:30:00.000Z");
    const results = await Promise.all([runDayStep(a.ctx, item.id), runDayStep(a.ctx, item.id)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await testDb.event.findUniqueOrThrow({ where: { id: a.ctx.eventId } })).screenMode).toBe("PHOTOS");
    expect((await testDb.dayStep.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("DONE");
    expect((await runDayStep(b.ctx, item.id)).ok).toBe(false);
  });
  it("не разрешает привязать чужой розыгрыш", async () => {
    const raffle = await createRaffle(b.ctx, "Чужой");
    expect((await saveDayStep(a.ctx, "", { title: "Розыгрыш", responsible: "", notes: "", localTime: "2026-09-30T18:30", reminderMinutes: 10, action: "RAFFLE", raffleId: raffle.id })).ok).toBe(false);
  });
  it("план показывает выбранный розыгрыш, даже если он создан раньше другого", async () => {
    const target = await createRaffle(a.ctx, "Нужный розыгрыш");
    await createRaffle(a.ctx, "Более новый розыгрыш");
    const item = await step("RAFFLE", target.id);
    expect((await runDayStep(a.ctx, item.id)).ok).toBe(true);
    const snap = await screenSnapshot({ eventId: a.ctx.eventId, orgId: a.ctx.orgId, eventTitle: "Тест", tokenId: "test" });
    expect(snap.mode).toBe("RAFFLE"); expect(snap.raffle?.id).toBe(target.id); expect(snap.raffle?.winnerLabel).toBeTruthy();
  });
  it("параллельные розыгрыши сохраняют одного победителя", async () => {
    const raffle = await createRaffle(a.ctx, "Одновременно"); await fixEntries(a.ctx, raffle.id);
    const results = await Promise.all([drawWinner(a.ctx, raffle.id, "seed-a"), drawWinner(a.ctx, raffle.id, "seed-b")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it("ошибка розыгрыша возвращает этап в ожидающие, повтор доступен", async () => {
    const raffle = await createRaffle(a.ctx, "Без участников");
    await testDb.photo.updateMany({ where: { eventId: a.ctx.eventId }, data: { status: "PENDING" } });
    const item = await step("RAFFLE", raffle.id);
    expect((await runDayStep(a.ctx, item.id)).ok).toBe(false);
    expect((await testDb.dayStep.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("PENDING");
  });
  it("повторно запускает этап после прерванного процесса", async () => {
    const item = await step();
    await testDb.dayStep.update({ where: { id: item.id }, data: { status: "RUNNING", runStartedAt: new Date(Date.now() - 180000) } });
    expect((await runDayStep(a.ctx, item.id)).ok).toBe(true);
  });
  it("архивирование гостя освобождает его подарок", async () => {
    const id = await gift(); await reserveGift(a.guests[0], id, false);
    await archiveGuest(a.ctx, a.guests[0].guestId);
    expect(await testDb.giftReservation.count({ where: { eventId: a.ctx.eventId, giftId: id } })).toBe(0);
  });
});
