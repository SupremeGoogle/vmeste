/** План дня в календарь — тот же файл, что у организатора, по командной ссылке. */
import { dayCalendar } from "@/lib/wedding-day";
import { listDaySteps, teamPlanAccess } from "@/server/services/day-plan";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await teamPlanAccess(token);
  if (!ctx) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

  return new Response(dayCalendar(await listDaySteps(ctx)), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="wedding-day.ics"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
    },
  });
}
