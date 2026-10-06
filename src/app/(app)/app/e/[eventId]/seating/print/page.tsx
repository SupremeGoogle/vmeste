import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listTables } from "@/server/repositories/seating";
import { getSavedPrintDesigns } from "@/server/services/print-design";
import { printableTables, reconcilePrintDesign } from "@/lib/print-design";
import { PrintDesigner } from "@/components/print/print-designer";

export const dynamic = "force-dynamic";

export default async function SeatingPrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, rawTables, saved] = await Promise.all([getEvent(ctx, eventId), listTables(ctx), getSavedPrintDesigns(ctx)]);
  if (!event) notFound();
  // Без стола молодожёнов и без самих невесты и жениха — см. printableTables.
  const tables = printableTables(rawTables);
  const date = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);
  const design = reconcilePrintDesign(saved.seating, "seating", event.title, date, tables);
  return <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
    <a href={`/app/e/${eventId}/seating`} className="mb-5 inline-block text-sm text-stone-500 hover:text-stone-900">← Вернуться к рассадке</a>
    {tables.length === 0 ? <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Добавьте столы в рассадке — они появятся в печатном макете автоматически.</p> : null}
    <PrintDesigner eventId={eventId} mode="seating" initial={design} title={event.title} date={date} tables={tables} qrData="" shortCode={event.shortCode} />
  </main>;
}
