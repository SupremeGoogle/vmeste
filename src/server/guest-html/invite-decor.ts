/**
 * Украшения приглашения: цветы по углам, фактура бумаги, вензель рамки,
 * значки расписания.
 *
 * Всё разметкой и стилями, ни одного файла. Причина не в экономии: файл
 * пришлось бы подбирать под каждую палитру и грузить вторым запросом
 * ровно тогда, когда гость уже смотрит на экран.
 */
import { floralCorner, type BotanicalColors } from "@/server/guest-html/botanical";
import type { InviteTheme } from "@/lib/invite-theme";

export function botanicalColors(theme: InviteTheme): BotanicalColors {
  return {
    petal: theme.card,
    petalShade: theme.line,
    leaf: theme.leaf,
    accent: theme.accent,
  };
}

export const DECOR_CSS = `
.decor{position:absolute;width:min(52vw,14rem);height:auto;pointer-events:none;z-index:0}
.decor.tl{top:0;left:0}
.decor.br{bottom:0;right:0;transform:rotate(180deg)}
.decor.tr{top:0;right:0;transform:scaleX(-1)}
.decor.bl{bottom:0;left:0;transform:scaleY(-1)}
.sheet{position:relative;overflow-x:clip}
/* Содержимое поверх цветов, но с воздухом сверху и снизу: без него
   первый же раздел накрывает верхний угол, и от букета остаётся полоска.
   Именно так это и выглядело в первой версии. */
.sheet>section,.sheet>form,.sheet>p,.sheet>div{position:relative;z-index:1}
.sheet{padding-top:3.25rem;padding-bottom:3.25rem}
.cover{padding-top:1rem}
@media(max-width:26rem){.decor{width:58vw}.sheet{padding-top:2.5rem;padding-bottom:2.5rem}}
`;

/**
 * Бумага: тёплое зерно и виньетка по краям.
 *
 * Зерно — повторяющийся градиент под очень острым углом: он даёт
 * неровность, которую глаз читает как волокно, и стоит браузеру ноль.
 * Настоящая текстура картинкой стоила бы 200 КБ и одинакового узора на
 * всех приглашениях сразу.
 */
export const PAPER_CSS = `
body{background-image:
repeating-linear-gradient(97deg,rgba(0,0,0,.012) 0 1px,transparent 1px 3px),
repeating-linear-gradient(7deg,rgba(0,0,0,.010) 0 1px,transparent 1px 4px)}
.sheet{background-image:radial-gradient(120% 70% at 50% 0%,rgba(255,255,255,.55),transparent 60%),
radial-gradient(100% 60% at 50% 100%,rgba(0,0,0,.028),transparent 55%)}
`;

/** Вензель в углах рамки: завиток из двух дуг и точки. */
export const ORNAMENT_CSS = `
.sheet::after{content:"";position:absolute;inset:.75rem;pointer-events:none;z-index:2;
border:0;background-repeat:no-repeat;background-size:2.25rem 2.25rem;
background-position:left top,right top,left bottom,right bottom}
`;

export function ornamentBackground(theme: InviteTheme): string {
  // Вензель рисуется один раз и подставляется во все четыре угла
  // отражениями — иначе четыре разных завитка не сойдутся.
  const stroke = encodeURIComponent(theme.accent);
  const svg =
    `%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'%3E` +
    `%3Cpath d='M1 13 C1 5 5 1 13 1' fill='none' stroke='${stroke}' stroke-width='1'/%3E` +
    `%3Cpath d='M1 21 C1 9 9 1 21 1' fill='none' stroke='${stroke}' stroke-width='0.6' opacity='0.6'/%3E` +
    `%3Ccircle cx='6' cy='6' r='1.4' fill='${stroke}' opacity='0.8'/%3E%3C/svg%3E`;

  const url = `url("data:image/svg+xml,${svg}")`;
  return `.sheet::after{background-image:${url},${url},${url},${url};` +
    `transform:none}` +
    `.sheet::after{background-position:left top,right top,left bottom,right bottom}`;
}

