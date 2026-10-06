/** Список песен для диджея по командной ссылке — тот же, что у организатора. */
import { db } from "@/server/db";
import { teamPlanAccess } from "@/server/services/day-plan";
import { csvHeaders } from "@/server/services/csv-export";
import { djPlaylist, playlistCsv } from "@/server/services/playlist";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await teamPlanAccess(token);
  if (!ctx) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { timezone: true } });
  if (!event) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

  const rows = await djPlaylist(ctx.eventId, ctx.orgId);
  return new Response(playlistCsv(rows, event.timezone), {
    headers: { ...csvHeaders("dj-playlist"), "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" },
  });
}
