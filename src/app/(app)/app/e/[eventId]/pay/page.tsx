/**
 * Оплата свадьбы: 1 490 ₽ один раз (lib/pricing.ts, server/billing.ts).
 *
 * Сюда ведёт «Опубликовать» у неоплаченной свадьбы. Кабинет без
 * регистрации сначала регистрируется (или входит) — и возвращается сюда
 * же: адрес запоминается в cookie (auth/session.ts → rememberAfterAuth).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { getSessionUser, rememberAfterAuth } from "@/server/auth/session";
import { ensureEventUnlocked, hasActiveSubscription, paymentsEnabled, priceKopecksFor, startPayment } from "@/server/billing";
import { rateLimit } from "@/server/rate-limit";
import { getUiLang } from "@/server/i18n";
import { makeT } from "@/lib/i18n";
import { WEDDING_PRICE_KOPECKS, formatRub } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function PayPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { error, status } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const [event, user, lang] = await Promise.all([getEvent(ctx, eventId), getSessionUser(), getUiLang()]);
  if (!event || !user) redirect("/app");
  const t = makeT(lang);
  const q = lang === "en" ? "?lang=en" : "";
  const subscribed = !event.paidAt && !user.isAnonymous && (await hasActiveSubscription(user.id));
  // Сумма будущего счёта: та же функция, что выставит его (billing.priceKopecksFor).
  const kopecks = user.isAnonymous ? WEDDING_PRICE_KOPECKS : priceKopecksFor(user.email);
  const priceLabel = formatRub(kopecks / 100);
  const testPrice = kopecks !== WEDDING_PRICE_KOPECKS;

  async function toAuth(formData: FormData) {
    "use server";
    await requireEventContext(eventId);
    await rememberAfterAuth(`/app/e/${eventId}/pay`);
    redirect(`${formData.get("to") === "login" ? "/login" : "/register"}${q}`);
  }

  /** Подписка от владельца: свадьба открывается без оплаты. */
  async function unlock() {
    "use server";
    const ctx = await requireEventContext(eventId);
    await ensureEventUnlocked(ctx);
    redirect(`/app/e/${eventId}/pay`);
  }

  async function pay(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    // Согласие с офертой — активное действие; `required` в браузере обходится.
    if (formData.get("offer") !== "on") redirect(`/app/e/${eventId}/pay?error=offer`);
    if (!rateLimit(`pay:${ctx.userId}`, 10, 3_600_000).ok) redirect(`/app/e/${eventId}/pay?error=rate`);
    const result = await startPayment(ctx, lang);
    if (result.ok) redirect(result.url);
    if (result.reason === "paid") redirect(`/app/e/${eventId}/pay`);
    if (result.reason === "anonymous") redirect(`/app/e/${eventId}/pay`);
    redirect(`/app/e/${eventId}/pay?error=${result.reason}`);
  }

  const features = [
    t("Приглашение по ссылке и именные ссылки для каждого гостя", "Your invitation link and a personal link for every guest"),
    t("Анкета гостя: ответы, блюда, напитки, песни", "Guest RSVP form: answers, meals, drinks, songs"),
    t("Вход по QR-коду на площадке — гость сразу видит свой стол", "QR entry at the venue — guests see their table right away"),
    t("Фото гостей со свадьбы и общий альбом", "Guest photos from the wedding and a shared album"),
    t("Экран в зале, розыгрыш и ссылка для ведущего и диджея", "Venue screen, raffle and a link for your host and DJ"),
  ];

  const errors: Record<string, string> = {
    offer: t("Отметьте согласие с условиями оферты.", "Please accept the terms of service."),
    rate: t("Слишком много попыток — подождите немного.", "Too many attempts — please wait a little."),
    disabled: t("Приём оплаты ещё подключается.", "Payments are not available yet."),
    missing: t("Свадьба не найдена.", "Wedding not found."),
  };
  const message = error ? (errors[error] ?? t("Не получилось начать оплату — попробуйте ещё раз.", "Couldn’t start the payment — please try again.")) : null;
  const card = "rounded-2xl border border-stone-200 bg-card p-5 sm:p-7";

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm">
        <Link href={`/app/e/${eventId}/invite`} className="text-stone-500 hover:text-stone-900">← {t("К приглашению", "Back to the invitation")}</Link>
      </p>

      {event.paidAt ? (
        <section className={`${card} mt-5`}>
          <h2 className="font-serif text-2xl">{t("Свадьба оплачена", "This wedding is paid")}</h2>
          <p className="mt-2 text-sm text-stone-600">{t("Публикуйте приглашение и рассылайте ссылки гостям — всё открыто.", "Publish the invitation and send links to your guests — everything is unlocked.")}</p>
          <Link href={`/app/e/${eventId}/invite`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-5 text-white">{t("К приглашению", "Go to the invitation")}</Link>
        </section>
      ) : (
        <section className={`${card} mt-5`}>
          <p className="text-sm text-stone-500">{event.title}</p>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl">{t("Публикация свадьбы", "Publish your wedding")}</h2>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="tile-value text-4xl">{priceLabel}</span>
            <span className="text-sm text-stone-500">{t("один раз за эту свадьбу, без подписки", "once for this wedding, no subscription")}</span>
          </p>
          <ul className="mt-5 space-y-2 text-sm text-stone-700">
            {features.map((item) => (
              <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-stone-400">✓</span>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-500">{t("Гостей без ограничения. Всё, что вы уже сделали, остаётся как есть.", "Unlimited guests. Everything you’ve already made stays as it is.")}</p>

          <div className="my-6 h-px bg-stone-200" />

          {status === "fail" && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("Оплата не прошла или была отменена. Деньги не списаны — можно попробовать ещё раз.", "The payment didn’t go through or was canceled. You haven’t been charged — you can try again.")}</p>
          )}

          {subscribed ? (
            <form action={unlock}>
              <p className="text-sm text-stone-700">{t("У вас действует подписка — эта свадьба открывается без оплаты.", "You have an active subscription — this wedding unlocks at no charge.")}</p>
              <button type="submit" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-stone-900 px-5 text-base font-medium text-white">{t("Открыть свадьбу", "Unlock the wedding")}</button>
            </form>
          ) : user.isAnonymous ? (
            <div>
              <p className="text-sm text-stone-700">{t("Чтобы оплатить и опубликовать, сохраните кабинет: укажите почту — на неё придёт чек, и по ней вы войдёте с любого устройства. Всё, что вы сделали, перенесётся.", "To pay and publish, save your account: add your email — the receipt goes there, and you’ll sign in with it from any device. Everything you’ve made carries over.")}</p>
              <form action={toAuth} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button name="to" value="register" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-stone-900 px-5 text-white" data-rybbit-event="pay_register">{t("Зарегистрироваться и оплатить", "Sign up and pay")}</button>
                <button name="to" value="login" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-5 text-stone-800">{t("У меня есть кабинет", "I have an account")}</button>
              </form>
            </div>
          ) : !paymentsEnabled() ? (
            <p className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-700">
              {t("Приём оплаты подключается. Напишите нам на ", "Online payment is being set up. Write to us at ")}
              <a href="mailto:support@vvvmeste.com" className="underline">support@vvvmeste.com</a>
              {t(" — откроем свадьбу вручную.", " and we’ll unlock your wedding manually.")}
            </p>
          ) : (
            <form action={pay} className="space-y-4">
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-stone-600">
                <input type="checkbox" name="offer" required className="mt-0.5 size-4 shrink-0 accent-stone-900" />
                <span>
                  {t("Принимаю условия ", "I accept the ")}
                  <Link href="/offer" target="_blank" className="underline">{t("оферты", "Terms of Service")}</Link>
                  {t(" и понимаю, что после публикации доступ к свадьбе открыт полностью.", " (in Russian) and understand that publishing unlocks the wedding in full.")}
                </span>
              </label>
              {message && <p className="text-sm text-red-700">{message}</p>}
              <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-stone-900 px-5 text-base font-medium text-white" data-rybbit-event="pay_start">
                {t("Оплатить", "Pay")} {priceLabel}
              </button>
              {testPrice && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                  {t("Тестовая цена для владельца платформы (PAYMENT_TEST_PRICE_RUB). У всех остальных — обычная.", "Owner test price (PAYMENT_TEST_PRICE_RUB). Everyone else pays the regular price.")}
                </p>
              )}
              <p className="text-center text-xs leading-relaxed text-stone-500">
                {t("Оплата через Robokassa: СБП, банковская карта, SberPay. Чек придёт на ", "Paid via Robokassa: SBP, bank card, SberPay. The receipt goes to ")}
                <span className="text-stone-700">{user.email}</span>.
              </p>
            </form>
          )}
          {user.isAnonymous && message && <p className="mt-3 text-sm text-red-700">{message}</p>}
        </section>
      )}
    </main>
  );
}
