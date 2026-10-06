/**
 * Веб-аналитика Rybbit (github.com/rybbit-io/rybbit) — открытая замена
 * Google Analytics без cookie: баннер согласия ей не нужен.
 *
 * Настройка переменными:
 *  — NEXT_PUBLIC_RYBBIT_HOST     адрес Rybbit (облако https://app.rybbit.io
 *                                или свой сервер);
 *  — NEXT_PUBLIC_RYBBIT_SITE_ID  номер сайта в Rybbit;
 *  — RYBBIT_API_KEY              ключ API — для цифр в панели суперадмина.
 * Без адреса и номера сайта скрипт не подключается вовсе.
 *
 * Свой сервер Rybbit требует от 2 ГБ памяти (внутри ClickHouse), поэтому
 * на одном сервере с сайтом (1 ГБ) он не поместится — облако или отдельная
 * машина.
 */
import { esc } from "@/server/guest-html/layout";

function host(): string | null {
  const value = (process.env.NEXT_PUBLIC_RYBBIT_HOST ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s"'<>]+$/.test(value) ? value : null;
}

function siteId(): string | null {
  const value = (process.env.NEXT_PUBLIC_RYBBIT_SITE_ID ?? "").trim();
  return /^[\w-]{1,64}$/.test(value) ? value : null;
}

/**
 * События гостей: отправленная анкета и открытый виш-лист. Шаблоны рисуют
 * формы по-своему, поэтому ловим общее — форму с полем имени гостя.
 */
const GUEST_EVENTS = `<script>(function(){function track(n,p){try{window.rybbit&&window.rybbit.event(n,p||{})}catch(e){}}
document.addEventListener("submit",function(e){var f=e.target;if(f&&f.querySelector&&f.querySelector("[name=guestName]"))track("rsvp_submit",{page:location.pathname.split("/").length>3?"personal":"public"})},true);
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest(".vm-wl-btn");if(b)track("wishlist_open")},true);})()</script>`;

export function rybbitEnabled(): boolean {
  return Boolean(host() && siteId());
}

/**
 * Тег скрипта. Личные страницы гостей маскируются: токен именной ссылки
 * в аналитику уходить не должен.
 */
export function rybbitScriptTag(): string {
  const base = host();
  const site = siteId();
  if (!base || !site) return "";
  const mask = JSON.stringify(["/i/*/*", "/i/*/*/*", "/e/*", "/g/*", "/screen/*"]);
  return `<script src="${esc(base)}/api/script.js?siteId=${esc(site)}" data-site-id="${esc(site)}" data-mask-patterns='${esc(mask)}' data-skip-patterns='${esc(JSON.stringify(["/admin", "/admin/*"]))}' defer></script>${GUEST_EVENTS}`;
}

/** Атрибуты того же скрипта для React (`<Script>` в панели организатора). */
export function rybbitScriptProps(): { src: string; siteId: string; mask: string; skip: string } | null {
  const base = host();
  const site = siteId();
  if (!base || !site) return null;
  return {
    src: `${base}/api/script.js?siteId=${site}`,
    siteId: site,
    mask: JSON.stringify(["/i/*/*", "/i/*/*/*", "/e/*", "/g/*", "/screen/*"]),
    skip: JSON.stringify(["/admin", "/admin/*"]),
  };
}

export type RybbitOverview = {
  sessions: number; pageviews: number; users: number; bounceRate: number; sessionDuration: number;
  series: { time: string; users: number; pageviews: number }[];
  dashboardUrl: string;
};

/** Цифры Rybbit за `days` дней для панели; null — не настроено или недоступно. */
export async function rybbitOverview(days = 30): Promise<RybbitOverview | { error: string } | null> {
  const base = host();
  const site = siteId();
  const key = process.env.RYBBIT_API_KEY;
  if (!base || !site || !key) return null;
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const query = new URLSearchParams({
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    time_zone: "Europe/Moscow",
  });
  const get = async (path: string, extra = "") => {
    const response = await fetch(`${base}/api/sites/${site}/${path}?${query}${extra}`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Rybbit ответил ${response.status}`);
    return (await response.json()) as { data: unknown };
  };
  try {
    const [overview, series] = await Promise.all([get("overview"), get("overview/time-series", "&bucket=day")]);
    const data = overview.data as Record<string, number>;
    return {
      sessions: data.sessions ?? 0,
      pageviews: data.pageviews ?? 0,
      users: data.users ?? 0,
      bounceRate: data.bounce_rate ?? 0,
      sessionDuration: data.session_duration ?? 0,
      series: ((series.data as Record<string, unknown>[]) ?? []).map((row) => ({
        time: String(row.time ?? ""), users: Number(row.users ?? 0), pageviews: Number(row.pageviews ?? 0),
      })),
      dashboardUrl: `${base}/${site}`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Rybbit недоступен" };
  }
}
