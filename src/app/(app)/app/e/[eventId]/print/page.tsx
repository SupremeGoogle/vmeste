import QRCode from "qrcode";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listTables } from "@/server/repositories/seating";
import { getSavedPrintDesigns } from "@/server/services/print-design";
import { reconcilePrintDesign } from "@/lib/print-design";
import { PrintDesigner } from "@/components/print/print-designer";
import { notFound } from "next/navigation";
import { getT } from "@/server/i18n";
import { localeOf } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, tables, saved] = await Promise.all([getEvent(ctx, eventId), listTables(ctx), getSavedPrintDesigns(ctx)]);
  if (!event) notFound();
  const t = await getT();
  // Табличку печатают для гостей — дата и подписи на языке мероприятия.
  const lang = event.language === "en" ? "en" : "ru";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qrData = await QRCode.toDataURL(`${base}/e/${event.shortCode}`, { width: 900, margin: 1, errorCorrectionLevel: "H" });
  const rows = tables.flatMap((table) => table.seats.flatMap((seat) => seat.guest ? [{ name: seat.guest.displayName, table: table.label }] : [])).sort((a, b) => a.name.localeCompare(b.name, lang));
  const date = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);
  const design = reconcilePrintDesign(saved.qr, "qr", event.title, date, [], lang);
  return <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
    <PrintDesigner eventId={eventId} mode="qr" initial={design} title={event.title} date={date} tables={[]} qrData={qrData} shortCode={event.shortCode} lang={lang} />
    <section className="mx-auto mt-12 max-w-3xl border-t border-stone-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-lg font-semibold">{t("Резервный список гостей", "Backup guest list")}</h2><p className="mt-1 text-sm text-stone-500">{t("Алфавитный список для координатора на случай отсутствия связи.", "An A–Z list for the coordinator in case there's no connection.")}</p></div>
        <a href={`/api/app/events/${eventId}/seating/pdf`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">{t("Скачать рабочий PDF", "Download working PDF")}</a>
      </div>
      <ul className="mt-5 columns-1 gap-8 text-sm sm:columns-2">{rows.map((row, i) => <li key={`${row.name}-${i}`} className="mb-1 flex justify-between gap-4 break-inside-avoid"><span>{row.name}</span><span className="whitespace-nowrap text-stone-500">{row.table}</span></li>)}</ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-stone-500">{t("Пока никто не рассажен.", "No one is seated yet.")}</p> : null}
    </section>
  </main>;
}
