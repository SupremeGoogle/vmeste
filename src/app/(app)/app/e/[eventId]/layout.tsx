import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { notFound } from "next/navigation";
import { EventTabs } from "./event-tabs";
import { RouteTransition } from "@/components/motion/motion";
import { getDraftState } from "@/server/repositories/invite-draft";
import { DraftReminder } from "./draft-reminder";
import Link from "next/link";
import { getT } from "@/server/i18n";
import { WEDDING_PRICE_LABEL } from "@/lib/pricing";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const draft = await getDraftState(ctx);
  const t = await getT();

  return (
    <div>
      {/* Липкая шапка: в списке гостей на 40 человек переключиться на
          «Рассадку» иначе можно только домотав до самого верха. На печать
          она не идёт — position:sticky повторил бы её на каждом листе. */}
      <div className="no-print sticky top-0 z-20 border-b border-stone-200 bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="truncate text-xl sm:text-2xl">{event.title}</h1>
            <span className="shrink-0 font-mono text-sm tracking-widest text-stone-500">
              {event.shortCode}
            </span>
          </div>
          <EventTabs eventId={eventId} />
        </div>
        <DraftReminder eventId={eventId} dirty={draft.dirty} />
        {/* Пока не оплачено, гостевые ссылки и QR молчат (server/billing.ts) —
            организатор должен знать это до того, как разошлёт ссылки. */}
        {!event.paidAt && (
          <p className="border-t border-stone-200 bg-stone-50 px-4 py-2 text-center text-xs text-stone-600 sm:text-sm">
            {t("Черновик для вас: гости пока ничего не видят. Публикация, ссылки гостям и вход по QR откроются после оплаты — ", "A private draft: guests can’t see anything yet. Publishing, guest links and QR entry open after payment — ")}
            {WEDDING_PRICE_LABEL}{t(" за свадьбу. ", " per wedding. ")}
            <Link href={`/app/e/${eventId}/pay`} className="font-medium text-stone-900 underline underline-offset-2">{t("Оплатить", "Pay")}</Link>
          </p>
        )}
      </div>
      <RouteTransition>{children}</RouteTransition>
    </div>
  );
}
