/**
 * Печатные материалы — это план Б на день свадьбы.
 *
 * Здесь две вещи, каждая на своей странице при печати:
 *   1. табличка на вход: QR + код крупными буквами. Часть телефонов не
 *      сканирует QR в темноте зала, поэтому код всегда продублирован текстом;
 *   2. список «имя → стол» по алфавиту. Если упало вообще всё, координатор
 *      работает по бумаге.
 */
import QRCode from "qrcode";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listTables } from "@/server/repositories/seating";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const entryUrl = `${base}/e/${event.shortCode}`;

  // SVG, а не PNG: печатается без пикселизации на любом формате.
  const qrSvg = await QRCode.toString(entryUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const tables = await listTables(ctx);
  const rows = tables
    .flatMap((table) =>
      table.seats
        .filter((seat) => seat.guest)
        .map((seat) => ({ name: seat.guest!.displayName, table: table.label })),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="no-print mb-6 flex items-start justify-between gap-6">
        <p className="text-sm text-stone-600">
          Распечатайте эту страницу и выгрузите PDF с рассадкой — отдайте
          координатору. Это план Б на случай, если в день свадьбы всё упадёт.
        </p>
        <a
          href={`/api/app/events/${eventId}/seating/pdf`}
          className="shrink-0 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          Скачать план рассадки (PDF)
        </a>
      </div>

      <section className="print-page rounded-xl border border-stone-200 bg-white p-10 text-center">
        <p className="text-sm uppercase tracking-widest text-stone-500">{event.title}</p>
        <h2 className="mt-2 text-2xl font-semibold">Найдите свой стол</h2>

        <div
          className="mx-auto mt-6 w-56"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <p className="mt-6 text-sm text-stone-600">Или откройте на телефоне</p>
        <p className="font-mono text-lg">{base.replace(/^https?:\/\//, "")}/e/</p>
        <p className="font-mono text-4xl font-bold tracking-[0.2em]">{event.shortCode}</p>
      </section>

      <section className="print-page mt-8 rounded-xl border border-stone-200 bg-white p-8">
        <h2 className="text-lg font-semibold">
          {event.title} — рассадка ({rows.length} человек)
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Список на случай, если сервис недоступен.
        </p>

        <ul className="mt-6 columns-2 gap-8 text-sm">
          {rows.map((row) => (
            <li key={row.name} className="mb-1 flex justify-between gap-4 break-inside-avoid">
              <span>{row.name}</span>
              <span className="whitespace-nowrap text-stone-500">{row.table}</span>
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <p className="mt-6 text-stone-600">Пока никто не рассажен.</p>
        )}
      </section>
    </main>
  );
}
