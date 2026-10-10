/**
 * Архив альбома ZIP-потоком: снимки читаются из хранилища по одному,
 * весь альбом в памяти не лежит — сервер с 1 ГБ памяти это переживёт.
 * Не чаще пяти раз в минуту на гостя: архив — самый тяжёлый запрос сервиса.
 */
import { db } from "@/server/db";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { findEventByShortCode } from "@/server/repositories/events";
import { albumIsOpen } from "@/lib/wedding-day";
import { albumFilter, albumScope, photoArchive } from "@/server/services/album";
import { rateLimit } from "@/server/rate-limit";
import { makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const text = (body: string, status: number, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...extra } });

export async function GET(request: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) return new Response(null, { status: 404 });
  const guest = await identifyByEventSession(event.id);
  const t = makeT(parseLang(event.language) ?? "ru");
  if (!guest) return text(t("Сначала найдите себя на странице свадьбы", "Please find yourself on the wedding page first"), 401);

  const settings = await db.event.findFirst({ where: { id: event.id }, select: { albumEnabled: true } });
  if (!albumIsOpen({ ...event, albumEnabled: settings?.albumEnabled ?? false })) return text(t("Альбом пока закрыт", "The album isn’t open yet"), 403);

  const limit = rateLimit(`album:${event.id}:${guest.guestId}`, 5, 60_000);
  if (!limit.ok) return text(t("Подождите минуту и скачайте снова", "Please wait a minute and try again"), 429, { "retry-after": String(limit.retryAfterSec) });

  const scope = albumScope(new URL(request.url).searchParams.get("scope"));
  const photos = await db.photo.findMany({
    where: await albumFilter(event.id, guest.guestId, scope),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, storageKey: true },
  });
  if (!photos.length) return text(t("Здесь пока нет снимков", "There are no photos here yet"), 404);

  return new Response(photoArchive(photos), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="wedding-${event.shortCode}-${scope}.zip"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
