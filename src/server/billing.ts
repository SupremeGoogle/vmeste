/**
 * Оплата свадьбы: 1 490 ₽ за одно мероприятие (lib/pricing.ts).
 *
 * Пока свадьба не оплачена, это черновик для себя: делать можно всё —
 * гостей, рассадку, приглашение, тайминг. Закрыто только то, что видят
 * другие люди: публикация, именные ссылки, вход по QR, экран в зале и
 * командная ссылка. Проверка `paidAt` стоит в самих точках входа гостей
 * (repositories/guests.ts, repositories/events.ts, guest-access/identify.ts,
 * services/screen.ts, services/day-plan.ts, repositories/invites.ts) и в
 * `setEventStatus` — чтобы ни одна новая кнопка не прошла мимо оплаты.
 *
 * Как защищена оплата:
 *   — сумма берётся только из кода и записывается в счёт (Payment.amount)
 *     до перехода на оплату; уведомление с другой суммой отвергается;
 *   — оплаченной свадьба становится только по уведомлению Robokassa с
 *     подписью паролем №2 (payments/robokassa.ts) или по ответу самой
 *     Robokassa на запрос статуса; возврат покупателя на сайт ничего не решает;
 *   — повторное уведомление ничего не меняет: счёт и свадьба переводятся
 *     в «оплачено» условным UPDATE … WHERE status = 'PENDING' в транзакции;
 *   — счёт выставляет только зарегистрированный владелец кабинета: у
 *     кабинета без регистрации нет почты для чека и не на кого его записать.
 */
import { db } from "@/server/db";
import { operationState, paymentUrl, robokassaConfig } from "@/server/payments/robokassa";
import { WEDDING_PRICE_KOPECKS, WEDDING_PRICE_RUB, formatRub } from "@/lib/pricing";
import { isOwnerEmail } from "@/server/admin/config";
import type { EventContext } from "@/server/context";

export function paymentsEnabled(): boolean {
  return robokassaConfig() !== null;
}

export async function isEventPaid(ctx: EventContext): Promise<boolean> {
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { paidAt: true } });
  return Boolean(event?.paidAt);
}

export type StartPaymentResult =
  | { ok: true; url: string }
  | { ok: false; reason: "paid" | "anonymous" | "disabled" | "missing" };

/**
 * Сколько стоит свадьба для этого пользователя, в копейках.
 *
 * PAYMENT_TEST_PRICE_RUB (например, 50) — тестовая цена для проверки боевой
 * оплаты. Действует только для владельца платформы (SUPERADMIN_EMAILS) и
 * только если меньше обычной цены; всем остальным — 1 490 ₽. После проверки
 * строку из .env убирают.
 */
export function priceKopecksFor(email: string): number {
  const raw = process.env.PAYMENT_TEST_PRICE_RUB?.trim() ?? "";
  const rub = /^\d{1,4}$/.test(raw) ? Number(raw) : 0;
  if (rub >= 1 && rub < WEDDING_PRICE_RUB && isOwnerEmail(email)) return rub * 100;
  return WEDDING_PRICE_KOPECKS;
}

/** Новый счёт на свадьбу и ссылка на оплату. Каждая попытка — свой счёт:
 *  Robokassa не принимает повторную оплату одного InvId. */
export async function startPayment(ctx: EventContext, lang: "ru" | "en" = "ru"): Promise<StartPaymentResult> {
  const config = robokassaConfig();
  if (!config) return { ok: false, reason: "disabled" };

  const [user, event] = await Promise.all([
    db.user.findUnique({ where: { id: ctx.userId }, select: { email: true, isAnonymous: true } }),
    db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { id: true, title: true, paidAt: true } }),
  ]);
  if (!user || user.isAnonymous) return { ok: false, reason: "anonymous" };
  if (!event) return { ok: false, reason: "missing" };
  if (event.paidAt) return { ok: false, reason: "paid" };

  const amount = priceKopecksFor(user.email);
  const payment = await db.payment.create({
    data: {
      eventId: event.id, userId: ctx.userId, amount,
      isTest: config.test, eventTitle: event.title.slice(0, 200), email: user.email,
    },
    select: { invId: true },
  });
  const description = lang === "en"
    ? `Vmeste wedding, invoice ${payment.invId}`
    : `Свадьба на сервисе Вместе, счёт ${payment.invId}`;
  return {
    ok: true,
    url: paymentUrl(config, {
      invId: payment.invId,
      kopecks: amount,
      description,
      itemName: lang === "en" ? "Vmeste: one wedding" : "Сервис «Вместе»: одна свадьба",
      email: user.email,
      lang,
    }),
  };
}

export type ConfirmResult = "paid" | "already" | "unknown" | "amount";

/**
 * Счёт оплачен. Вызывается только после проверки подписи Robokassa
 * или по её же ответу о статусе. Повторный вызов безопасен.
 */
