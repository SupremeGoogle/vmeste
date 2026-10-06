/**
 * Список песен для диджея, CSV: песни из анкеты гостей
 * одним файлом. Тот же файл команда скачивает по своей ссылке.
 */
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { csvHeaders } from "@/server/services/csv-export";
import { djPlaylist, playlistCsv } from "@/server/services/playlist";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) return new Response(null, { status: 404 });

  const rows = await djPlaylist(ctx.eventId, ctx.orgId);
  return new Response(playlistCsv(rows, event.timezone), { headers: csvHeaders("dj-playlist") });
}
