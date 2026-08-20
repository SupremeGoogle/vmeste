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

export async function createEvent(
  ctx: OrgContext,
  input: { title: string; slug: string; eventDate: Date; venueName?: string; timezone?: string },
) {
  return db.event.create({
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
}

/** Публичный вход по QR: мероприятие по короткому коду. Без авторизации. */
export async function findEventByShortCode(shortCode: string) {
  return db.event.findUnique({
    where: { shortCode: shortCode.toUpperCase().trim() },
    select: {
      id: true, orgId: true, title: true, slug: true, shortCode: true,
      status: true, eventDate: true, timezone: true, venueName: true,
    },
  });
}

export async function getEvent(ctx: OrgContext, eventId: string) {
  return db.event.findFirst({ where: { id: eventId, orgId: ctx.orgId } });
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
