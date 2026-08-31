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
import { envelopeMarkup, introScript } from "@/server/guest-html/invite-intro";
import { decorMarkup, timelineIcon } from "@/server/guest-html/invite-decor";

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
.countdown{display:flex;justify-content:center;gap:1.5rem;margin-top:1.25rem}
.countdown div{min-width:3.25rem}
.countdown b{display:block;font-family:var(--serif);font-size:2rem;font-weight:400;
line-height:1.1;color:var(--fg);font-variant-numeric:tabular-nums}
.countdown span{display:block;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;
color:var(--muted);margin-top:.35rem;font-family:var(--sans)}
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
<body><main class="sheet">${decorMarkup(opts.theme ?? defaultTheme())}${opts.body}</main>${
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

function timeline(content: BlockContentMap["TIMELINE"], theme: InviteTheme): string {
  const items = content.items
    .map((item) => {
      // Значок подбирается по смыслу подписи. Не угадали — значка нет,
      // и это лучше, чем блюдо напротив церемонии.
      const icon = theme.timelineIcons ? timelineIcon(item.title, theme.accent) : "";
      return `<li>${icon}<time>${esc(item.time)}</time><span class="what">${esc(item.title)}
${item.note ? `<span class="note">${esc(item.note)}</span>` : ""}</span></li>`;
    })
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
/**
 * Обратный отсчёт.
 *
 * Разметка приходит с сервера уже посчитанной — приглашение обязано
 * выглядеть законченным и без JavaScript, а на телефоне в дороге он
 * доезжает не всегда. Скрипт, если доехал, только уточняет числа раз в
 * минуту; секунд здесь нет намеренно — они заставляют страницу
 * перерисовываться шестьдесят раз в минуту ради украшения.
 *
 * Дата берётся у мероприятия, а не из блока: две даты в двух местах
 * разойдутся ровно в тот день, когда это важно.
 */
function countdown(content: BlockContentMap["COUNTDOWN"], eventDate: Date): string {
  const left = eventDate.getTime() - Date.now();

  if (left <= 0) {
    return `<section class="center"><h2>${esc(content.title)}</h2>
<p class="pre">${esc(content.doneText)}</p></section>`;
  }

  const minutes = Math.floor(left / 60000);
  const parts = [
    { value: Math.floor(minutes / 1440), unit: "days" },
    { value: Math.floor(minutes / 60) % 24, unit: "hours" },
    { value: minutes % 60, unit: "minutes" },
  ];

  const words: Record<string, [string, string, string]> = {
    days: ["день", "дня", "дней"],
    hours: ["час", "часа", "часов"],
    minutes: ["минута", "минуты", "минут"],
  };

  const cells = parts
    .map(
      (part) =>
        `<div><b data-unit="${part.unit}">${part.value}</b>` +
        `<span data-word="${part.unit}">${plural(part.value, words[part.unit])}</span></div>`,
    )
    .join("");

  return `<section class="center"><h2>${esc(content.title)}</h2>
<div class="countdown" data-until="${eventDate.getTime()}" data-done="${esc(content.doneText)}">${cells}</div></section>`;
}

/** «1 день», «2 дня», «5 дней» — по-русски это три разные формы. */
function plural(value: number, forms: [string, string, string]): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = value % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/**
 * Скрипт отсчёта: уточняет числа раз в минуту. Инлайном и в сто байт —
 * отдельный файл это ещё один запрос по сети, которой в дороге почти нет.
 */
export const COUNTDOWN_SCRIPT = `(function(){var n=document.querySelector('.countdown');if(!n)return;
var W={days:['день','дня','дней'],hours:['час','часа','часов'],minutes:['минута','минуты','минут']};
function f(v,w){var a=v%100;if(a>10&&a<15)return w[2];var b=v%10;return b===1?w[0]:(b>1&&b<5?w[1]:w[2])}
function t(){var l=+n.dataset.until-Date.now();if(l<=0){n.outerHTML='<p class="pre">'+n.dataset.done+'</p>';return}
var m=Math.floor(l/6e4),v={days:Math.floor(m/1440),hours:Math.floor(m/60)%24,minutes:m%60};
for(var k in v){var b=n.querySelector('[data-unit='+k+']'),s=n.querySelector('[data-word='+k+']');
if(b)b.textContent=v[k];if(s)s.textContent=f(v[k],W[k])}}
setInterval(t,6e4)})()`;

/** Есть ли на странице отсчёт: только тогда нужен его скрипт. */
export function hasCountdown(blocks: InviteBlockView[]): boolean {
  return blocks.some((block) => block.type === "COUNTDOWN");
}

/**
 * Все скрипты страницы одной строкой — или ничего, если ни один не нужен.
 *
 * Собрано в одном месте, потому что маршрутов приглашения семь, и
 * «забыли подключить отсчёт на именной странице» — ровно та ошибка,
 * которая обнаруживается у гостя, а не у нас.
 */
export function inviteScript(blocks: InviteBlockView[], theme: InviteTheme, names: string): string | undefined {
  const parts = [
    hasCountdown(blocks) ? COUNTDOWN_SCRIPT : "",
    theme.intro === "envelope" ? introScript(envelopeMarkup(theme, names)) : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(";") : undefined;
}

/** Имена с обложки — их показывает заставка-конверт. */
export function coupleNames(blocks: InviteBlockView[], fallback: string): string {
  const cover = blocks.find((block) => block.type === "COVER");
  if (!cover) return fallback;
  const names = (cover.content as BlockContentMap["COVER"]).names.trim();
  return names || fallback;
}

export function renderBlocks(
  blocks: InviteBlockView[],
  rsvpHref: string | null,
  answered: string | null,
  eventDate?: Date,
  theme: InviteTheme = defaultTheme(),
): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "COUNTDOWN":
          // Без даты мероприятия считать нечего — так бывает только в
          // тестах рендерера, которым блок отдают в одиночку.
          return eventDate
            ? countdown(block.content as BlockContentMap["COUNTDOWN"], eventDate)
            : "";
        case "COVER":
          return cover(block.content as BlockContentMap["COVER"]);
        case "TIMELINE":
          return timeline(block.content as BlockContentMap["TIMELINE"], theme);
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
