/**
 * Репозиторий мероприятий. Единственное место, где создаётся Event —
 * здесь же генерируется shortCode.
 */
import { randomInt } from "node:crypto";
import { db } from "@/server/db";
import type { OrgContext } from "@/server/context";

/** Алфавит без визуально похожих символов: ни 0/O, ни 1/I/l.
 *  Код диктуют голосом и набирают в темноте зала. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateShortCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

async function uniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateShortCode();
    const taken = await db.event.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("Не удалось подобрать свободный shortCode за 10 попыток");
}

export async function listEvents(ctx: OrgContext) {
  return db.event.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { eventDate: "desc" },
    select: {
      id: true, title: true, slug: true, shortCode: true,
      status: true, eventDate: true, venueName: true,
      _count: { select: { guests: true } },
    },
  });
}

/** Свободен ли адрес приглашения внутри организации. */
export async function isSlugTaken(ctx: OrgContext, slug: string): Promise<boolean> {
  const existing = await db.event.findFirst({
    where: { orgId: ctx.orgId, slug },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Создание мероприятия. Возвращает `null`, если адрес занят.
 *
 * Проверка идёт и до вставки (чтобы сказать это человеку), и после — ловлей
 * P2002: между проверкой и вставкой организатор мог создать мероприятие
 * во второй вкладке, и падать пятисоткой на это нельзя.
 */
export async function createEvent(
  ctx: OrgContext,
  input: { title: string; slug: string; eventDate: Date; venueName?: string; timezone?: string },
) {
  if (await isSlugTaken(ctx, input.slug)) return null;

  try {
    return await db.event.create({
    data: {
      orgId: ctx.orgId,
      title: input.title,
      slug: input.slug,
      eventDate: input.eventDate,
      venueName: input.venueName,
      timezone: input.timezone ?? "Europe/Moscow",
      shortCode: await uniqueShortCode(),
    },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return null;
    throw error;
  }
}

/**
 * Публичный вход по QR: мероприятие по короткому коду. Без авторизации.
 *
 * Архивные не отдаются вовсе. Иначе код с прошлогодней таблички остаётся
 * рабочим ключом к списку гостей той свадьбы: поиск по имени, чужие
 * фамилии, номера столов. Проверка стоит здесь, а не в трёх маршрутах,
 * которые этой функцией пользуются, — забыть её в четвёртом нельзя.
 */
export async function findEventByShortCode(shortCode: string) {
  const event = await db.event.findUnique({
    where: { shortCode: shortCode.toUpperCase().trim() },
    select: {
      id: true, orgId: true, title: true, slug: true, shortCode: true,
      status: true, eventDate: true, timezone: true, venueName: true,
      photosEnabled: true, wishesEnabled: true,
    },
  });

  return event && event.status !== "ARCHIVED" ? event : null;
}

export async function getEvent(ctx: OrgContext, eventId: string) {
  return db.event.findFirst({ where: { id: eventId, orgId: ctx.orgId } });
}

/** Быстрое переименование прямо со списка мероприятий, без похода в настройки. */
export async function renameEvent(ctx: OrgContext, eventId: string, title: string): Promise<boolean> {
  const clean = title.trim().slice(0, 120);
  if (!clean) return false;

  const updated = await db.event.updateMany({
    where: { id: eventId, orgId: ctx.orgId },
    data: { title: clean },
  });
  return updated.count === 1;
}

/**
 * Полное удаление мероприятия и всех его данных (гости, рассадка,
 * приглашение, фото, розыгрыш — всё висит на eventId с onDelete: Cascade).
 * Необратимо, поэтому в отличие от архивации это не «скрыть», а стереть.
 */
export async function deleteEvent(ctx: OrgContext, eventId: string): Promise<boolean> {
  const deleted = await db.event.deleteMany({
    where: { id: eventId, orgId: ctx.orgId },
  });
  return deleted.count === 1;
}

/** Инкремент версии рассадки — оптимистическая блокировка (PLAN.md §5.4). */
export async function bumpSeatingVersion(eventId: string, orgId: string) {
  const updated = await db.event.update({
    where: { orgId_id: { orgId, id: eventId } },
    data: { seatingVersion: { increment: 1 } },
    select: { seatingVersion: true },
  });
  return updated.seatingVersion;
}

/** Публикация приглашения: только опубликованное мероприятие открывается
 *  по публичной ссылке `/i/{slug}`. */
export async function setEventStatus(
  ctx: OrgContext,
  eventId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  await db.event.updateMany({
    where: { id: eventId, orgId: ctx.orgId },
    data: { status },
  });
}

/** Срок ответа на приглашение. Пустая строка — снять срок. */
export async function setRsvpDeadline(ctx: OrgContext, eventId: string, deadline: Date | null) {
  await db.event.updateMany({
    where: { id: eventId, orgId: ctx.orgId },
    data: { rsvpDeadline: deadline },
  });
}

export type EventSettingsInput = {
  title: string;
  eventDate: Date;
  timezone: string;
  venueName: string | null;
  venueAddr: string | null;
  allowPlusOne: boolean;
  photosEnabled: boolean;
  wishesEnabled: boolean;
  raffleEnabled: boolean;
  photoLimitPerGuest: number;
};

/** Настройки мероприятия из одной формы: всё, что организатор меняет руками. */
export async function updateEventSettings(
  ctx: OrgContext,
  eventId: string,
  input: EventSettingsInput,
) {
  const updated = await db.event.updateMany({
    where: { id: eventId, orgId: ctx.orgId },
    data: {
      title: input.title,
      eventDate: input.eventDate,
      timezone: input.timezone,
      venueName: input.venueName,
      venueAddr: input.venueAddr,
      allowPlusOne: input.allowPlusOne,
      photosEnabled: input.photosEnabled,
      wishesEnabled: input.wishesEnabled,
      raffleEnabled: input.raffleEnabled,
      photoLimitPerGuest: input.photoLimitPerGuest,
    },
  });
  return updated.count === 1;
}

/**
 * Ротация секрета гостевых cookie. Разлогинивает всех гостей разом —
 * на случай, если именная ссылка утекла в общий чат (PLAN.md §4.3).
 * Сами ссылки при этом продолжают работать: секрет подписывает cookie,
 * а не токен.
 */
export async function rotateGuestSecret(ctx: OrgContext, eventId: string) {
  const updated = await db.$executeRaw`
    UPDATE events
       SET "guestLinkSecret" = encode(gen_random_bytes(32), 'hex')
     WHERE id = ${eventId} AND "orgId" = ${ctx.orgId}
  `;
  return updated === 1;
}

export async function listMealOptions(ctx: OrgContext, eventId: string) {
  return db.mealOption.findMany({
    where: { eventId, orgId: ctx.orgId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true, active: true, _count: { select: { guests: true } } },
  });
}

export async function addMealOption(ctx: OrgContext, eventId: string, title: string) {
  const clean = title.trim().slice(0, 60);
  if (!clean) return null;

  const event = await db.event.findFirst({
    where: { id: eventId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!event) return null;

  const last = await db.mealOption.findFirst({
    where: { eventId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return db.mealOption.create({
    data: { orgId: ctx.orgId, eventId, title: clean, order: (last?.order ?? -1) + 1 },
    select: { id: true, title: true },
  });
}

/**
 * Блюдо не удаляется, а выключается: его уже мог выбрать гость, и удаление
 * либо сотрёт его выбор, либо упрётся в `onDelete: Restrict`. Выключенное
 * не показывается в форме ответа, но остаётся в сводке для кухни.
 */
export async function toggleMealOption(ctx: OrgContext, eventId: string, mealId: string) {
  const meal = await db.mealOption.findFirst({
    where: { id: mealId, eventId, orgId: ctx.orgId },
    select: { id: true, active: true },
  });
  if (!meal) return false;

  await db.mealOption.updateMany({
    where: { id: mealId, eventId },
    data: { active: !meal.active },
  });
  return true;
}
