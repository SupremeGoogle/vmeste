import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listTables } from "@/server/repositories/seating";
import { getSavedPrintDesigns } from "@/server/services/print-design";
import { printableTables, reconcilePrintDesign } from "@/lib/print-design";
import { PrintDesigner } from "@/components/print/print-designer";
import { getT } from "@/server/i18n";
import { localeOf } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SeatingPrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, rawTables, saved] = await Promise.all([getEvent(ctx, eventId), listTables(ctx), getSavedPrintDesigns(ctx)]);
  if (!event) notFound();
  const t = await getT();
  // Лист печатают для гостей — дата и подписи на языке мероприятия.
  const lang = event.language === "en" ? "en" : "ru";
  // Без стола молодожёнов и без самих невесты и жениха — см. printableTables.
  const tables = printableTables(rawTables);
  const date = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);
  const design = reconcilePrintDesign(saved.seating, "seating", event.title, date, tables, lang);
  return <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
    <a href={`/app/e/${eventId}/seating`} className="mb-5 inline-block text-sm text-stone-500 hover:text-stone-900">{t("← Вернуться к рассадке", "← Back to seating chart")}</a>
    {tables.length === 0 ? <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t("Добавьте столы в рассадке — они появятся в печатном макете автоматически.", "Add tables in the seating chart — they'll appear in the print layout automatically.")}</p> : null}
    <PrintDesigner eventId={eventId} mode="seating" initial={design} title={event.title} date={date} tables={tables} qrData="" shortCode={event.shortCode} lang={lang} />
  </main>;
}
