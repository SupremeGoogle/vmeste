/**
 * «Это я» — выдача гостевой cookie после входа по QR.
 *
 * Второй путь доступа из PLAN.md §1.3: гость в зале нашёл себя по имени
 * и подтверждает, что это он. Дальше фотографии и пожелания привязаны
 * к его карточке, и второй раз вводить имя не придётся.
 *
 * Что этот путь НЕ даёт — именную ссылку. Поиск по имени доступен любому,
 * у кого есть короткий код мероприятия, и выдать по нему постоянный токен
 * значило бы отдать чужой ответ, чужие фото и возможность их менять.
 * Cookie живёт до конца свадьбы и снимается сбросом секрета мероприятия.
 *
 * Форма, а не JSON: страница входа в зал написана без JavaScript, и это
 * обычная кнопка внутри неё.
 */
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { findEventByShortCode } from "@/server/repositories/events";
import { setGuestSession } from "@/server/guest-access/session";
import { rateLimit } from "@/server/rate-limit";
import { clientAddress } from "@/server/rate-limit/client-key";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event || event.status === "ARCHIVED") return new Response(null, { status: 404 });

  // Тот же грубый потолок, что и у поиска: без него код мероприятия
  // превращается в способ раздавать себе чужие сессии перебором.
  const address = clientAddress(request);
  if (!rateLimit(`claim:${address}:${event.id}`, 60, 60_000).ok) {
    return new Response("Слишком часто", { status: 429 });
  }

  const form = await request.formData();
  const guestId = String(form.get("guestId") ?? "");

  const guest = await db.guest.findFirst({
    where: { id: guestId, eventId: event.id, archivedAt: null },
    select: { id: true },
  });
  if (!guest) return new Response(null, { status: 404 });

  const full = await db.event.findUnique({
    where: { id: event.id },
    select: { guestLinkSecret: true, eventDate: true, slug: true },
  });
  if (!full) return new Response(null, { status: 404 });

  const expires = new Date(full.eventDate);
  expires.setDate(expires.getDate() + 30);

  await setGuestSession(
    { eventId: event.id, guestId: guest.id },
    full.guestLinkSecret,
    expires > new Date() ? expires : new Date(Date.now() + 30 * 24 * 3600 * 1000),
  );

  await db.guestActionLog
    .create({
      data: {
        orgId: event.orgId,
        eventId: event.id,
        guestId: guest.id,
        action: "checkin_claim",
      },
    })
    .catch(() => {});

  redirect(`/i/${full.slug}/${String(form.get("next") ?? "photos")}`);
}
