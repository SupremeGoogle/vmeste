/**
 * Гостевые страницы входа собираются здесь вручную, без React.
 *
 * Почему не JSX и не компоненты Next: App Router на любой странице отдаёт
 * рантайм React — это 170 КБ при бюджете 150 КБ на всё. Замеры на живом
 * сервере: страница с формой на React — 173 КБ, эта же страница строкой HTML
 * с инлайновым CSS — около 4 КБ и один запрос вместо девяти.
 *
 * Требование «вес меньше 150 КБ, на площадках связи почти нет» — жёсткое,
 * и вход в зал это самый рискованный сценарий сервиса. Поэтому здесь
 * сознательно нет фреймворка. Остальные гостевые страницы (приглашение)
 * останутся на React — их открывают дома, а не в дверях зала.
 */

import { BASE_CSS } from "@/server/guest-html/theme";

/** Экранирование: в HTML попадают имена гостей, введённые организатором. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * CSS инлайном: отдельный файл — ещё один запрос по сети, которой нет.
 * Палитра и шрифты общие со всем остальным (`guest-html/theme.ts`):
 * гость не должен видеть три разных продукта, переходя с QR-страницы
 * на приглашение.
 */
const CSS = (BASE_CSS + `
body{font:17px/1.55 var(--sans)}
.wrap{max-width:30rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
.eyebrow{font-size:.75rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);
margin:0 0 .75rem;text-align:center;font-family:var(--sans)}
h1{font-size:1.875rem;line-height:1.2;margin:0 0 .5rem;text-align:center}
.sub{color:var(--muted);margin:0 0 2rem;text-align:center}
label{display:block;font-size:.9375rem;color:var(--muted);margin-bottom:.5rem}
input[type=text]{width:100%;padding:.875rem 1rem;font-size:1.125rem;font-family:inherit;color:var(--fg);
background:var(--card);border:1px solid var(--line);border-radius:.75rem;outline:none}
input[type=text]:focus{border-color:var(--accent)}
button{width:100%;margin-top:.75rem;padding:.9rem 1rem;font-size:1.0625rem;font-family:var(--sans);
font-weight:500;color:#fff;background:var(--accent);border:0;border-radius:999px;cursor:pointer}
button:active{background:var(--accent-deep)}
.plan{display:block;width:100%;height:auto;margin:1.5rem 0 0;background:var(--card);
border:1px solid var(--line);border-radius:1rem}
.claims{margin:1.5rem 0 0;display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}
.claim{width:auto;margin:0;appearance:none;border:1px solid var(--line);background:var(--card);
border-radius:999px;padding:.6rem 1.25rem;font:inherit;font-family:var(--sans);font-size:.9375rem;
font-weight:400;color:var(--fg);cursor:pointer}
.claim:active{background:var(--bg)}
.hint{font-size:.875rem;color:var(--muted);margin-top:1.5rem;text-align:center}
.result{background:var(--card);border:1px solid var(--line);border-radius:1.25rem;padding:2rem 1.5rem;
margin-top:1.75rem;text-align:center}
.table-label{font-family:var(--serif);font-size:3.25rem;font-weight:500;line-height:1.1;margin:.5rem 0 0}
.matches{list-style:none;margin:1.75rem 0 0;padding:0}
.matches li{margin-bottom:.625rem}
.matches a{display:block;padding:1rem 1.25rem;background:var(--card);border:1px solid var(--line);
border-radius:.875rem;color:var(--fg);text-decoration:none;font-size:1.0625rem}
.note{background:var(--warn-bg);border:1px solid #e8d5a8;border-radius:.875rem;padding:.75rem 1rem;
font-size:.875rem;margin-bottom:1.25rem;color:var(--warn)}
`).replace(/\n/g, "");

export function page(opts: { title: string; body: string; script?: string }): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#f8f5f0">
<title>${esc(opts.title)}</title><style>${CSS}</style></head>
<body><main class="wrap">${opts.body}</main>${opts.script ? `<script>${opts.script}</script>` : ""}</body></html>`;
}

export function html(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}
