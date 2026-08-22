/**
 * Приглашение строкой HTML — без React.
 *
 * Замер, ради которого это переписано: та же страница на серверных
 * компонентах отдавалась в 179 КБ gzip, из которых своей разметки 5 КБ,
 * а остальное — рантайм React и роутера. Интерактивности на приглашении
 * нет вовсе: его читают, а единственное действие — форма ответа, которая
 * прекрасно работает обычным POST. Платить за гидрацию страницы, где
 * нечего гидрировать, незачем — тем более что открывают её с телефона,
 * иногда в дороге.
 *
 * Стиль отдельный от страниц входа в зал: у входа задача «прочитать номер
 * стола за три секунды», здесь — «прочитать приглашение и не поморщиться».
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";

const CSS = `
:root{--bg:#f6f3ee;--fg:#241f1b;--muted:#7c7168;--line:#e2dad0;--card:#fffefb;--accent:#8b6f47}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);
font:17px/1.6 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;-webkit-text-size-adjust:100%}
.sheet{max-width:34rem;margin:0 auto;background:var(--card);min-height:100vh;
box-shadow:0 1px 40px rgba(36,31,27,.06)}
.who{margin:0;padding:2rem 1.5rem 0;text-align:center;font-size:.8125rem;letter-spacing:.16em;
text-transform:uppercase;color:var(--muted);font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.ok{margin:0;padding:.875rem 1.5rem;background:var(--fg);color:#fff;text-align:center;font-size:.9375rem}
section{padding:2rem 1.5rem}
.cover{padding-top:2.5rem;text-align:center}
.cover img{display:block;width:100%;height:auto;margin:0 0 1.5rem}
.names{margin:0;font-size:1.5rem;letter-spacing:.18em;text-transform:uppercase;font-weight:400}
h1{margin:.5rem 0 0;font-size:2rem;font-weight:500;line-height:1.2}
.date{margin:.75rem 0 0;font-size:1.125rem;color:var(--muted)}
h2{margin:0 0 1.25rem;text-align:center;font-size:1.25rem;font-weight:500;letter-spacing:.02em}
p{margin:0}
.center{text-align:center}
.pre{white-space:pre-line}
.muted{color:var(--muted)}
.small{font-size:.9375rem}
.timeline{list-style:none;margin:0;padding:0}
.timeline li{display:flex;gap:1rem;margin-bottom:1rem}
.timeline time{flex:0 0 3.5rem;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
font-size:.9375rem;color:var(--muted);padding-top:.15rem}
.timeline .what{border-left:1px solid var(--line);padding-left:1rem}
.timeline .note{display:block;font-size:.875rem;color:var(--muted)}
.palette{display:flex;gap:.75rem;justify-content:center;margin-top:1.25rem}
.swatch{width:2.25rem;height:2.25rem;border-radius:50%;border:1px solid var(--line)}
.links{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1rem}
.links a{display:inline-block;padding:.6rem 1.25rem;border:1px solid var(--line);border-radius:999px;
color:var(--fg);text-decoration:none;font-size:.9375rem}
.cta{display:inline-block;margin-top:1.25rem;padding:.9rem 2rem;background:var(--fg);color:#fff;
border-radius:999px;text-decoration:none;font-size:1.0625rem}
.foot{padding:0 1.5rem 3rem;text-align:center;color:var(--muted);font-size:.9375rem}
.foot a{color:var(--muted)}
a{color:var(--accent)}
form{padding:0 1.5rem 2rem;max-width:34rem;margin:0 auto}
fieldset{border:0;margin:0 0 1.5rem;padding:0}
legend{padding:0;margin-bottom:.75rem;font-size:.9375rem;color:var(--muted);
font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.choice{display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem;border:1px solid var(--line);
border-radius:.75rem;margin-bottom:.5rem;background:var(--card);cursor:pointer}
.field{display:block;margin-bottom:1.25rem}
.field span{display:block;margin-bottom:.5rem;font-size:.9375rem;color:var(--muted);
font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.field input,.field textarea{width:100%;padding:.875rem 1rem;font:inherit;font-size:1.0625rem;
color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:.75rem;outline:none}
.field input:focus,.field textarea:focus{border-color:var(--accent)}
.submit{width:100%;padding:1rem;font:inherit;font-size:1.0625rem;color:#fff;background:var(--fg);
border:0;border-radius:999px;cursor:pointer}
.error{margin:0 1.5rem 1.5rem;padding:.875rem 1rem;background:#fdeeee;border:1px solid #f0c9c9;
border-radius:.75rem;font-size:.9375rem;color:#8a2b2b}
`.replace(/\n/g, "");

export function invitePage(opts: {
  title: string;
  body: string;
  noindex?: boolean;
  /** Дополнительные стили страницы — например, для загрузчика фотографий. */
  extraCss?: string;
  /** Свой скрипт инлайном. Отдельный файл — ещё один запрос по сети,
   *  которой в зале почти нет. */
  script?: string;
}): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${opts.noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}
<meta name="theme-color" content="#f6f3ee">
<title>${esc(opts.title)}</title><style>${CSS}${opts.extraCss ?? ""}</style></head>
<body><main class="sheet">${opts.body}</main>${
    opts.script ? `<script>${opts.script}</script>` : ""
  }</body></html>`;
}

/** Пользовательский текст: переносы строк сохраняем, разметку — нет. */
function paragraphs(text: string, className = ""): string {
  if (!text.trim()) return "";
  return `<p class="pre center ${className}">${esc(text)}</p>`;
}

function cover(content: BlockContentMap["COVER"]): string {
  return `<section class="cover">
