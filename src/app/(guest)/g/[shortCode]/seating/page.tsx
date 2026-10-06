/**
 * «Рассадка всех гостей» — списки по столам в оформлении печатного шаблона
 * «Гортензия · крупные списки»: белая бумага, акварельные гортензии по
 * углам, названия столов рукописью, имена антиквой.
 *
 * Не копия листа A3, а та же композиция под телефон: лист в полный рост
 * на экране в 390 px был бы нечитаем. Стол гостя и его имя подсвечены.
 * Только для опознанного гостя — см. `loadSeatingLists`.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findEventByShortCode } from "@/server/repositories/events";
import { identifyByEventSession } from "@/server/guest-access/identify";
import { loadSeatingLists } from "@/server/services/guest-hub";
import { SeatingSheet } from "./seating-sheet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Рассадка гостей" };

export default async function GuestSeatingPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();
  const guest = await identifyByEventSession(event.id);
  if (!guest) redirect(`/g/${event.shortCode}`);

  const tables = await loadSeatingLists(event.id);
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pt-4 pb-14 sm:px-6 sm:pt-8">
      <Link href={`/g/${event.shortCode}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-muted hover:text-ink">
        ← Моя страница
      </Link>
      <SeatingSheet title={event.title} dateLabel={dateLabel} tables={tables} meId={guest.guestId} />
    </main>
  );
}
