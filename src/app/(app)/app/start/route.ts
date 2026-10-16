/**
 * Вход в кабинет без регистрации.
 *
 * Сюда ведёт кабинет, когда сессии нет (app/layout.tsx): вместо формы
 * входа заводим анонимный кабинет и открываем форму новой свадьбы. Почта
 * и пароль понадобятся только при публикации (server/billing.ts).
 *
 * Кабинет заводит только POST. GET отдаёт крошечную страницу, которая
 * сама отправляет форму: роутер Next запрашивает адрес по нескольку раз
 * (предзагрузка, RSC-запрос, затем обычный переход), и GET, создающий
 * строки, заводил бы по три кабинета на один клик. Роботы и превью ссылок
 * форм не отправляют. Сверху — лимит на IP; брошенные кабинеты убирает
 * фоновая уборка (services/guest-workspace.ts).
 */
import { cookies } from "next/headers";
import { createSession, getSessionUser, requestOrigin } from "@/server/auth/session";
import { createGuestWorkspace } from "@/server/services/guest-workspace";
import { rateLimit } from "@/server/rate-limit";
import { LANG_COOKIE, parseLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const ROBOT = /bot|crawl|spider|slurp|facebookexternalhit|vkshare|headless|lighthouse|pagespeed|preview|curl|wget|python|go-http|node-fetch|axios|monitor|uptime/i;

function to(path: string): Response {
  return new Response(null, { status: 303, headers: { location: path, "cache-control": "no-store" } });
}

async function pickLang(request: Request): Promise<Lang> {
  const url = new URL(request.url);
  const referer = request.headers.get("referer") ?? "";
  return parseLang(url.searchParams.get("lang")) ?? parseLang((await cookies()).get(LANG_COOKIE)?.value)
    ?? (/\/en(\/|$|\?)/.test(referer) ? "en" : "ru");
}

export async function GET(request: Request) {
  if (await getSessionUser()) return to("/app");
  const lang = await pickLang(request);
  const text = lang === "en"
    ? { title: "Opening your dashboard…", button: "Start without signing up", login: "I have an account", loginHref: "/login?lang=en" }
    : { title: "Открываем кабинет…", button: "Начать без регистрации", login: "У меня есть кабинет", loginHref: "/login" };
  // Без внешних скриптов и стилей: страница живёт долю секунды.
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${text.title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#faf7f2;color:#292524}main{text-align:center;padding:24px}button{margin-top:16px;min-height:44px;padding:0 20px;border:0;border-radius:10px;background:#1c1917;color:#fff;font-size:16px}a{display:block;margin-top:14px;color:#57534e}</style></head>
<body><main><p>${text.title}</p><form method="post" action="/app/start?lang=${lang}"><noscript><button type="submit">${text.button}</button></noscript></form><a href="${text.loginHref}">${text.login}</a></main>
<script>document.forms[0].submit()</script></body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export async function POST(request: Request) {
  // Уже есть кабинет (и анонимный тоже) — второй не заводим.
  if (await getSessionUser()) return to("/app");

  // Форму отправляет только наша страница: чужой сайт не заведёт кабинеты
  // посетителям.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return to("/login");

  const lang = await pickLang(request);
  const { ip, userAgent } = await requestOrigin();
  if (!userAgent || ROBOT.test(userAgent)) return to(lang === "en" ? "/login?lang=en" : "/login");
  // Десять новых кабинетов в час с одного адреса — с запасом на общий
  // Wi-Fi; дальше — обычная регистрация.
  if (!rateLimit(`guest-start:${ip ?? "?"}`, 10, 3_600_000).ok || !rateLimit("guest-start:all", 600, 3_600_000).ok) {
    return to(lang === "en" ? "/register?lang=en" : "/register");
  }

  const userId = await createGuestWorkspace(lang);
  await createSession(userId);
  return to("/app/events/new?first=1");
}
