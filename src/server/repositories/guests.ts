/**
 * Репозиторий гостей. Все методы принимают контекст мероприятия и
 * подмешивают eventId — прямых обращений к db.guest вне этого файла быть не должно.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import { normalizeName } from "@/lib/name-normalize";
import { expandGuestName } from "@/server/services/diminutives";

/** 128 бит энтропии в base64url — 22 символа. Подбирать бессмысленно. */
export function generateLinkToken(): string {
  return randomBytes(16).toString("base64url");
}

export type GuestInput = {
  displayName: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  plusOneAllowed?: boolean;
};

export async function listGuests(ctx: EventContext) {
  return db.guest.findMany({
    where: { eventId: ctx.eventId, archivedAt: null },
    orderBy: { searchKey: "asc" },
    select: {
      id: true, displayName: true, phone: true, rsvpStatus: true,
      plusOneAllowed: true, linkToken: true, linkOpenedAt: true,
      seat: { select: { index: true, table: { select: { label: true } } } },
    },
  });
}

export async function countGuests(ctx: EventContext) {
  const [total, accepted, declined, seated] = await Promise.all([
    db.guest.count({ where: { eventId: ctx.eventId, archivedAt: null } }),
    db.guest.count({ where: { eventId: ctx.eventId, archivedAt: null, rsvpStatus: "ACCEPTED" } }),
    db.guest.count({ where: { eventId: ctx.eventId, archivedAt: null, rsvpStatus: "DECLINED" } }),
    db.seat.count({ where: { eventId: ctx.eventId, guestId: { not: null } } }),
  ]);
  return { total, accepted, declined, seated };
}

/**
 * Создание гостя. Одновременно пишется ключ поиска и раскрываются алиасы
 * из словаря уменьшительных — иначе гость «Настя» себя на входе не найдёт.
 */
export async function createGuest(ctx: EventContext, input: GuestInput) {
  const displayName = input.displayName.trim();
  const aliases = expandGuestName(displayName);

  return db.guest.create({
    data: {
      orgId: ctx.orgId,
      eventId: ctx.eventId,
      displayName,
      searchKey: normalizeName(displayName),
      phone: input.phone ?? null,
      email: input.email ?? null,
      note: input.note ?? null,
      plusOneAllowed: input.plusOneAllowed ?? false,
      linkToken: generateLinkToken(),
      aliases: {
        create: aliases.map((alias) => ({ orgId: ctx.orgId, alias })),
      },
    },
  });
}

/** Массовое создание для импорта CSV. Одна транзакция на весь файл:
 *  половина импортированного списка хуже, чем ничего. */
export async function createGuests(ctx: EventContext, rows: GuestInput[]) {
  return db.$transaction(async (tx) => {
    const created = [];
    for (const row of rows) {
      const displayName = row.displayName.trim();
      if (!displayName) continue;
      const guest = await tx.guest.create({
        data: {
          orgId: ctx.orgId,
          eventId: ctx.eventId,
          displayName,
          searchKey: normalizeName(displayName),
          phone: row.phone ?? null,
          email: row.email ?? null,
          note: row.note ?? null,
          plusOneAllowed: row.plusOneAllowed ?? false,
          linkToken: generateLinkToken(),
          aliases: {
            create: expandGuestName(displayName).map((alias) => ({
              orgId: ctx.orgId,
              alias,
            })),
          },
        },
      });
      created.push(guest);
    }
    return created;
  });
}

export async function getGuest(ctx: EventContext, guestId: string) {
  return db.guest.findFirst({
    where: { id: guestId, eventId: ctx.eventId },
    include: {
      aliases: true,
      seat: { include: { table: true } },
      mealOption: true,
    },
  });
}

export type GuestPatch = {
  displayName?: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
};

/**
 * Правка карточки гостя.
 *
 * При смене имени переписываются и ключ поиска, и автоматические алиасы:
 * иначе гость, записанный с опечаткой и исправленный за день до свадьбы,
 * на входе найдётся только под старым написанием. Ручные алиасы
 * («мама Лена») при этом остаются — их добавлял человек, и стирать их
 * при исправлении фамилии нельзя.
 */
