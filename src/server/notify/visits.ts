/**
 * Уведомление владельцу о каждом новом посетителе сайта.
 *
 * Браузер отмечается один раз (`lib/visit-beacon.ts`), а здесь — вторая
 * линия: роботы по User-Agent, повтор с того же адреса и браузера за сутки
 * (очищенный localStorage, приватное окно) и потолок сообщений в час.
 * Свадьба на двести гостей, которым разом пришла ссылка, иначе залила бы
 * чат: сверх потолка заходы считаются и приходят одной сводкой.
 *
 * Ни адрес, ни полный User-Agent не хранятся и не уходят в Telegram —
 * только хеш для повтора, раздел сайта, источник и тип устройства.
 * Токены именных ссылок из пути вырезаются.
 */
import { createHash } from "node:crypto";
import { notifyOwner, telegramConfigured } from "@/server/notify/telegram";

const DAY_MS = 24 * 3600_000;
const HOUR_MS = 3600_000;
export const VISITS_PER_HOUR = 40;

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|vkshare|telegram|whatsapp|skype|discord|headless|lighthouse|pagespeed|curl|wget|python|go-http|node-fetch|axios|monitor|uptime|pingdom|yandex(?!browser)|bingpreview/i;

export function isBot(userAgent: string): boolean {
  return !userAgent.trim() || BOT.test(userAgent);
}

/** Путь без секретов: токен именной ссылки и приглашения команды — «…». */
export function maskPath(path: string): string {
  const clean = path.split(/[?#]/)[0].slice(0, 200) || "/";
  return clean
    .replace(/^\/i\/([^/]+)\/[^/]+/, "/i/$1/…")
    .replace(/^\/team\/[^/]+/, "/team/…")
    .replace(/^\/screen\/[^/]+/, "/screen/…");
}

/** Раздел сайта человеческими словами. */
export function sectionOf(path: string): string {
  if (path === "/") return "Главная";
  if (/^\/i\/[^/]+\/[^/]+/.test(path)) return "Именное приглашение";
  if (path.startsWith("/i/")) return "Приглашение";
  if (path.startsWith("/g/")) return "Страница гостя по QR";
  if (path.startsWith("/templates")) return "Витрина шаблонов";
  if (/^\/(login|register|forgot|reset)/.test(path)) return "Вход и регистрация";
  if (path.startsWith("/app")) return "Кабинет организатора";
  if (path.startsWith("/demo")) return "Демо";
  return "Сайт";
}

/** «iPhone · Safari», «Windows · Chrome» — без версий и прочих отпечатков. */
export function deviceOf(userAgent: string, width?: number): string {
  const os = /iPhone/.test(userAgent) ? "iPhone"
    : /iPad/.test(userAgent) ? "iPad"
    : /Android/.test(userAgent) ? "Android"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS X|Macintosh/.test(userAgent) ? "Mac"
    : /Linux/.test(userAgent) ? "Linux" : "";
  const browser = /YaBrowser/.test(userAgent) ? "Яндекс Браузер"
    : /Edg\//.test(userAgent) ? "Edge"
    : /OPR\/|Opera/.test(userAgent) ? "Opera"
    : /SamsungBrowser/.test(userAgent) ? "Samsung Internet"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari" : "";
  const screen = typeof width === "number" && width > 0 ? (width < 768 ? "телефон" : width < 1100 ? "планшет" : "компьютер") : "";
  return [os, browser, !os && screen ? screen : ""].filter(Boolean).join(" · ") || "неизвестно";
}

/** Откуда пришёл: домен источника; свой сайт и пустой — «напрямую». */
export function sourceOf(referrer: string, ownHost: string | null): string {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || (ownHost && host === ownHost.replace(/^www\./, ""))) return "напрямую";
    return host;
  } catch {
    return "напрямую";
  }
}

const seen = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;
let suppressed = 0;

/** Для тестов: забыть всех посетителей и счётчики. */
export function resetVisitState() {
  seen.clear();
  windowStart = 0;
  sentInWindow = 0;
  suppressed = 0;
}

export type Visit = { path: string; referrer: string; width?: number; language?: string; userAgent: string; address: string; ownHost: string | null };

/**
 * Решить, писать ли владельцу, и написать. Возвращает, что сделали —
 * это нужно тестам; отправка в Telegram идёт фоном и ничего не роняет.
 */
export function recordVisit(visit: Visit, now = Date.now()): "bot" | "repeat" | "sent" | "suppressed" | "off" {
  if (isBot(visit.userAgent)) return "bot";
  const key = createHash("sha256").update(`${visit.address}\n${visit.userAgent}`).digest("hex").slice(0, 24);
  const last = seen.get(key);
  if (last && now - last < DAY_MS) return "repeat";
  seen.set(key, now);
  if (seen.size > 20_000) for (const [k, at] of seen) if (now - at > DAY_MS) seen.delete(k);

  if (process.env.VISIT_NOTIFY === "0" || !telegramConfigured()) return "off";

  if (now - windowStart > HOUR_MS) {
    // Новый час: сначала сводка за прошлый, если что-то не отправили.
    if (suppressed > 0) void notifyOwner(`За прошлый час ещё новых посетителей: ${suppressed} (без отдельных уведомлений)`).catch(() => false);
    windowStart = now;
    sentInWindow = 0;
    suppressed = 0;
  }
  if (sentInWindow >= VISITS_PER_HOUR) {
    suppressed += 1;
    return "suppressed";
  }
  sentInWindow += 1;

  const path = maskPath(visit.path);
  const lines = [
    `👀 Новый посетитель — ${sectionOf(visit.path)}`,
    `Страница: ${path}`,
    `Откуда: ${sourceOf(visit.referrer, visit.ownHost)}`,
    `Устройство: ${deviceOf(visit.userAgent, visit.width)}`,
    ...(visit.language ? [`Язык: ${visit.language.slice(0, 12)}`] : []),
  ];
  if (sentInWindow === VISITS_PER_HOUR) lines.push("Это 40-й за час — дальше пришлю одной сводкой.");
  void notifyOwner(lines.join("\n")).catch(() => false);
  return "sent";
}
