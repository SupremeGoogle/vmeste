/**
 * Розыгрыш и пожелания.
 *
 * Главная проверка — честность розыгрыша: тот же seed и тот же список
 * дают того же победителя, участники фиксируются до розыгрыша, и попадают
 * в него только те, кто действительно загрузил одобренное фото.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import {
  createRaffle, drawWinner, eligibleGuests, fixEntries, getRaffle, pickWinner, resetDraw,
} from "@/server/services/raffle";
import { createWish, countWishes, listWishes, moderateWish } from "@/server/services/wishes";
import { normalizeName } from "@/lib/name-normalize";
import type { EventContext } from "@/server/context";

type World = { orgId: string; eventId: string; ctx: EventContext; guestIds: string[] };

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: code,
      eventDate: new Date("2026-09-12"),
    },
  });

  const guestIds: string[] = [];
  for (const name of ["Анна Петрова", "Борис Смирнов", "Вера Иванова", "Глеб Орлов"]) {
    const guest = await testDb.guest.create({
      data: {
        orgId: org.id, eventId: event.id, displayName: name,
        searchKey: normalizeName(name),
        linkToken: randomBytes(16).toString("base64url"),
      },
    });
    guestIds.push(guest.id);
  }

  return {
    orgId: org.id,
    eventId: event.id,
    guestIds,
    ctx: { kind: "org", userId: "u1", orgId: org.id, role: "OWNER", eventId: event.id },
  };
}

async function givePhoto(world: World, guestId: string, status: "APPROVED" | "PENDING") {
  await testDb.photo.create({
    data: {
      orgId: world.orgId, eventId: world.eventId, guestId,
      storageKey: `events/${world.eventId}/photos/${randomBytes(6).toString("hex")}`,
      thumbKey: `events/${world.eventId}/thumbs/${randomBytes(6).toString("hex")}`,
      width: 10, height: 10, bytes: 100, status,
    },
  });
}

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("raffle-a", "RAFFAA");
  b = await makeWorld("raffle-b", "RAFFBB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("выбор победителя", () => {
  const entries = [
    { guestId: "g1", label: "Анна" },
    { guestId: "g2", label: "Борис" },
    { guestId: "g3", label: "Вера" },
  ];

  it("с тем же seed даёт того же победителя", () => {
    const first = pickWinner(entries, "деднолог");
    const second = pickWinner(entries, "деднолог");
    expect(first).toEqual(second);
  });

  it("не зависит от порядка участников в списке", () => {
    const straight = pickWinner(entries, "seed-1");
    const reversed = pickWinner([...entries].reverse(), "seed-1");
    expect(straight).toEqual(reversed);
  });

  it("с другим seed выбирает по-другому хотя бы иногда", () => {
    const winners = new Set(
      Array.from({ length: 20 }, (_, i) => pickWinner(entries, `seed-${i}`)?.guestId),
    );
    expect(winners.size).toBeGreaterThan(1);
  });

  it("на пустом списке возвращает null, а не бросает", () => {
    expect(pickWinner([], "seed")).toBeNull();
  });
});

describe("участники", () => {
  it("это только гости с одобренным фото", async () => {
    await givePhoto(a, a.guestIds[0], "APPROVED");
    await givePhoto(a, a.guestIds[1], "PENDING");

    const eligible = await eligibleGuests(a.eventId);
    expect(eligible.map((entry) => entry.guestId)).toEqual([a.guestIds[0]]);
  });

  it("гости чужого мероприятия не попадают", async () => {
    await givePhoto(b, b.guestIds[0], "APPROVED");
    expect(await eligibleGuests(a.eventId)).toHaveLength(0);
  });

  it("фиксируются строками и повторная фиксация добавляет новых", async () => {
    await givePhoto(a, a.guestIds[0], "APPROVED");
    const raffle = await createRaffle(a.ctx, "Букет");

    const first = await fixEntries(a.ctx, raffle.id);
    expect(first).toMatchObject({ ok: true, added: 1, total: 1 });

    await givePhoto(a, a.guestIds[1], "APPROVED");
    const second = await fixEntries(a.ctx, raffle.id);
    expect(second).toMatchObject({ ok: true, added: 1, total: 2 });
  });

  it("после розыгрыша список закрыт", async () => {
    await givePhoto(a, a.guestIds[0], "APPROVED");
    const raffle = await createRaffle(a.ctx, "Букет");
    await fixEntries(a.ctx, raffle.id);
    await drawWinner(a.ctx, raffle.id);

    await givePhoto(a, a.guestIds[1], "APPROVED");
    expect(await fixEntries(a.ctx, raffle.id)).toMatchObject({ ok: false, reason: "drawn" });
  });
});

describe("проведение розыгрыша", () => {
  it("сохраняет seed и победителя, повтор с тем же seed совпадает", async () => {
    for (const guestId of a.guestIds) await givePhoto(a, guestId, "APPROVED");
    const raffle = await createRaffle(a.ctx, "Букет");
    await fixEntries(a.ctx, raffle.id);

    const drawn = await drawWinner(a.ctx, raffle.id);
    expect(drawn.ok).toBe(true);
    if (!drawn.ok) return;

    const stored = await getRaffle(a.ctx, raffle.id);
    expect(stored?.winnerLabel).toBe(drawn.winner.label);
    expect(stored?.seed).toBe(drawn.seed);

    // Повторяем «при всех»: отменяем результат и крутим с тем же seed.
    await resetDraw(a.ctx, raffle.id);
    const again = await drawWinner(a.ctx, raffle.id, drawn.seed);
    expect(again.ok && again.winner.guestId).toBe(drawn.winner.guestId);
  });

  it("не разыгрывает дважды", async () => {
    await givePhoto(a, a.guestIds[0], "APPROVED");
    const raffle = await createRaffle(a.ctx, "Букет");
    await fixEntries(a.ctx, raffle.id);
    await drawWinner(a.ctx, raffle.id);

    expect(await drawWinner(a.ctx, raffle.id)).toMatchObject({ ok: false, reason: "drawn" });
  });

  it("без участников отказывается, а не выбирает пустоту", async () => {
    const raffle = await createRaffle(a.ctx, "Букет");
    expect(await drawWinner(a.ctx, raffle.id)).toMatchObject({ ok: false, reason: "empty" });
  });

  it("не дотягивается до розыгрыша чужого мероприятия", async () => {
    const foreign = await createRaffle(b.ctx, "Чужой");
    expect(await drawWinner(a.ctx, foreign.id)).toMatchObject({ ok: false, reason: "gone" });
    expect(await fixEntries(a.ctx, foreign.id)).toMatchObject({ ok: false, reason: "gone" });
    expect(await resetDraw(a.ctx, foreign.id)).toBe(false);
    expect(await getRaffle(a.ctx, foreign.id)).toBeNull();
  });

  it("отмена сохраняет seed — «перекрутить втихую» не выйдет", async () => {
    await givePhoto(a, a.guestIds[0], "APPROVED");
    const raffle = await createRaffle(a.ctx, "Букет");
    await fixEntries(a.ctx, raffle.id);
    const drawn = await drawWinner(a.ctx, raffle.id);
    await resetDraw(a.ctx, raffle.id);

    const stored = await getRaffle(a.ctx, raffle.id);
    expect(stored?.seed).toBe(drawn.ok ? drawn.seed : null);
    expect(stored?.drawnAt).toBeNull();
  });
});

describe("пожелания", () => {
  const guest = (world: World, index = 0) => ({
    orgId: world.orgId,
    eventId: world.eventId,
    guestId: world.guestIds[index],
  });

  it("принимаются и ждут модерации", async () => {
    const result = await createWish(guest(a), {
      authorName: "Аня",
      text: "Совет да любовь!",
    });
    expect(result.ok).toBe(true);

    const wishes = await listWishes(a.eventId);
    expect(wishes).toHaveLength(1);
    expect(wishes[0].status).toBe("PENDING");
  });

  it("пустое и слишком короткое не принимаются", async () => {
    expect(await createWish(guest(a), { authorName: "", text: "Совет" })).toMatchObject({
      ok: false, reason: "invalid",
    });
    expect(await createWish(guest(a), { authorName: "Аня", text: "ок" })).toMatchObject({
      ok: false, reason: "invalid",
    });
  });

  it("больше трёх от одного гостя не принимаем", async () => {
    for (let i = 0; i < 3; i++) {
      await createWish(guest(a), { authorName: "Аня", text: `Пожелание номер ${i}` });
    }
    expect(
      await createWish(guest(a), { authorName: "Аня", text: "И ещё одно" }),
    ).toMatchObject({ ok: false, reason: "limit" });
  });

  it("отклонённое освобождает место", async () => {
    const first = await createWish(guest(a), { authorName: "Аня", text: "Первое пожелание" });
    for (let i = 0; i < 2; i++) {
      await createWish(guest(a), { authorName: "Аня", text: `Ещё пожелание ${i}` });
    }
    if (!first.ok) throw new Error("не создалось");

    await moderateWish({ ...guest(a), userId: "u1" }, first.wishId, "REJECTED");
    expect(await createWish(guest(a), { authorName: "Аня", text: "Новое пожелание" })).toMatchObject(
      { ok: true },
    );
  });

  it("выключенный приём отвергает", async () => {
    await testDb.event.update({ where: { id: a.eventId }, data: { wishesEnabled: false } });
    expect(
      await createWish(guest(a), { authorName: "Аня", text: "Совет да любовь" }),
    ).toMatchObject({ ok: false, reason: "disabled" });
  });

  it("модерация не дотягивается до чужого мероприятия", async () => {
    const foreign = await createWish(guest(b), { authorName: "Лида", text: "Горько!" });
    if (!foreign.ok) throw new Error("не создалось");

    expect(
      await moderateWish({ orgId: a.orgId, eventId: a.eventId, userId: "u1" }, foreign.wishId, "APPROVED"),
    ).toBe(false);

    const counts = await countWishes(b.eventId);
    expect(counts.pending).toBe(1);
    expect(counts.approved).toBe(0);
  });
});