${content.imageUrl ? `<img src="${esc(content.imageUrl)}" alt="">` : ""}
${content.names ? `<p class="names">${esc(content.names)}</p>` : ""}
<h1>${esc(content.title)}</h1>
${content.dateText ? `<p class="date">${esc(content.dateText)}</p>` : ""}
${paragraphs(content.subtitle, "muted")}
</section>`;
}

function timeline(content: BlockContentMap["TIMELINE"]): string {
  const items = content.items
    .map(
      (item) => `<li><time>${esc(item.time)}</time><span class="what">${esc(item.title)}
${item.note ? `<span class="note">${esc(item.note)}</span>` : ""}</span></li>`,
    )
    .join("");
  return `<section><h2>${esc(content.title)}</h2><ul class="timeline">${items}</ul></section>`;
}

function venue(content: BlockContentMap["VENUE"]): string {
  return `<section><h2>${esc(content.title)}</h2>
${content.name ? `<p class="center">${esc(content.name)}</p>` : ""}
${paragraphs(content.address, "small muted")}
${paragraphs(content.note, "small")}
</section>`;
}

function dresscode(content: BlockContentMap["DRESSCODE"]): string {
  const swatches = content.palette
    .map((color) => `<span class="swatch" style="background:${esc(color)}"></span>`)
    .join("");
  return `<section><h2>${esc(content.title)}</h2>${paragraphs(content.text)}
${swatches ? `<div class="palette">${swatches}</div>` : ""}</section>`;
}

function mapBlock(content: BlockContentMap["MAP"]): string {
  const links = [
    { url: content.yandexUrl, label: "Яндекс Карты" },
    { url: content.googleUrl, label: "Google Maps" },
  ]
    .filter((link) => link.url)
    .map(
      (link) =>
        `<a href="${esc(link.url)}" target="_blank" rel="noreferrer noopener">${link.label}</a>`,
    )
    .join("");

  return `<section><h2>${esc(content.title)}</h2>${paragraphs(content.note, "small")}
${links ? `<div class="links">${links}</div>` : ""}</section>`;
}

function textBlock(content: BlockContentMap["TEXT"]): string {
  return `<section>${content.title ? `<h2>${esc(content.title)}</h2>` : ""}
${paragraphs(content.text)}</section>`;
}

function rsvpCall(
  content: BlockContentMap["RSVP_FORM"],
  href: string | null,
  answered: string | null,
): string {
  const action = answered
    ? `<p class="center" style="margin-top:1.25rem">Ваш ответ: <b>${esc(answered)}</b>${
        href ? ` · <a href="${esc(href)}">изменить</a>` : ""
      }</p>`
    : href
      ? `<p class="center"><a class="cta" href="${esc(href)}">${esc(content.buttonLabel)}</a></p>`
      : `<p class="center small muted" style="margin-top:1.25rem">Ответить можно по именной ссылке из приглашения.</p>`;

  return `<section><h2>${esc(content.title)}</h2>${paragraphs(content.text)}${action}</section>`;
}

/**
 * Собрать блоки в HTML.
 *
 * @param rsvpHref ссылка на форму ответа; null на неименной странице.
 * @param answered уже данный ответ словами.
 */
export function renderBlocks(
  blocks: InviteBlockView[],
  rsvpHref: string | null,
  answered: string | null,
): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "COVER":
          return cover(block.content as BlockContentMap["COVER"]);
        case "TIMELINE":
          return timeline(block.content as BlockContentMap["TIMELINE"]);
        case "VENUE":
          return venue(block.content as BlockContentMap["VENUE"]);
        case "DRESSCODE":
          return dresscode(block.content as BlockContentMap["DRESSCODE"]);
        case "MAP":
          return mapBlock(block.content as BlockContentMap["MAP"]);
        case "TEXT":
          return textBlock(block.content as BlockContentMap["TEXT"]);
        case "RSVP_FORM":
          return rsvpCall(block.content as BlockContentMap["RSVP_FORM"], rsvpHref, answered);
      }
    })
    .join("");
}
