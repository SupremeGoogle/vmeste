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
