/**
 * Sentry в браузере (панель организатора, вход, лендинг): ошибки
 * пользователей видны сразу, с шагами, которые к ним привели. Запись
 * экрана при ошибке — только с NEXT_PUBLIC_SENTRY_REPLAY=1: это заметный
 * вес для телефона, а тексты в записи всё равно скрыты.
 *
 * Отчёты идут через наш же адрес `/monitoring` (tunnelRoute), а не прямо
 * в sentry.io: так их не режут блокировщики рекламы и сетевые фильтры.
 */
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NEXT_PUBLIC_SENTRY_REPLAY === "1" ? 1 : 0,
    integrations: process.env.NEXT_PUBLIC_SENTRY_REPLAY === "1"
      ? [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })]
      : [],
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => (crumb.category === "console" && crumb.level !== "error" ? null : crumb),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