export async function updateGuest(ctx: EventContext, guestId: string, patch: GuestPatch) {
  const guest = await db.guest.findFirst({
    where: { id: guestId, eventId: ctx.eventId },
    select: { id: true, displayName: true },
  });
  if (!guest) return false;

  const displayName = patch.displayName?.trim();
  const renamed = !!displayName && displayName !== guest.displayName;

  await db.$transaction(async (tx) => {
    if (renamed) {
      await tx.guestAlias.deleteMany({
        where: { eventId: ctx.eventId, guestId, source: "auto" },
      });
    }

    await tx.guest.update({
      where: { eventId_id: { eventId: ctx.eventId, id: guestId } },
      data: {
        ...(renamed ? { displayName, searchKey: normalizeName(displayName) } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        ...(renamed
          ? {
              aliases: {
                create: expandGuestName(displayName).map((alias) => ({
                  orgId: ctx.orgId,
                  alias,
                })),
              },
            }
          : {}),
      },
    });
  });

  return true;
}

/** Удаление ручного алиаса. Автоматические удалять смысла нет —
 *  они пересоздаются из имени. */
export async function removeAlias(ctx: EventContext, guestId: string, aliasId: string) {
  const deleted = await db.guestAlias.deleteMany({
    where: { id: aliasId, guestId, eventId: ctx.eventId, source: "manual" },
  });
  return deleted.count === 1;
}

/** Перевыпуск именной ссылки: старая перестаёт работать немедленно.
 *  Нужен, когда ссылка ушла не тому человеку (PLAN.md §1.3). */
export async function reissueLinkToken(ctx: EventContext, guestId: string) {
  const updated = await db.guest.updateMany({
    where: { id: guestId, eventId: ctx.eventId },
    data: { linkToken: generateLinkToken(), linkOpenedAt: null },
  });
  return updated.count === 1;
}

/** Разрешение привести спутника. По одному гостю: зовут с парой не всех. */
export async function setPlusOneAllowed(ctx: EventContext, guestId: string, allowed: boolean) {
  const updated = await db.guest.updateMany({
    where: { id: guestId, eventId: ctx.eventId },
    data: { plusOneAllowed: allowed },
  });
  return updated.count === 1;
}

/** Ручной алиас: «мама Лена», девичья фамилия, прозвище. */
export async function addAlias(ctx: EventContext, guestId: string, alias: string) {
  const normalized = normalizeName(alias);
  if (normalized.length < 2) return null;

  const guest = await db.guest.findFirst({
    where: { id: guestId, eventId: ctx.eventId },
    select: { id: true },
  });
  if (!guest) return null;

  const existing = await db.guestAlias.findFirst({
    where: { eventId: ctx.eventId, guestId, alias: normalized },
    select: { id: true },
  });
  if (existing) return null;

  return db.guestAlias.create({
    data: { orgId: ctx.orgId, eventId: ctx.eventId, guestId, alias: normalized, source: "manual" },
  });
}

/**
 * Архивирование вместо удаления: у гостя уже могут быть ответы, фото и
 * место за столом (PLAN.md §5.10). Место освобождаем явно — составной
 * внешний ключ объявлен как Restrict и сам его не отпустит.
 */
export async function archiveGuest(ctx: EventContext, guestId: string) {
  return db.$transaction(async (tx) => {
    await tx.seat.updateMany({
      where: { eventId: ctx.eventId, guestId },
      data: { guestId: null },
    });
    return tx.guest.update({
      where: { eventId_id: { eventId: ctx.eventId, id: guestId } },
      data: { archivedAt: new Date() },
    });
  });
}

/**
 * Гость по именной ссылке. Единственный запрос к данным мероприятия без
 * eventId — его и определяем из токена (см. исключение в `server/db.ts`).
 * Архивированный гость ссылку теряет: приглашение ему уже не показываем.
 */
export async function findGuestByLinkToken(linkToken: string) {
  if (!linkToken || linkToken.length < 10) return null;

  const guest = await db.guest.findUnique({
    where: { linkToken },
    include: {
      event: {
        select: {
          id: true, orgId: true, title: true, slug: true, status: true,
          eventDate: true, timezone: true, venueName: true, venueAddr: true,
          rsvpDeadline: true, allowPlusOne: true, guestLinkSecret: true,
          photosEnabled: true, wishesEnabled: true,
        },
      },
      mealOption: { select: { id: true, title: true } },
      plusOnes: {
        where: { archivedAt: null },
        select: { id: true, displayName: true, mealOptionId: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!guest || guest.archivedAt) return null;
  return guest;
}

/** Отметка первого открытия ссылки. Пишется один раз: организатору важно
 *  «дошло ли приглашение», а не «сколько раз перечитывали». */
export async function markLinkOpened(eventId: string, guestId: string) {
  await db.guest.updateMany({
    where: { eventId, id: guestId, linkOpenedAt: null },
    data: { linkOpenedAt: new Date() },
  });
}

/** Список блюд мероприятия для формы ответа. */
export async function listMealOptions(eventId: string) {
  return db.mealOption.findMany({
    where: { eventId, active: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });
}
