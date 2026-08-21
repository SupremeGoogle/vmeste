/**
 * Кто этот гость.
 *
 * Два удостоверения, оба заканчиваются одним и тем же `GuestRef`:
 *   — токен именной ссылки (гость только что открыл приглашение);
 *   — cookie гостевой сессии, поставленная при первом действии.
 *
 * Токен спрашивается первым, потому что он в адресе страницы и всегда под
 * рукой; cookie нужна для случая «гость вернулся с главной, ссылки уже нет»
 * и для будущего входа по QR (PLAN.md §1.3). Каждое обращение по токену
 * заодно продлевает cookie — гостю не приходится искать смс заново.
 */
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { readGuestSession, setGuestSession } from "@/server/guest-access/session";
import { db } from "@/server/db";

export type GuestIdentity = {
  orgId: string;
  eventId: string;
  guestId: string;
  displayName: string;
  eventTitle: string;
  photosEnabled: boolean;
  wishesEnabled: boolean;
};

/** Сколько живёт гостевая сессия: месяц после свадьбы. */
function sessionExpiry(eventDate: Date): Date {
  const afterEvent = new Date(eventDate);
  afterEvent.setDate(afterEvent.getDate() + 30);
  const month = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  return afterEvent > month ? afterEvent : month;
}

export async function identifyByToken(token: string): Promise<GuestIdentity | null> {
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.status === "ARCHIVED") return null;

  const event = await db.event.findFirst({
    where: { id: guest.eventId, orgId: guest.orgId },
    select: { photosEnabled: true, wishesEnabled: true },
  });

  await setGuestSession(
    { eventId: guest.eventId, guestId: guest.id },
    guest.event.guestLinkSecret,
    sessionExpiry(guest.event.eventDate),
  );

  return {
    orgId: guest.orgId,
    eventId: guest.eventId,
    guestId: guest.id,
    displayName: guest.displayName,
    eventTitle: guest.event.title,
    photosEnabled: event?.photosEnabled ?? false,
    wishesEnabled: event?.wishesEnabled ?? false,
  };
}

/**
 * Гость по cookie, когда на руках только адрес мероприятия.
 *
 * Так приходит тот, кто вошёл по QR в день свадьбы: именной ссылки
 * у него нет, зато есть cookie, выданная после «это я» (PLAN.md §1.3).
 */
export async function identifyBySlugSession(slug: string): Promise<GuestIdentity | null> {
  const event = await db.event.findFirst({
    where: { slug, status: { not: "ARCHIVED" } },
    orderBy: { eventDate: "asc" },
    select: {
      id: true, orgId: true, title: true, guestLinkSecret: true,
      photosEnabled: true, wishesEnabled: true,
    },
  });
  if (!event) return null;

  const session = await readGuestSession(event.id, event.guestLinkSecret);
  if (!session) return null;

  const guest = await db.guest.findFirst({
    where: { id: session.guestId, eventId: event.id, archivedAt: null },
    select: { id: true, displayName: true },
  });
  if (!guest) return null;

  return {
    orgId: event.orgId,
    eventId: event.id,
    guestId: guest.id,
    displayName: guest.displayName,
    eventTitle: event.title,
    photosEnabled: event.photosEnabled,
    wishesEnabled: event.wishesEnabled,
  };
}

/** Полная личность гостя по мероприятию и его cookie. */
export async function identifyByEventSession(eventId: string): Promise<GuestIdentity | null> {
  const event = await db.event.findFirst({
    where: { id: eventId, status: { not: "ARCHIVED" } },
    select: {
      id: true, orgId: true, title: true, guestLinkSecret: true,
      photosEnabled: true, wishesEnabled: true,
    },
  });
  if (!event) return null;

  const session = await readGuestSession(event.id, event.guestLinkSecret);
  if (!session) return null;

  const guest = await db.guest.findFirst({
    where: { id: session.guestId, eventId: event.id, archivedAt: null },
    select: { id: true, displayName: true },
  });
  if (!guest) return null;

  return {
    orgId: event.orgId,
    eventId: event.id,
    guestId: guest.id,
    displayName: guest.displayName,
    eventTitle: event.title,
    photosEnabled: event.photosEnabled,
    wishesEnabled: event.wishesEnabled,
  };
}

/**
 * Гость по cookie конкретного мероприятия. Подпись проверяется секретом
 * мероприятия: его ротация гасит все гостевые сессии разом.
 */
export async function identifyBySession(eventId: string): Promise<{ guestId: string } | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { guestLinkSecret: true },
  });
  if (!event) return null;

  const session = await readGuestSession(eventId, event.guestLinkSecret);
  if (!session) return null;

  // Гость мог быть архивирован уже после выдачи cookie.
  const guest = await db.guest.findFirst({
    where: { id: session.guestId, eventId, archivedAt: null },
    select: { id: true },
  });
  return guest ? { guestId: guest.id } : null;
}
