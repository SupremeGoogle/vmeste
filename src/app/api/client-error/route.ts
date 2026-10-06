/**
 * Ошибки браузера с гостевых страниц (приглашение, вход по QR).
 *
 * Эти страницы — готовый HTML без React, браузерный Sentry туда не
 * грузится: он весит больше самого приглашения. Вместо него в страницу
 * вшит десяток строк (`guest-html/error-reporter.ts`), которые шлют сюда
 * текст ошибки, а мы передаём его в Sentry от имени сервера.
 *
 * Адрес открыт всем, поэтому — строгий размер, лимит по адресу и чистка
 * токенов из ссылок.
 */
import * as Sentry from "@sentry/nextjs";
import { rateLimit } from "@/server/rate-limit";
import { clientAddress } from "@/server/rate-limit/client-key";
import { scrubUrl } from "@/lib/sentry-scrub";
import { notifyGuestError } from "@/server/notify/events";

export const dynamic = "force-dynamic";

const clip = (value: unknown, max: number) => (typeof value === "string" ? scrubUrl(value).slice(0, max) : "");

export async function POST(request: Request) {
  if (!rateLimit(`client-error:${clientAddress(request)}`, 20, 10 * 60_000).ok) return new Response(null, { status: 204 });
  const text = await request.text();
  if (text.length > 8000) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const message = clip(body.message, 500) || "Ошибка в браузере гостя";
  // Ошибки расширений браузера и чужих скриптов — не наши.
  if (/extension:\/\/|ResizeObserver loop|Script error\.?$/i.test(`${message} ${clip(body.source, 300)}`)) {
    return new Response(null, { status: 204 });
  }
  notifyGuestError(message, clip(body.page, 300), clip(body.template, 40) || "—");
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return new Response(null, { status: 204 });
  Sentry.withScope((scope) => {
    scope.setTag("surface", "guest-html");
    scope.setTag("template", clip(body.template, 40) || "—");
    scope.setLevel("error");
    scope.setContext("browser-error", {
      page: clip(body.page, 300),
      source: clip(body.source, 300),
      line: Number(body.line) || null,
      column: Number(body.column) || null,
      stack: clip(body.stack, 4000),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    scope.setFingerprint(["guest-html", message, clip(body.source, 300)]);
    Sentry.captureMessage(message);
  });
  return new Response(null, { status: 204 });
}