export async function confirmPayment(invId: number, kopecks: number, providerData: Record<string, string>): Promise<ConfirmResult> {
  const payment = await db.payment.findUnique({
    where: { invId },
    select: { id: true, amount: true, status: true, eventId: true, eventTitle: true },
  });
  if (!payment) return "unknown";
  if (payment.amount !== kopecks) {
    const { notifyOwner } = await import("@/server/notify/telegram");
    void notifyOwner(`Оплата: сумма не сошлась по счёту ${invId} — ждали ${payment.amount / 100} ₽, пришло ${kopecks / 100} ₽. Свадьба не открыта.`, "alert").catch(() => false);
    return "amount";
  }
  if (payment.status === "PAID") return "already";

  const now = new Date();
  const changed = await db.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "PAID", paidAt: now, providerData },
    });
    if (updated.count !== 1) return false;
    if (payment.eventId) {
      await tx.event.updateMany({ where: { id: payment.eventId, paidAt: null }, data: { paidAt: now } });
    }
    return true;
  });
  if (!changed) return "already";
  if (payment.eventId) await dropGuestCaches(payment.eventId);

  const { notifyOwner } = await import("@/server/notify/telegram");
  void notifyOwner(`Оплата ${formatRub(payment.amount / 100).replace(" ", " ")}: «${payment.eventTitle}», счёт ${invId}`).catch(() => false);
  return "paid";
}

/** Гостевые страницы могли закешировать «не найдено» — сбросить. */
async function dropGuestCaches(eventId: string) {
  try {
    const event = await db.event.findUnique({ where: { id: eventId }, select: { slug: true } });
    if (!event) return;
    const { revalidateTag } = await import("next/cache");
    const { allEventTags } = await import("@/lib/cache-tags");
    for (const tag of allEventTags(eventId, event.slug)) revalidateTag(tag, "max");
  } catch {
    // Вне запроса Next (тест, скрипт) кеша нет.
  }
}

export type PaymentView = { invId: number; status: "PENDING" | "PAID"; eventId: string | null };

/** Счёт этой свадьбы по номеру — для страницы «спасибо». Чужой счёт не виден. */
export async function findEventPayment(ctx: EventContext, invId: number): Promise<PaymentView | null> {
  return db.payment.findFirst({
    where: { invId, eventId: ctx.eventId, event: { orgId: ctx.orgId } },
    select: { invId: true, status: true, eventId: true },
  });
}

/**
 * Уведомление задержалось — спросить Robokassa напрямую. Свадьба
 * открывается, только если Robokassa сама говорит «оплачено» (код 100)
 * и сумма совпадает со счётом.
 */
export async function reconcilePayment(ctx: EventContext, invId: number): Promise<boolean> {
  const config = robokassaConfig();
  const payment = await findEventPayment(ctx, invId);
  if (!config || !payment) return false;
  if (payment.status === "PAID") return true;
  const state = await operationState(config, invId);
  if (!state || state.code !== 100 || state.kopecks === null) return false;
  const result = await confirmPayment(invId, state.kopecks, { source: "OpStateExt" });
  return result === "paid" || result === "already";
}

/** Подписка, выданная владельцем (admin/subscription.ts), действует сейчас. */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { subscriptionUntil: true, isAnonymous: true, blockedAt: true } });
  return Boolean(user && !user.isAnonymous && !user.blockedAt && user.subscriptionUntil && user.subscriptionUntil > new Date());
}

/**
 * Открыть неоплаченные свадьбы пользователя по его подписке. Каждая
 * получает счёт на 0 ₽ с пометкой «подписка» — чтобы в сверке было
 * видно, откуда у свадьбы доступ. Возвращает, сколько открыто.
 */
export async function unlockEventsBySubscription(userId: string, onlyEventId?: string): Promise<number> {
  if (!(await hasActiveSubscription(userId))) return 0;
  const orgs = await db.membership.findMany({ where: { userId }, select: { orgId: true } });
  if (!orgs.length) return 0;
  const events = await db.event.findMany({
    where: { orgId: { in: orgs.map((m) => m.orgId) }, paidAt: null, ...(onlyEventId ? { id: onlyEventId } : {}) },
    select: { id: true, title: true },
  });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, subscriptionUntil: true } });
  let unlocked = 0;
  for (const event of events) {
    const now = new Date();
    const done = await db.$transaction(async (tx) => {
      const updated = await tx.event.updateMany({ where: { id: event.id, paidAt: null }, data: { paidAt: now } });
      if (updated.count !== 1) return false;
      await tx.payment.create({
        data: {
          eventId: event.id, userId, amount: 0, status: "PAID", provider: "subscription", paidAt: now,
          eventTitle: event.title.slice(0, 200), email: user.email,
          providerData: { subscriptionUntil: user.subscriptionUntil?.toISOString() ?? null },
        },
      });
      return true;
    });
    if (done) {
      unlocked++;
      await dropGuestCaches(event.id);
    }
  }
  return unlocked;
}

/** Свадьба открыта: оплачена или открывается сейчас по подписке. */
export async function ensureEventUnlocked(ctx: EventContext): Promise<boolean> {
  if (await isEventPaid(ctx)) return true;
  await unlockEventsBySubscription(ctx.userId, ctx.eventId);
  return isEventPaid(ctx);
}
