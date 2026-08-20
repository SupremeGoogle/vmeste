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

/** Ручной алиас: «мама Лена», девичья фамилия, прозвище. */
export async function addAlias(ctx: EventContext, guestId: string, alias: string) {
  const normalized = normalizeName(alias);
  if (normalized.length < 2) throw new Error("Слишком короткий алиас");

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
