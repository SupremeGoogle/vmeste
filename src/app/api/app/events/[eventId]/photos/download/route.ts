/**
 * Все фотографии свадьбы одним ZIP — для организатора.
 *
 * Нужен прежде всего в архиве: через 15 дней после свадьбы фото
 * удаляются (`lib/retention.ts`), и это последний способ их забрать.
 * Берутся все, кроме отклонённых: неразобранные в очереди — тоже снимки
 * гостей. Архив идёт потоком, как гостевой (`photoArchive`).
 */
import { requireEventContext } from "@/server/context";
import { db } from "@/server/db";
import { getEvent } from "@/server/repositories/events";
import { photoArchive } from "@/server/services/album";
import { rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) return new Response(null, { status: 404 });

  const limit = rateLimit(`photos-zip:${eventId}`, 3, 60_000);
  if (!limit.ok) return text("Подождите минуту и скачайте снова", 429);

  const rejected = new URL(request.url).searchParams.get("only") === "rejected";
  const photos = await db.photo.findMany({
    // Отклонённые в общий архив не идут — их скачивают отдельно (?only=rejected).
    where: { eventId, orgId: ctx.orgId, status: rejected ? "REJECTED" : { not: "REJECTED" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, storageKey: true },
  });
  if (!photos.length) return text("Фотографий нет", 404);

  return new Response(photoArchive(photos), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="wedding-${event.shortCode}-${rejected ? "rejected" : "photos"}.zip"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
