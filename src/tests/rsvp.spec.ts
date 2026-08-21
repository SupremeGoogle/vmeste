/**
 * Ответ гостя на приглашение.
 *
 * Проверяется то, из-за чего у организатора расходится список: повторный
 * ответ, спутник как настоящий гость, снятый спутник с занятым местом,
 * истёкший срок и попытки подставить чужое блюдо.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { submitRsvp, rsvpSummary, setRsvpManually } from "@/server/services/rsvp";
import { findGuestByLinkToken, markLinkOpened } from "@/server/repositories/guests";
import { normalizeName } from "@/lib/name-normalize";

type World = {
  orgId: string;
  eventId: string;
  guestToken: string;
  guestId: string;
  mealId: string;
  seatId: string;
};

async function makeWorld(slug: string, code: string, opts?: { deadline?: Date }): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: code,
      eventDate: new Date("2026-09-12"), rsvpDeadline: opts?.deadline ?? null,
      mealOptions: { create: [{ title: "Мясо", order: 0 }, { title: "Рыба", order: 1 }] },
    },
    include: { mealOptions: { orderBy: { order: "asc" } } },
  });

  const table = await testDb.seatTable.create({
    data: {
      orgId: org.id, eventId: event.id, label: "Стол 1", x: 300, y: 300, capacity: 4,
      seats: { create: Array.from({ length: 4 }, (_, index) => ({ orgId: org.id, index })) },
    },
    include: { seats: { orderBy: { index: "asc" } } },
  });

  const token = randomBytes(16).toString("base64url");
  const guest = await testDb.guest.create({
    data: {
      orgId: org.id, eventId: event.id, displayName: "Анна Петрова",
      searchKey: normalizeName("Анна Петрова"), linkToken: token, plusOneAllowed: true,
    },
  });

  return {
    orgId: org.id,
    eventId: event.id,
    guestToken: token,
    guestId: guest.id,
    mealId: event.mealOptions[0].id,
    seatId: table.seats[0].id,
  };
}

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("rsvp-a", "RSVPAA");
  b = await makeWorld("rsvp-b", "RSVPBB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("ответ гостя", () => {
  it("записывает согласие с блюдом и аллергией", async () => {
    const result = await submitRsvp(a.guestToken, {
      status: "ACCEPTED", mealOptionId: a.mealId, allergies: "орехи",
    });
    expect(result.ok).toBe(true);

    const guest = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    expect(guest.rsvpStatus).toBe("ACCEPTED");
    expect(guest.mealOptionId).toBe(a.mealId);
    expect(guest.allergies).toBe("орехи");
    expect(guest.rsvpAt).not.toBeNull();
  });

  it("повторный ответ меняет прежний, а не создаёт второй", async () => {
    await submitRsvp(a.guestToken, { status: "ACCEPTED", mealOptionId: a.mealId });
    await submitRsvp(a.guestToken, { status: "DECLINED" });

    const guests = await testDb.guest.findMany({ where: { eventId: a.eventId } });
    expect(guests).toHaveLength(1);
    expect(guests[0].rsvpStatus).toBe("DECLINED");
    // Отказался — блюдо на кухню заказывать не нужно.
    expect(guests[0].mealOptionId).toBeNull();
  });

  it("не принимает блюдо чужого мероприятия", async () => {
    const foreignMeal = await testDb.mealOption.findFirstOrThrow({
      where: { eventId: b.eventId },
    });
    const result = await submitRsvp(a.guestToken, {
      status: "ACCEPTED", mealOptionId: foreignMeal.id,
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("отказывает после истечения срока", async () => {
    const late = await makeWorld("rsvp-late", "RSVPLT", { deadline: new Date("2020-01-01") });
    const result = await submitRsvp(late.guestToken, { status: "ACCEPTED" });
    expect(result).toMatchObject({ ok: false, reason: "deadline" });
  });

  it("не находит гостя по чужому токену", async () => {
    const result = await submitRsvp("нет-такого-токена-совсем", { status: "ACCEPTED" });
    expect(result).toMatchObject({ ok: false, reason: "gone" });
  });

  it("отвергает статус, которого нет", async () => {
    const result = await submitRsvp(a.guestToken, { status: "МОЖЕТ БЫТЬ" });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("спутник (+1)", () => {
  it("становится настоящим гостем с ключом поиска и алиасами", async () => {
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });

    const plusOne = await testDb.guest.findFirstOrThrow({
      where: { eventId: a.eventId, parentGuestId: a.guestId },
      include: { aliases: true },
    });
    expect(plusOne.searchKey).toBe(normalizeName("Настя Иванова"));
    expect(plusOne.rsvpStatus).toBe("ACCEPTED");
    expect(plusOne.linkToken).not.toBe("");
    // Уменьшительное имя должно находиться на входе как полное.
    expect(plusOne.aliases.map((alias) => alias.alias)).toContain("анастасия иванова");
  });

  it("переименование спутника переписывает ключ поиска и алиасы", async () => {
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Мария Соколова" });

    const plusOnes = await testDb.guest.findMany({
      where: { eventId: a.eventId, parentGuestId: a.guestId, archivedAt: null },
      include: { aliases: true },
    });
    expect(plusOnes).toHaveLength(1);
    expect(plusOnes[0].displayName).toBe("Мария Соколова");
    expect(plusOnes[0].aliases.every((alias) => !alias.alias.includes("иванова"))).toBe(true);
  });

  it("снятый спутник уходит в архив и освобождает место за столом", async () => {
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });
    const plusOne = await testDb.guest.findFirstOrThrow({
      where: { eventId: a.eventId, parentGuestId: a.guestId },
    });
    await testDb.seat.update({ where: { id: a.seatId }, data: { guestId: plusOne.id } });

    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "" });

    const seat = await testDb.seat.findUniqueOrThrow({ where: { id: a.seatId } });
    expect(seat.guestId).toBeNull();
    const archived = await testDb.guest.findUniqueOrThrow({ where: { id: plusOne.id } });
    expect(archived.archivedAt).not.toBeNull();
  });

  it("отказ снимает и спутника: вдвоём не придут тем более", async () => {
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });
    await submitRsvp(a.guestToken, { status: "DECLINED", plusOneName: "Настя Иванова" });

    const active = await testDb.guest.count({
      where: { eventId: a.eventId, parentGuestId: a.guestId, archivedAt: null },
    });
    expect(active).toBe(0);
  });

  it("не создаётся, если организатор не разрешил гостю +1", async () => {
    await testDb.guest.update({ where: { id: a.guestId }, data: { plusOneAllowed: false } });
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });

    const count = await testDb.guest.count({
      where: { eventId: a.eventId, parentGuestId: a.guestId },
    });
    expect(count).toBe(0);
  });

  it("не создаётся, если +1 выключен на всём мероприятии", async () => {
    await testDb.event.update({ where: { id: a.eventId }, data: { allowPlusOne: false } });
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });

    const count = await testDb.guest.count({
      where: { eventId: a.eventId, parentGuestId: a.guestId },
    });
    expect(count).toBe(0);
  });

  it("спутник не приводит своего спутника", async () => {
    await submitRsvp(a.guestToken, { status: "ACCEPTED", plusOneName: "Настя Иванова" });
    const plusOne = await testDb.guest.findFirstOrThrow({
      where: { eventId: a.eventId, parentGuestId: a.guestId },
    });
    await testDb.guest.update({ where: { id: plusOne.id }, data: { plusOneAllowed: true } });

    await submitRsvp(plusOne.linkToken, { status: "ACCEPTED", plusOneName: "Кто-то Ещё" });

    const chained = await testDb.guest.count({
      where: { eventId: a.eventId, parentGuestId: plusOne.id },
    });
    expect(chained).toBe(0);
  });
});

describe("разрешение на спутника", () => {
  it("ставится и снимается по одному гостю", async () => {
    const { setPlusOneAllowed } = await import("@/server/repositories/guests");
    const ctx = { kind: "org" as const, userId: "u1", orgId: a.orgId, role: "OWNER" as const, eventId: a.eventId };

    expect(await setPlusOneAllowed(ctx, a.guestId, false)).toBe(true);
    let guest = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    expect(guest.plusOneAllowed).toBe(false);

    await setPlusOneAllowed(ctx, a.guestId, true);
    guest = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    expect(guest.plusOneAllowed).toBe(true);
  });

  it("не дотягивается до гостя чужого мероприятия", async () => {
    const { setPlusOneAllowed } = await import("@/server/repositories/guests");
    const ctx = { kind: "org" as const, userId: "u1", orgId: a.orgId, role: "OWNER" as const, eventId: a.eventId };
    expect(await setPlusOneAllowed(ctx, b.guestId, true)).toBe(false);
  });
});

describe("именная ссылка", () => {
  it("находит гостя вместе с мероприятием", async () => {
    const guest = await findGuestByLinkToken(a.guestToken);
    expect(guest?.id).toBe(a.guestId);
    expect(guest?.event.id).toBe(a.eventId);
  });

  it("архивированного гостя по ссылке не отдаёт", async () => {
    await testDb.guest.update({ where: { id: a.guestId }, data: { archivedAt: new Date() } });
    expect(await findGuestByLinkToken(a.guestToken)).toBeNull();
  });

  it("отметка об открытии ставится один раз", async () => {
    await markLinkOpened(a.eventId, a.guestId);
    const first = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    await markLinkOpened(a.eventId, a.guestId);
    const second = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    expect(second.linkOpenedAt?.getTime()).toBe(first.linkOpenedAt?.getTime());
  });
});

describe("сводка для организатора", () => {
  it("считает ответы, спутников и блюда своего мероприятия", async () => {
    await submitRsvp(a.guestToken, {
      status: "ACCEPTED", mealOptionId: a.mealId, plusOneName: "Настя Иванова",
    });
    await submitRsvp(b.guestToken, { status: "DECLINED" });

    const summary = await rsvpSummary(a.eventId);
    expect(summary.accepted).toBe(2); // гость и его спутник
    expect(summary.declined).toBe(0); // отказ соседнего мероприятия сюда не течёт
    expect(summary.plusOnes).toBe(1);
    expect(summary.meals.find((meal) => meal.title === "Мясо")?.count).toBe(1);
  });

  it("ручной ответ организатора пишется в журнал", async () => {
    const ctx = { orgId: a.orgId, eventId: a.eventId, userId: "u1" };
    expect(await setRsvpManually(ctx, a.guestId, "ACCEPTED")).toBe(true);

    const log = await testDb.guestActionLog.findFirst({
      where: { eventId: a.eventId, action: "rsvp_manual" },
    });
    expect(log?.guestId).toBe(a.guestId);
  });

  it("ручной ответ не дотягивается до гостя чужого мероприятия", async () => {
    const ctx = { orgId: a.orgId, eventId: a.eventId, userId: "u1" };
    expect(await setRsvpManually(ctx, b.guestId, "ACCEPTED")).toBe(false);

    const untouched = await testDb.guest.findUniqueOrThrow({ where: { id: b.guestId } });
    expect(untouched.rsvpStatus).toBe("PENDING");
  });
});
