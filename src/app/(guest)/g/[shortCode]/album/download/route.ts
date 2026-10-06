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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const text = (body: string, status: number, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...extra } });

export async function GET(request: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) return new Response(null, { status: 404 });
  const guest = await identifyByEventSession(event.id);
  if (!guest) return text("Сначала найдите себя на странице свадьбы", 401);

  const settings = await db.event.findFirst({ where: { id: event.id }, select: { albumEnabled: true } });
  if (!albumIsOpen({ ...event, albumEnabled: settings?.albumEnabled ?? false })) return text("Альбом пока закрыт", 403);

  const limit = rateLimit(`album:${event.id}:${guest.guestId}`, 5, 60_000);
  if (!limit.ok) return text("Подождите минуту и скачайте снова", 429, { "retry-after": String(limit.retryAfterSec) });

  const scope = albumScope(new URL(request.url).searchParams.get("scope"));
  const photos = await db.photo.findMany({
    where: await albumFilter(event.id, guest.guestId, scope),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, storageKey: true },
  });
  if (!photos.length) return text("Здесь пока нет снимков", 404);

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
