/** План дня файлом .ics: у каждого этапа будильник за выбранное число минут. */
import { requireEventContext } from "@/server/context";
import { listDaySteps } from "@/server/services/day-plan";
import { dayCalendar } from "@/lib/wedding-day";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  return new Response(dayCalendar(await listDaySteps(ctx)), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="wedding-day.ics"',
      "cache-control": "private, no-store",
    },
  });
}
