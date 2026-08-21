/**
 * Пожелания молодожёнам.
 *
 * Проходят ту же модерацию, что и фотографии, и по той же причине: текст
 * попадает на стену зала, где его читают все, включая бабушку. Разница
 * одна — пожелание короткое, поэтому очередь листается не по одному,
 * а списком: модератор читает десяток строк одним взглядом.
 *
 * Имя автора берётся из его карточки гостя, но остаётся редактируемым
 * полем: подписывают пожелания по-разному — «Аня и Серёжа», «твоя сестра».
 */
import { z } from "zod";
import { db } from "@/server/db";
import { bus } from "@/server/events/bus";

export const wishInputSchema = z.object({
  authorName: z.string().trim().min(1, "нужно имя").max(80),
  // 500 символов — это ограничение колонки и заодно здравого смысла:
  // на экране в зале длинный текст всё равно не прочитать.
  text: z.string().trim().min(3, "напишите пару слов").max(500),
});

export type WishInput = z.infer<typeof wishInputSchema>;

export type WishResult =
  | { ok: true; wishId: string }
  | { ok: false; reason: "disabled" | "invalid" | "limit"; message: string };

/** Сколько пожеланий принимаем от одного гостя: три — уже щедро. */
const PER_GUEST_LIMIT = 3;

export async function createWish(
  guest: { orgId: string; eventId: string; guestId: string },
  raw: unknown,
): Promise<WishResult> {
  const parsed = wishInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: parsed.error.issues[0].message };
  }

  const event = await db.event.findFirst({
    where: { id: guest.eventId, orgId: guest.orgId },
    select: { wishesEnabled: true },
  });
  if (!event?.wishesEnabled) {
    return { ok: false, reason: "disabled", message: "Приём пожеланий закрыт" };
  }

  const mine = await db.wish.count({
    where: { eventId: guest.eventId, guestId: guest.guestId, status: { not: "REJECTED" } },
  });
  if (mine >= PER_GUEST_LIMIT) {
    return {
      ok: false,
      reason: "limit",
      message: `Больше ${PER_GUEST_LIMIT} пожеланий не принимаем — вы и так молодец`,
    };
  }

  const wish = await db.wish.create({
    data: {
      orgId: guest.orgId,
      eventId: guest.eventId,
      guestId: guest.guestId,
      authorName: parsed.data.authorName,
      text: parsed.data.text,
      status: "PENDING",
    },
    select: { id: true },
  });

  return { ok: true, wishId: wish.id };
}

export async function listGuestWishes(guest: { eventId: string; guestId: string }) {
  return db.wish.findMany({
    where: { eventId: guest.eventId, guestId: guest.guestId },
    orderBy: { createdAt: "desc" },
    select: { id: true, text: true, status: true, createdAt: true },
  });
}

export async function listWishes(eventId: string, status?: "PENDING" | "APPROVED" | "REJECTED") {
  return db.wish.findMany({
    where: { eventId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, authorName: true, text: true, status: true, createdAt: true,
      guest: { select: { displayName: true } },
    },
  });
}

export async function countWishes(eventId: string) {
  const rows = await db.wish.groupBy({
    by: ["status"],
    where: { eventId },
    _count: { _all: true },
  });
  const count = (status: string) => rows.find((row) => row.status === status)?._count._all ?? 0;
  return { pending: count("PENDING"), approved: count("APPROVED"), rejected: count("REJECTED") };
}

/** Решение модератора. Экран узнаёт о нём событием — как и по фотографиям. */
export async function moderateWish(
  ctx: { orgId: string; eventId: string; userId: string },
  wishId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
): Promise<boolean> {
  const updated = await db.wish.updateMany({
    where: { id: wishId, eventId: ctx.eventId },
    data: { status },
  });
  if (updated.count !== 1) return false;

  await bus.publish(ctx.eventId, "wish", wishId);
  return true;
}
