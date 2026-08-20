/**
 * Гостевая сессия. Ставится после того, как гость подтвердил «это я»
 * на входе или открыл именную ссылку.
 *
 * Подписывается секретом мероприятия (`Event.guestLinkSecret`): ротация
 * секрета гасит все гостевые сессии разом — на случай, если ссылка утекла
 * в общий чат.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_PREFIX = "vmeste_guest_";

export type GuestSession = { eventId: string; guestId: string };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function cookieName(eventId: string) {
  // Отдельная cookie на мероприятие: гость может быть на двух свадьбах,
  // и сессия одной не должна вытеснять другую.
  return `${COOKIE_PREFIX}${eventId.slice(-8)}`;
}

export async function setGuestSession(
  session: GuestSession,
  secret: string,
  expiresAt: Date,
): Promise<void> {
  const payload = `${session.eventId}.${session.guestId}`;
  const jar = await cookies();
  jar.set(cookieName(session.eventId), `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function readGuestSession(
  eventId: string,
  secret: string,
): Promise<GuestSession | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(eventId))?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 3) return null;

  const [cookieEventId, guestId, signature] = parts;
  if (cookieEventId !== eventId) return null;

  const expected = sign(`${cookieEventId}.${guestId}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { eventId: cookieEventId, guestId };
}
