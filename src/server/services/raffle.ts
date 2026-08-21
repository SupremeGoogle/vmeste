/**
 * Розыгрыш среди гостей.
 *
 * Главное требование — **доказуемая честность**, а не случайность как
 * таковая. Ведущий запускает розыгрыш при полном зале, и вопрос «а как
 * выбрали?» звучит вслух. Поэтому:
 *
 *   — участники фиксируются ДО розыгрыша отдельными строками
 *     (`RaffleEntry`): список нельзя молча дополнить после того, как
 *     результат не понравился;
 *   — выбор детерминированный: победитель — это функция от списка
 *     участников и сохранённого `seed`. Повторный запуск с тем же seed
 *     даёт того же человека, и это можно показать на экране;
 *   — сам выбор считается хешем, а не `Math.random()`: hash(seed + id)
 *     проверяется вручную кем угодно, у кого есть список участников.
 *
 * Кто участвует: гости, у которых есть хотя бы одна одобренная
 * фотография. Розыгрыш — награда за участие, а не лотерея по списку
 * приглашённых.
 */
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import { bus } from "@/server/events/bus";

export type Entry = { guestId: string; label: string };

/** Seed печатается на экране и в отчёте: короткий, но неугадываемый заранее. */
export function generateSeed(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Победитель как чистая функция. Сортируем участников по hash(seed:guestId)
 * и берём первого — это устойчивый порядок, не зависящий ни от порядка
 * строк в базе, ни от языка, ни от версии рантайма.
 */
export function pickWinner(entries: Entry[], seed: string): Entry | null {
  if (entries.length === 0) return null;

  const ranked = entries
    .map((entry) => ({
      entry,
      rank: createHash("sha256").update(`${seed}:${entry.guestId}`).digest("hex"),
    }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));

  return ranked[0].entry;
}

/** Кандидаты на участие: гости с хотя бы одним одобренным фото. */
export async function eligibleGuests(eventId: string): Promise<Entry[]> {
  const guests = await db.guest.findMany({
    where: {
      eventId,
      archivedAt: null,
      photos: { some: { status: "APPROVED" } },
    },
    orderBy: { searchKey: "asc" },
    select: { id: true, displayName: true },
  });
  return guests.map((guest) => ({ guestId: guest.id, label: guest.displayName }));
}

export async function createRaffle(ctx: EventContext, title: string) {
  return db.raffle.create({
    data: {
      orgId: ctx.orgId,
      eventId: ctx.eventId,
      title: title.trim().slice(0, 60) || "Розыгрыш",
    },
    select: { id: true, title: true },
  });
}

export async function listRaffles(ctx: EventContext) {
  return db.raffle.findMany({
    where: { eventId: ctx.eventId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, seed: true, drawnAt: true, winnerLabel: true,
      _count: { select: { entries: true } },
    },
  });
}

export async function getRaffle(ctx: EventContext, raffleId: string) {
  return db.raffle.findFirst({
    where: { id: raffleId, eventId: ctx.eventId },
    select: {
      id: true, title: true, seed: true, drawnAt: true, winnerLabel: true,
      winnerGuestId: true,
      entries: { select: { guestId: true, label: true }, orderBy: { label: "asc" } },
    },
  });
}

export type FixResult =
  | { ok: true; added: number; total: number }
  | { ok: false; reason: "gone" | "drawn"; message: string };

/**
 * Зафиксировать участников.
 *
 * Повторный вызов добавляет новых (кто-то загрузил фото, пока ведущий
 * рассказывал правила) и никого не убирает: список только растёт, и это
 * тоже часть честности — исчезнувший из списка человек выглядит как обман.
 * После розыгрыша список закрыт совсем.
 */
export async function fixEntries(ctx: EventContext, raffleId: string): Promise<FixResult> {
  const raffle = await db.raffle.findFirst({
    where: { id: raffleId, eventId: ctx.eventId },
    select: { id: true, drawnAt: true },
  });
  if (!raffle) return { ok: false, reason: "gone", message: "Розыгрыш не найден" };
  if (raffle.drawnAt) {
    return { ok: false, reason: "drawn", message: "Розыгрыш уже состоялся" };
  }

  const [candidates, existing] = await Promise.all([
    eligibleGuests(ctx.eventId),
    db.raffleEntry.findMany({
      where: { eventId: ctx.eventId, raffleId },
      select: { guestId: true },
    }),
  ]);

  const known = new Set(existing.map((entry) => entry.guestId));
  const fresh = candidates.filter((candidate) => !known.has(candidate.guestId));

  if (fresh.length > 0) {
    await db.raffleEntry.createMany({
      data: fresh.map((entry) => ({
        orgId: ctx.orgId,
        eventId: ctx.eventId,
        raffleId,
        guestId: entry.guestId,
        label: entry.label,
      })),
      skipDuplicates: true,
    });
  }

  await bus.publish(ctx.eventId, "raffle", raffleId);
  return { ok: true, added: fresh.length, total: known.size + fresh.length };
}

export type DrawResult =
  | { ok: true; winner: Entry; seed: string }
  | { ok: false; reason: "gone" | "empty" | "drawn"; message: string };

/**
 * Провести розыгрыш.
 *
 * @param seed необязателен: пустой — сгенерируем и сохраним. Заданный
 *        нужен, чтобы повторить прошлый розыгрыш и показать, что тот же
 *        seed даёт того же победителя.
 */
export async function drawWinner(
  ctx: EventContext,
  raffleId: string,
  seed?: string,
): Promise<DrawResult> {
  const raffle = await db.raffle.findFirst({
    where: { id: raffleId, eventId: ctx.eventId },
    select: {
      id: true, drawnAt: true,
      entries: { select: { guestId: true, label: true } },
    },
  });
  if (!raffle) return { ok: false, reason: "gone", message: "Розыгрыш не найден" };
  if (raffle.drawnAt) return { ok: false, reason: "drawn", message: "Розыгрыш уже состоялся" };
  if (raffle.entries.length === 0) {
    return {
      ok: false,
      reason: "empty",
      message: "Некого разыгрывать: сначала зафиксируйте участников",
    };
  }

  const usedSeed = seed?.trim() || generateSeed();
  const winner = pickWinner(raffle.entries, usedSeed)!;

  await db.raffle.updateMany({
    where: { id: raffleId, eventId: ctx.eventId },
    data: {
      seed: usedSeed,
      drawnAt: new Date(),
      winnerGuestId: winner.guestId,
      winnerLabel: winner.label,
    },
  });

  await bus.publish(ctx.eventId, "raffle", raffleId);
  return { ok: true, winner, seed: usedSeed };
}

/**
 * Отменить результат, сохранив участников и seed.
 *
 * Нужно ровно для одного случая: победитель уже уехал домой. Отмена
 * видна — `drawnAt` снимается, а seed остаётся, так что «перекрутить
 * втихую до нужного имени» не выйдет: тот же seed даёт того же человека.
 */
export async function resetDraw(ctx: EventContext, raffleId: string) {
  const updated = await db.raffle.updateMany({
    where: { id: raffleId, eventId: ctx.eventId },
    data: { drawnAt: null, winnerGuestId: null, winnerLabel: null },
  });
  if (updated.count === 0) return false;
  await bus.publish(ctx.eventId, "raffle", raffleId);
  return true;
}
