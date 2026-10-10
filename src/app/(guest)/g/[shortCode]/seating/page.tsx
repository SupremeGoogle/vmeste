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
import { localeOf, makeT, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Заголовок вкладки — на языке мероприятия, как и вся страница. */
export async function generateMetadata({ params }: { params: Promise<{ shortCode: string }> }): Promise<Metadata> {
  const event = await findEventByShortCode((await params).shortCode);
  return { title: event?.language === "en" ? "Seating" : "Рассадка гостей" };
}

export default async function GuestSeatingPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();
  const guest = await identifyByEventSession(event.id);
  if (!guest) redirect(`/g/${event.shortCode}`);

  const tables = await loadSeatingLists(event.id);
  const lang = parseLang(event.language) ?? "ru";
  const t = makeT(lang);
  const dateLabel = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pt-4 pb-14 sm:px-6 sm:pt-8">
      <Link href={`/g/${event.shortCode}`} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-muted hover:text-ink">
        {t("← Моя страница", "← My page")}
      </Link>
      <SeatingSheet title={event.title} dateLabel={dateLabel} tables={tables} meId={guest.guestId} />
    </main>
  );
}
