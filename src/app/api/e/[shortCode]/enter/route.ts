/**
 * «Меня нет в списке» — вход по QR на свадьбе без поиска себя.
 *
 * Работает, только если организатор открыл вход в настройках
 * (`qrEntryOpen`, по умолчанию закрыто: на свадьбу пускают по списку).
 * Гость пишет имя — и заводится отдельной строкой «добавился сам»,
 * сразу с гостевой cookie: дальше его фото и пожелания подписаны им.
 *
 * Повторный вход с того же телефона под тем же именем двойника не
 * заводит — как и самозапись по общей ссылке (`self-registration.ts`).
 * JSON, а не форма: кнопка живёт в поиске, который и так на скриптах.
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { findEventByShortCode } from "@/server/repositories/events";
import { newGuestData } from "@/server/repositories/guests";
import { readGuestSession, setGuestSession } from "@/server/guest-access/session";
import { rateLimit } from "@/server/rate-limit";
import { clientAddress } from "@/server/rate-limit/client-key";
import { SELF_REGISTRATION_CAP, samePerson, selfRegistrationNameProblem } from "@/server/services/self-registration";
import { makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) return fail("Свадьба не найдена · Wedding not found", 404);
  const lang = parseLang(event.language) ?? "ru";
  const t = makeT(lang);
  if (!event.qrEntryOpen) return fail(t("Вход только по списку гостей — подойдите к координатору.", "Entry is by the guest list only — please ask the coordinator."), 403);

  const address = clientAddress(request);
  if (
    !rateLimit(`qr-enter:${event.id}:${address}`, 20, 10 * 60_000).ok ||
    !rateLimit(`qr-enter:${event.id}:all`, 400, 60 * 60_000).ok
  ) {
    return fail(t("Слишком много попыток. Подождите минуту.", "Too many attempts. Please wait a minute."), 429);
  }

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  const problem = selfRegistrationNameProblem(name, lang);
  if (problem) return fail(problem);
  if (name.length < 2) return fail(t("Напишите имя полностью.", "Please write your full name."));

  const full = await db.event.findUnique({
    where: { id: event.id },
    select: { guestLinkSecret: true, eventDate: true, allowPlusOne: true },
  });
  if (!full) return fail(t("Свадьба не найдена", "Wedding not found"), 404);

  const session = await readGuestSession(event.id, full.guestLinkSecret);
  const sessionGuest = session
    ? await db.guest.findFirst({ where: { id: session.guestId, eventId: event.id, archivedAt: null }, select: { id: true, displayName: true } })
    : null;
  const known = sessionGuest && samePerson(sessionGuest.displayName, name) ? sessionGuest : null;

  if (!known && (await db.guest.count({ where: { eventId: event.id, selfRegistered: true } })) >= SELF_REGISTRATION_CAP) {
    return fail(t("Не получилось войти — подойдите к координатору.", "Couldn’t sign you in — please ask the coordinator."), 429);
  }

  // Пришёл на свадьбу — значит, «придёт»: в ответах он не должен висеть
  // среди тех, от кого ждут ответа.
  const guest = known ?? await db.guest.create({
    data: {
      ...newGuestData({ orgId: event.orgId, eventId: event.id }, { displayName: name, note: "Вошёл по QR на свадьбе, в списке не был" }),
      selfRegistered: true,
      rsvpStatus: "ACCEPTED",
      rsvpAt: new Date(),
    },
    select: { id: true },
  });

  const expires = new Date(full.eventDate);
  expires.setDate(expires.getDate() + 30);
  await setGuestSession(
    { eventId: event.id, guestId: guest.id },
    full.guestLinkSecret,
    expires > new Date() ? expires : new Date(Date.now() + 30 * 24 * 3600 * 1000),
  );

  await db.guestActionLog
    .create({ data: { orgId: event.orgId, eventId: event.id, guestId: guest.id, action: "checkin_self" } })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
