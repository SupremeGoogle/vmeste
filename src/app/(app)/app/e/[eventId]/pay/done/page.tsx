/**
 * Возврат после оплаты. Оплачено ли, решает только счёт в базе: его
 * переводит в «оплачено» уведомление Robokassa (api/pay/robokassa/result)
 * или её же ответ о статусе (billing.reconcilePayment). Пока уведомления
 * нет — ждём и перепроверяем.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { findEventPayment, reconcilePayment } from "@/server/billing";
import { publishEvent } from "@/server/services/publish";
import { eventTag, inviteSlugTag } from "@/lib/cache-tags";
import { getT } from "@/server/i18n";
import { RefreshWhilePending } from "./refresh";

export const dynamic = "force-dynamic";

/** Сколько ждём подтверждения: две минуты с возврата, дальше — подсказка. */
function waited(since?: string): { startedAt: number; late: boolean } {
  const now = Date.now();
  const startedAt = Number(since) || now;
  return { startedAt, late: now - startedAt > 120_000 };
}

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ inv?: string; t?: string }>;
};

export default async function PaymentDonePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { inv, t: since } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const invId = /^\d{1,10}$/.test(inv ?? "") ? Number(inv) : null;
  if (!invId) redirect(`/app/e/${eventId}/pay`);
  let payment = await findEventPayment(ctx, invId);
  if (!payment) notFound();
  // Уведомление могло задержаться — спрашиваем Robokassa сами.
  if (payment.status !== "PAID" && (await reconcilePayment(ctx, invId))) payment = await findEventPayment(ctx, invId);

  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const t = await getT();
  // Когда вернулись с оплаты (ставит api/pay/robokassa/success) — чтобы
  // перепроверка знала, когда остановиться.
  const { startedAt, late } = waited(since);

  async function publish() {
    "use server";
    const ctx = await requireEventContext(eventId);
    const done = await publishEvent(ctx);
    if (done) {
      updateTag(eventTag(eventId));
      updateTag(inviteSlugTag(done.slug));
    }
    redirect(`/app/e/${eventId}/invite`);
  }

  const card = "rounded-2xl border border-stone-200 bg-card p-5 sm:p-7";

  if (payment?.status !== "PAID") {
    return (
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
        <RefreshWhilePending startedAt={startedAt} />
        <section className={card}>
          <h2 className="font-serif text-2xl">{t("Ждём подтверждения оплаты", "Waiting for payment confirmation")}</h2>
          <p className="mt-2 text-sm text-stone-600">{t("Обычно это несколько секунд. Страница обновится сама.", "This usually takes a few seconds. The page will update by itself.")}</p>
          {late && (
            <p className="mt-4 text-sm text-stone-600">
              {t("Подтверждение задерживается. Если деньги списались — напишите на ", "Confirmation is taking longer than usual. If you were charged, write to ")}
              <a href="mailto:support@vvvmeste.com" className="underline">support@vvvmeste.com</a>
              {t(`, указав номер счёта ${invId}. Мы всё проверим.`, ` with invoice number ${invId}. We’ll sort it out.`)}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <section className={card}>
        <p className="text-3xl" aria-hidden="true">✓</p>
        <h2 className="mt-2 font-serif text-2xl sm:text-3xl">{t("Оплата прошла", "Payment received")}</h2>
        <p className="mt-2 text-sm text-stone-600">
          {t(`Свадьба «${event.title}» открыта: ссылки гостям, вход по QR и экран в зале работают. Чек придёт на почту.`, `“${event.title}” is unlocked: guest links, QR entry and the venue screen now work. The receipt will be emailed to you.`)}
        </p>
        {event.status === "PUBLISHED" ? (
          <Link href={`/app/e/${eventId}/invite`} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-5 text-white">{t("К приглашению", "Go to the invitation")}</Link>
        ) : (
          <form action={publish} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-900 px-5 text-white" data-rybbit-event="invite_publish_after_pay">{t("Опубликовать приглашение", "Publish the invitation")}</button>
            <Link href={`/app/e/${eventId}/invite`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-5 text-stone-800">{t("Сначала доделаю", "I’ll finish it first")}</Link>
          </form>
        )}
      </section>
    </main>
  );
}
