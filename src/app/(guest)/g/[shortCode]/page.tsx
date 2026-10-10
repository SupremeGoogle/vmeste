/**
 * Страница гостя по QR.
 *
 * Два состояния на одном адресе. Гость ещё не назвался — поиск по имени с
 * выпадающим списком. Назвался (гостевая cookie после «это я») — сразу
 * видно, где он сидит, и тут же фото, общая галерея, пожелание и кнопка
 * «Рассадка всех гостей».
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findEventByShortCode } from "@/server/repositories/events";
import { loadGuestHub } from "@/server/services/guest-hub";
import { GuestApp } from "./guest-app";
import { localeOf, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ shortCode: string }> }): Promise<Metadata> {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  return { title: event ? event.title : "Свадьба · Wedding" };
}

export default async function GuestPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();

  const hub = await loadGuestHub(event.id);
  // Дата — на языке мероприятия, как и вся гостевая часть.
  const lang = parseLang(event.language) ?? "ru";
  const dateLabel = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);

  return (
    <GuestApp
      code={event.shortCode}
      eventId={event.id}
      event={{ title: event.title, dateLabel, venue: event.venueName }}
      hub={hub}
      openEntry={event.qrEntryOpen}
    />
  );
}
