/**
 * Sentry на сервере (Node). Ловит ошибки страниц, API и серверных действий.
 * Без SENTRY_DSN (или NEXT_PUBLIC_SENTRY_DSN) ничего не отправляется.
 */
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || undefined,
  // Трассировка — малой долей: сервер на 1 ГБ, лишняя работа ему ни к чему.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
  beforeSend: (event) => scrubEvent(event),
  beforeSendTransaction: (event) => scrubEvent(event),
});
