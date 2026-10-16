/**
 * Кабинет без регистрации.
 *
 * Человек с главной сразу попадает в кабинет и делает свадьбу: гостей,
 * рассадку, приглашение. Регистрация нужна только там, где появляются
 * деньги и чужие люди, — при публикации (server/billing.ts).
 *
 * Анонимный кабинет — обычные пользователь, организация и сессия, только
 * с `isAnonymous` и почтой-заглушкой на домене .invalid (RFC 2606: такой
 * домен не существует, письмо туда не уйдёт, войти этой почтой нельзя).
 * Так весь остальной код работает с ним без исключений.
 *
 * Когда человек регистрируется или входит в свой кабинет, всё нажитое
 * переезжает туда (`adoptGuestWorkspace`), а анонимная строка удаляется.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";

export const GUEST_EMAIL_DOMAIN = "guest.invalid";

export function isGuestEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

/** Заводит анонимный кабинет. Возвращает id пользователя. */
export async function createGuestWorkspace(lang: "ru" | "en" = "ru"): Promise<string> {
  const tag = randomBytes(12).toString("hex");
  const org = await db.organization.create({
    data: {
      name: lang === "en" ? "My wedding" : "Моя свадьба",
      slug: `guest-${tag}`,
      members: {
        create: {
          role: "OWNER",
          user: {
            create: {
              email: `guest-${tag}@${GUEST_EMAIL_DOMAIN}`,
              name: lang === "en" ? "Guest" : "Гость",
              isAnonymous: true,
            },
          },
        },
      },
    },
    include: { members: true },
  });
  return org.members[0].userId;
}

/**
 * Переносит мероприятия анонимного кабинета в кабинет `targetUserId` и
 * удаляет анонимный. Ничего не делает, если `anonUserId` не анонимный
 * (защита от ошибки вызывающего: настоящий кабинет так не удалить).
 *
 * Строки мероприятия ссылаются на него составным ключом (orgId, eventId)
 * с ON UPDATE CASCADE, так что смена orgId у мероприятия переносит их
 * следом. Остальные таблицы с orgId дочищаем явно — на случай строки без
 * такого ключа.
 */
export async function adoptGuestWorkspace(anonUserId: string, targetUserId: string): Promise<number> {
  if (anonUserId === targetUserId) return 0;
  const [anon, target] = await Promise.all([
    db.user.findUnique({
      where: { id: anonUserId },
      select: { isAnonymous: true, memberships: { select: { orgId: true }, orderBy: { id: "asc" }, take: 1 } },
    }),
    db.membership.findFirst({ where: { userId: targetUserId }, orderBy: { id: "asc" }, select: { orgId: true } }),
  ]);
  if (!anon?.isAnonymous) return 0;
  const fromOrg = anon.memberships[0]?.orgId;
  const toOrg = target?.orgId;

  let moved = 0;
  if (fromOrg && toOrg && fromOrg !== toOrg) {
    moved = await db.$transaction(async (tx) => {
      const events = await tx.event.updateMany({ where: { orgId: fromOrg }, data: { orgId: toOrg } });
      const data = { orgId: toOrg };
      const where = { orgId: fromOrg };
      await tx.inviteBlock.updateMany({ where, data });
      await tx.eventAsset.updateMany({ where, data });
      await tx.rsvpQuestion.updateMany({ where, data });
      await tx.mealOption.updateMany({ where, data });
      await tx.drinkOption.updateMany({ where, data });
      await tx.guest.updateMany({ where, data });
      await tx.guestDrink.updateMany({ where, data });
      await tx.guestAlias.updateMany({ where, data });
      await tx.seatTable.updateMany({ where, data });
      await tx.seat.updateMany({ where, data });
      await tx.photo.updateMany({ where, data });
      await tx.wish.updateMany({ where, data });
      await tx.raffle.updateMany({ where, data });
      await tx.raffleEntry.updateMany({ where, data });
      await tx.screenToken.updateMany({ where, data });
      await tx.guestActionLog.updateMany({ where, data });
      await tx.gift.updateMany({ where, data });
      await tx.giftReservation.updateMany({ where, data });
      await tx.dayStep.updateMany({ where, data });
      return events.count;
    });
  }

  // Организация анонимного кабинета пуста — удаляем вместе с ним.
  if (fromOrg) await db.organization.deleteMany({ where: { id: fromOrg, members: { every: { userId: anonUserId } } } });
  await db.user.deleteMany({ where: { id: anonUserId, isAnonymous: true } });
  return moved;
}

/**
 * Уборка брошенных анонимных кабинетов: без живой сессии к ним уже никто
 * не вернётся (сессия — единственный ключ). Пустые — через сутки, с
 * мероприятиями — когда истекла последняя сессия.
 */
export async function purgeAbandonedGuestWorkspaces(now = new Date()): Promise<number> {
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const stale = await db.user.findMany({
    where: {
      isAnonymous: true,
      createdAt: { lt: dayAgo },
      sessions: { none: { expiresAt: { gt: now } } },
    },
    select: { id: true, memberships: { select: { orgId: true } } },
    take: 500,
  });
  const emptyFresh = await db.user.findMany({
    where: {
      isAnonymous: true,
      createdAt: { lt: dayAgo },
      memberships: { every: { organization: { events: { none: {} } } } },
    },
    select: { id: true, memberships: { select: { orgId: true } } },
    take: 500,
  });

  const victims = new Map<string, string[]>();
  for (const user of [...stale, ...emptyFresh]) victims.set(user.id, user.memberships.map((m) => m.orgId));
  if (!victims.size) return 0;

  const { deleteEvent } = await import("@/server/repositories/events");
  for (const [userId, orgIds] of victims) {
    for (const orgId of orgIds) {
      // Через deleteEvent, а не каскадом: у мероприятия файлы в хранилище.
      const events = await db.event.findMany({ where: { orgId }, select: { id: true } });
      for (const event of events) await deleteEvent({ kind: "org", userId, orgId, role: "OWNER" }, event.id);
      await db.organization.deleteMany({ where: { id: orgId } });
    }
    await db.user.deleteMany({ where: { id: userId, isAnonymous: true } });
  }
  return victims.size;
}
