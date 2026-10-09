import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { listGuests } from "@/server/repositories/guests";
import { getTheme } from "@/server/repositories/invites";
import { getSavedPrintInvitation } from "@/server/services/print-invitation";
import { makePrintInvitation } from "@/lib/print-invitation";
import { PrintInvitationEditor } from "@/components/invite/print-invitation-editor";
import { listAssets } from "@/server/services/assets";
import { getT } from "@/server/i18n";
import { localeOf, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PrintInvitationPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, theme, saved, guests, assets] = await Promise.all([getEvent(ctx, eventId), getTheme(ctx), getSavedPrintInvitation(ctx), listGuests(ctx), listAssets(ctx)]);
  if (!event) notFound();
  const t = await getT();
  // Открытку читают гости — тексты по умолчанию на языке мероприятия.
  const lang = parseLang(event.language) ?? "ru";
  const g = (ru: string, en: string) => (lang === "en" ? en : ru);
  const seed = {
    lang,
    names: theme.wedding?.names || event.title || g("Имена молодожёнов", "The couple’s names"),
    date: new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate),
    venue: theme.wedding?.venueName || event.venueName || g("Место торжества", "Venue"),
    address: theme.wedding?.venueAddress || event.venueAddr || g("Адрес торжества", "Venue address"),
  };
  return <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 sm:py-9">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[.22em] text-stone-500">{t("Для красивой печати", "Ready for print")}</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{t("Печатное приглашение", "Printed invitation")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{t("Выберите оформление, впишите ваши слова и расположите элементы на открытке. Скачайте PDF для печати или физической отправки гостям.", "Choose a design, add your own words and arrange everything on the card. Download a PDF to print or mail to your guests.")}</p>
      </div>
      <a href={`/app/e/${eventId}/invite`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">{t("← Электронное приглашение", "← Online invitation")}</a>
    </div>
    <PrintInvitationEditor eventId={eventId} initial={saved ?? makePrintInvitation(seed)} seed={seed} guestCount={guests.filter((guest) => !guest.parentGuestId).length} initialAssets={assets} />
  </main>;
}
