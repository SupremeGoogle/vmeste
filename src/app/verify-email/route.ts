/**
 * Ссылка из письма подтверждения.
 *
 * GET не подтверждает сам: почтовые сервисы (Outlook, антивирусы, превью в
 * мессенджерах) открывают ссылки из писем заранее, и одноразовая ссылка
 * сгорела бы до того, как человек её нажал. GET отдаёт страницу, которая
 * сама отправляет POST — роботы скриптов не выполняют, человек ничего не
 * замечает, а без JavaScript видна кнопка.
 */
import { redirect } from "next/navigation";
import { createSession } from "@/server/auth/session";
import { confirmEmail } from "@/server/services/email-auth";
import { rateLimit } from "@/server/rate-limit";
import { clientAddress } from "@/server/rate-limit/client-key";

export const dynamic = "force-dynamic";

const page = (token: string) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Подтверждение почты — Вместе</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f7f1ea;color:#3b2f2a;font:16px/1.5 Georgia,serif;text-align:center;padding:24px}button{margin-top:20px;font:600 15px Arial,sans-serif;background:#3b2f2a;color:#fff;border:0;border-radius:999px;padding:14px 28px;cursor:pointer}</style></head>
<body><form method="post" id="f"><input type="hidden" name="token" value="${token.replace(/[^A-Za-z0-9_-]/g, "")}"><h1 style="font-weight:400">Подтверждаем почту…</h1><noscript><p>Нажмите кнопку, чтобы открыть кабинет.</p></noscript><button type="submit">Подтвердить почту</button></form>
<script>document.getElementById("f").submit()</script></body></html>`;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return new Response(page(token), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" },
  });
}

export async function POST(request: Request) {
  if (!rateLimit(`verify:${clientAddress(request)}`, 30, 10 * 60_000).ok) redirect("/login?error=rate");
  const form = await request.formData().catch(() => null);
  const userId = await confirmEmail(String(form?.get("token") ?? ""));
  if (!userId) redirect("/login?error=link");
  await createSession(userId);
  redirect("/app");
}
