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

/** Экранирование: в HTML попадают имена гостей, введённые организатором. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** CSS инлайном: отдельный файл это ещё один запрос по сети, которой нет. */
const CSS = `
:root{--bg:#f8f5f0;--fg:#2b2622;--muted:#7a7068;--line:#e3dcd2;--accent:#8b6f47;--card:#fffdfa}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);
font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}
.wrap{max-width:30rem;margin:0 auto;padding:2rem 1.25rem 4rem}
.eyebrow{font-size:.8125rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 .5rem}
h1{font-size:1.625rem;line-height:1.25;margin:0 0 .25rem;font-weight:600}
.sub{color:var(--muted);margin:0 0 2rem}
label{display:block;font-size:.9375rem;color:var(--muted);margin-bottom:.5rem}
input[type=text]{width:100%;padding:.875rem 1rem;font-size:1.125rem;font-family:inherit;color:var(--fg);
background:var(--card);border:1px solid var(--line);border-radius:.625rem;outline:none}
input[type=text]:focus{border-color:var(--accent)}
button{width:100%;margin-top:.75rem;padding:.875rem 1rem;font-size:1.0625rem;font-family:inherit;
font-weight:500;color:#fff;background:var(--accent);border:0;border-radius:.625rem;cursor:pointer}
.hint{font-size:.875rem;color:var(--muted);margin-top:1.25rem}
.result{background:var(--card);border:1px solid var(--line);border-radius:.875rem;padding:1.5rem;margin-top:1.5rem}
.table-label{font-size:3rem;font-weight:600;line-height:1.1;margin:.25rem 0 0}
.matches{list-style:none;margin:1.5rem 0 0;padding:0}
.matches li{margin-bottom:.625rem}
.matches a{display:block;padding:.875rem 1rem;background:var(--card);border:1px solid var(--line);
border-radius:.625rem;color:var(--fg);text-decoration:none;font-size:1.0625rem}
.note{background:#fff6e5;border:1px solid #e8d5a8;border-radius:.625rem;padding:.75rem 1rem;
font-size:.875rem;margin-bottom:1.25rem}
a{color:var(--accent)}
`.replace(/\n/g, "");

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
