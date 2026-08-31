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
 * Палитра и шрифты — общие (`guest-html/theme.ts`), разная только плотность:
 * у входа в зал задача «прочитать номер стола за три секунды», здесь —
 * «прочитать приглашение и не поморщиться». Поэтому тут антиква в теле
 * текста, крупные поля и воздух, а там гротеск и плотная вёрстка.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { BASE_CSS } from "@/server/guest-html/theme";
import { inviteThemeCss } from "@/server/guest-html/invite-theme-css";
import { defaultTheme, type InviteTheme } from "@/lib/invite-theme";

const CSS = (BASE_CSS + `
body{font:17px/1.65 var(--serif)}
.sheet{max-width:34rem;margin:0 auto;background:var(--card);min-height:100vh;
box-shadow:0 1px 60px rgba(43,38,34,.07)}
.who{margin:0;padding:2.25rem 1.5rem 0;text-align:center;font-size:.75rem;letter-spacing:.2em;
text-transform:uppercase;color:var(--muted);font-family:var(--sans)}
.ok{margin:0;padding:.875rem 1.5rem;background:var(--accent);color:#fff;text-align:center;
font-size:.9375rem;font-family:var(--sans)}
section{padding:2.25rem 1.5rem}
.cover{padding-top:2.75rem;text-align:center}
.cover img{display:block;width:100%;height:auto;margin:0 0 1.75rem}
.names{margin:0;font-size:1.375rem;letter-spacing:.22em;text-transform:uppercase;font-weight:400;
font-family:var(--serif)}
h1{margin:.75rem 0 0;font-size:2.125rem;line-height:1.15}
.date{margin:1rem 0 0;font-size:1.0625rem;color:var(--muted);letter-spacing:.04em}
h2{margin:0 0 1.5rem;text-align:center;font-size:1.3125rem}
h2::after{content:"";display:block;width:2.5rem;height:1px;background:var(--line);margin:.75rem auto 0}
p{margin:0}
.center{text-align:center}
.pre{white-space:pre-line}
.muted{color:var(--muted)}
.small{font-size:.9375rem}
.timeline{list-style:none;margin:0;padding:0}
.timeline li{display:flex;gap:1.25rem;margin-bottom:1.125rem}
.timeline time{flex:0 0 3.5rem;text-align:right;font-family:var(--mono);
font-size:.875rem;color:var(--muted);padding-top:.3rem;letter-spacing:.02em}
.timeline .what{border-left:1px solid var(--line);padding-left:1.25rem}
.timeline .note{display:block;font-size:.875rem;color:var(--muted)}
.palette{display:flex;gap:.875rem;justify-content:center;margin-top:1.5rem}
.swatch{width:2.5rem;height:2.5rem;border-radius:50%;border:1px solid var(--line)}
.links{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.25rem;
padding:0 1.5rem}
.links a{display:inline-block;padding:.65rem 1.5rem;border:1px solid var(--line);border-radius:999px;
color:var(--fg);text-decoration:none;font-size:.9375rem;font-family:var(--sans);background:var(--card)}
.cta{display:inline-block;margin-top:1.5rem;padding:.95rem 2.25rem;background:var(--accent);color:#fff;
border-radius:999px;text-decoration:none;font-size:1.0625rem;font-family:var(--sans)}
.foot{padding:0 1.5rem 3.5rem;text-align:center;color:var(--muted);font-size:.9375rem}
.foot a{color:var(--muted)}
form{padding:0 1.5rem 2.5rem;max-width:34rem;margin:0 auto}
fieldset{border:0;margin:0 0 1.75rem;padding:0}
legend{padding:0;margin-bottom:.875rem;font-size:.9375rem;color:var(--muted);font-family:var(--sans)}
.choice{display:flex;align-items:center;gap:.875rem;padding:.95rem 1.125rem;border:1px solid var(--line);
border-radius:.875rem;margin-bottom:.5rem;background:var(--bg);cursor:pointer;font-family:var(--sans);
font-size:1rem}
.choice:has(input:checked){border-color:var(--accent);background:var(--card)}
.field{display:block;margin-bottom:1.5rem}
.field span{display:block;margin-bottom:.5rem;font-size:.9375rem;color:var(--muted);
font-family:var(--sans)}
.field input,.field textarea{width:100%;padding:.95rem 1.125rem;font-family:var(--sans);
font-size:1.0625rem;color:var(--fg);background:var(--card);border:1px solid var(--line);
border-radius:.875rem;outline:none}
.field input:focus,.field textarea:focus{border-color:var(--accent)}
.submit{width:100%;padding:1.05rem;font-family:var(--sans);font-size:1.0625rem;color:#fff;
background:var(--accent);border:0;border-radius:999px;cursor:pointer}
.submit:active{background:var(--accent-deep)}
.error{margin:0 1.5rem 1.5rem;padding:.875rem 1.125rem;background:var(--alarm-bg);
border:1px solid #f0c9c9;border-radius:.875rem;font-size:.9375rem;color:var(--alarm);
font-family:var(--sans)}
`).replace(/\n/g, "");

export function invitePage(opts: {
  title: string;
  body: string;
  noindex?: boolean;
  /**
   * Оформление мероприятия. Идёт после базового CSS и перекрывает его —
   * поэтому здесь не нужны `!important`, и базовые правила остаются
   * читаемыми. Без темы страница выглядит как раньше.
   */
  theme?: InviteTheme;
  /** Дополнительные стили страницы — например, для загрузчика фотографий. */
  extraCss?: string;
  /** Свой скрипт инлайном. Отдельный файл — ещё один запрос по сети,
   *  которой в зале почти нет. */
  script?: string;
}): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${opts.noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}
<meta name="theme-color" content="${esc((opts.theme ?? defaultTheme()).bg)}">
<title>${esc(opts.title)}</title><style>${CSS}${inviteThemeCss(opts.theme ?? defaultTheme())}${opts.extraCss ?? ""}</style></head>
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
