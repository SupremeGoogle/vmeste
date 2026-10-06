/**
 * Наблюдение за сервером (Next.js instrumentation): Sentry поднимается
 * один раз при старте, а `onRequestError` отдаёт ему ошибки серверных
 * компонентов, маршрутов и действий.
 *
 * Здесь же — фоновая задача сроков хранения (архив через 10 дней после
 * свадьбы, удаление фото через 15; `server/services/retention.ts`). Только
 * в production: локальная база полна прошедших тестовых свадеб.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.RETENTION_DISABLED !== "1") {
    const { startRetentionSchedule } = await import("./server/services/retention");
    startRetentionSchedule();
    const { startOwnerNotifications } = await import("./server/notify/events");
    startOwnerNotifications();
  }
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

/** Ошибки сервера — в Sentry и владельцу в Telegram (одинаковые не чаще раза в 30 мин). */
export const onRequestError: typeof Sentry.captureRequestError = async (error, request, context) => {
  Sentry.captureRequestError(error, request, context);
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { notifyServerError } = await import("./server/notify/events");
  notifyServerError(error, `${request.method} ${request.path} (${context.routeType})`);
};