/**
 * Разметка цветов по углам — по выбранной раскладке.
 *
 * Композиция рисуется ОДИН раз в `<symbol>`, а по углам расставляются
 * ссылки на неё. Вставлять её в каждый угол целиком означало бы четыре
 * копии одного и того же в исходном коде страницы — тридцать лишних
 * килобайт на приглашении, которое открывают с телефона в дороге.
 */
export function decorMarkup(theme: InviteTheme): string {
  if (theme.decor === "none") return "";

  const definition =
    `<svg width="0" height="0" aria-hidden="true" style="position:absolute">` +
    `<symbol id="fc" viewBox="0 0 200 200">${floralCorner(botanicalColors(theme))}</symbol></svg>`;

  const corner = (position: string) =>
    `<svg class="decor ${position}" viewBox="0 0 200 200" aria-hidden="true"><use href="#fc"/></svg>`;

  // По диагонали — два угла: так делают на бумажных приглашениях, чтобы
  // не запирать текст в венок со всех сторон.
  const corners =
    theme.decor === "corners"
      ? corner("tl") + corner("br")
      : corner("tl") + corner("tr") + corner("bl") + corner("br");

  return definition + corners;
}

/**
 * Значок к пункту расписания — по смыслу подписи.
 *
 * Слова, а не порядковый номер: пункты переставляют, добавляют и
 * удаляют, и значок, привязанный к позиции, поедет вместе с ними.
 * Не угадали — значка нет, и это лучше, чем блюдо напротив церемонии.
 */
export function timelineIcon(title: string, color: string): string {
  const text = title.toLowerCase();

  const has = (...words: string[]) => words.some((word) => text.includes(word));
  const line = `fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round"`;

  let art: string | null = null;

  if (has("церемони", "роспис", "регистрац", "венчан", "клятв")) {
    art = `<circle cx="9" cy="12" r="5" ${line}/><circle cx="15" cy="12" r="5" ${line}/>`;
  } else if (has("сбор", "фуршет", "welcome", "велком", "аперитив", "встреч")) {
    art = `<path d="M7 5h5l-1 6a1.5 1.5 0 0 1-3 0z" ${line}/><path d="M9.5 11v7M7.5 18h4" ${line}/>` +
      `<path d="M14 5h5l-1 6a1.5 1.5 0 0 1-3 0z" ${line}/><path d="M16.5 11v7M14.5 18h4" ${line}/>`;
  } else if (has("ужин", "банкет", "обед", "стол", "угощ")) {
    art = `<path d="M4 15a8 5 0 0 1 16 0z" ${line}/><path d="M3 18h18" ${line}/><circle cx="12" cy="7" r="1" ${line}/>`;
  } else if (has("танец", "танцы", "дискотек", "первый танец")) {
    art = `<circle cx="9" cy="6" r="2" ${line}/><path d="M9 8v6l-2 6M9 14l3 6" ${line}/>` +
      `<circle cx="16" cy="6" r="2" ${line}/><path d="M16 8v6l2 6M16 14l-2 6" ${line}/>`;
  } else if (has("торт", "десерт", "сладк")) {
    art = `<path d="M5 20v-6h14v6z" ${line}/><path d="M7 14v-3h10v3" ${line}/><path d="M12 11V7" ${line}/>`;
  } else if (has("фото", "съём", "съем")) {
    art = `<rect x="4" y="8" width="16" height="11" rx="2" ${line}/><circle cx="12" cy="13.5" r="3.5" ${line}/>`;
  } else if (has("салют", "фейерверк", "заверш", "оконч", "финал")) {
    art = `<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M18 18l-3-3M18 6l-3 3M6 18l3-3" ${line}/>`;
  }

  if (!art) return "";
  return `<svg class="tico" viewBox="0 0 24 24" aria-hidden="true">${art}</svg>`;
}

export const TIMELINE_ICON_CSS = `
.tico{display:block;width:1.5rem;height:1.5rem;margin:0 auto .5rem}
.timeline li{position:relative}
`;
