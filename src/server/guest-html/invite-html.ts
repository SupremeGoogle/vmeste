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
import { personalizeBlocks } from "@/lib/invite-personalization";
import { personalizeMarkup } from "@/server/guest-html/personalization";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { BASE_CSS } from "@/server/guest-html/theme";
import { inviteThemeCss } from "@/server/guest-html/invite-theme-css";
import { defaultTheme, type InviteTheme } from "@/lib/invite-theme";
import { envelopeMarkup, introScript } from "@/server/guest-html/invite-intro";
import { decorMarkup, timelineIcon } from "@/server/guest-html/invite-decor";
import { renderConstellationBlocks } from "@/server/guest-html/constellation/markup";
import { CONSTELLATION_SCRIPT } from "@/server/guest-html/constellation/script";
import { renderEvergreenBlocks } from "@/server/guest-html/evergreen/markup";
import { EVERGREEN_SCRIPT } from "@/server/guest-html/evergreen/script";
import { renderSilkBlocks } from "@/server/guest-html/silk/markup";
import { SILK_SCRIPT } from "@/server/guest-html/silk/script";
import { renderPearlBlocks } from "@/server/guest-html/pearl/markup";
import { PEARL_SCRIPT } from "@/server/guest-html/pearl/script";
import { renderPrismBlocks } from "@/server/guest-html/prism/markup";
import { renderVinylBlocks } from "@/server/guest-html/vinyl/markup";
import { VINYL_SCRIPT } from "@/server/guest-html/vinyl/script";
import { VINYL_FONTS_LINK } from "@/server/guest-html/vinyl/style";
import { renderAquarelleBlocks } from "@/server/guest-html/aquarelle/markup";
import { aquarelleScript } from "@/server/guest-html/aquarelle/script";
import { AQUARELLE_FONTS_LINK } from "@/server/guest-html/aquarelle/style";
import { renderLilyBlocks } from "@/server/guest-html/lily/markup";
import { LILY_SCRIPT } from "@/server/guest-html/lily/script";
import { LILY_FONTS_LINK } from "@/server/guest-html/lily/style";
import { renderBohemaBlocks } from "@/server/guest-html/bohema/markup";
import { BOHEMA_SCRIPT } from "@/server/guest-html/bohema/script";
import { BOHEMA_FONTS_LINK } from "@/server/guest-html/bohema/style";
import { renderKraskiBlocks } from "@/server/guest-html/kraski/markup";
import { KRASKI_SCRIPT } from "@/server/guest-html/kraski/script";
import { KRASKI_FONTS_LINK } from "@/server/guest-html/kraski/style";
import { renderSerdceBlocks } from "@/server/guest-html/serdce/markup";
import { SERDCE_SCRIPT } from "@/server/guest-html/serdce/script";
import { SERDCE_FONTS_LINK } from "@/server/guest-html/serdce/style";
import { renderAnticBlocks } from "@/server/guest-html/antic/markup";
import { ANTIC_SCRIPT } from "@/server/guest-html/antic/script";
import { ANTIC_FONTS_LINK } from "@/server/guest-html/antic/style";
import { renderSkvozVremyaBlocks } from "@/server/guest-html/skvoz-vremya/markup";
import { renderScrapbookBlocks } from "@/server/guest-html/scrapbook/markup";
import { SCRAPBOOK_SCRIPT } from "@/server/guest-html/scrapbook/script";
import { SCRAPBOOK_FONTS_LINK } from "@/server/guest-html/scrapbook/style";
import { isEditorialTemplate } from "@/lib/invite-templates/editorial";
import { renderEditorialBlocks } from "@/server/guest-html/editorial/markup";
import { EDITORIAL_SCRIPT } from "@/server/guest-html/editorial/script";
import { EDITORIAL_FONTS_LINK } from "@/server/guest-html/editorial/style";
import { SKVOZ_VREMYA_SCRIPT } from "@/server/guest-html/skvoz-vremya/script";
import { SKVOZ_VREMYA_FONTS_LINK } from "@/server/guest-html/skvoz-vremya/style";
import { renderBurgundyBlocks } from "@/server/guest-html/burgundy/markup";
import { BURGUNDY_SCRIPT } from "@/server/guest-html/burgundy/script";
import { BURGUNDY_FONTS_LINK } from "@/server/guest-html/burgundy/style";
import { renderRoseraieBlocks } from "@/server/guest-html/roseraie/markup";
import { ROSERAIE_SCRIPT } from "@/server/guest-html/roseraie/script";
import { ROSERAIE_FONTS_LINK } from "@/server/guest-html/roseraie/style";
import { renderFloralGardenBlocks } from "@/server/guest-html/floral-garden/markup";
import { FLORAL_GARDEN_SCRIPT } from "@/server/guest-html/floral-garden/script";
import { FLORAL_GARDEN_FONTS_LINK } from "@/server/guest-html/floral-garden/style";
import { renderIskraBlocks } from "@/server/guest-html/iskra/markup";
import { ISKRA_SCRIPT } from "@/server/guest-html/iskra/script";
import { PRISM_SCRIPT } from "@/server/guest-html/prism/script";
import { renderRubyBlocks } from "@/server/guest-html/ruby/markup";
import { RUBY_SCRIPT } from "@/server/guest-html/ruby/script";
import { renderTuscanyBlocks } from "@/server/guest-html/tuscany/markup";
import { TUSCANY_SCRIPT } from "@/server/guest-html/tuscany/script";
import { renderTiliBlocks, type TiliRsvp } from "@/server/guest-html/tili/markup";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";
import { renderWithWishlist, type WishlistData } from "@/server/guest-html/wishlist";
import { withTemplateLabels } from "@/server/guest-html/template-labels";
import { styleDocument } from "@/server/guest-html/invite-style";
import { inviteControlsCss } from "@/server/guest-html/invite-controls-css";
import { FIT_TEXT_SCRIPT } from "@/server/guest-html/fit-text";
import { errorReporterScript } from "@/server/guest-html/error-reporter";
import { rybbitScriptTag } from "@/server/analytics/rybbit";
import { inlineRsvpForm, withInlineRsvp } from "@/server/guest-html/inline-rsvp-form";
import { countdownCells, COUNTDOWN_SCRIPT as SHARED_COUNTDOWN_SCRIPT } from "@/server/guest-html/countdown";
import { isWedwedTemplate, renderWedwedBlocks, wedwedDocument } from "@/server/guest-html/wedwed/markup";
import { WEDWED_SCRIPT } from "@/server/guest-html/wedwed/script";
import { PREMIUM_MOTION_CSS, PREMIUM_MOTION_SCRIPT } from "@/server/guest-html/motion-enhancements";
import { floorFontSizes, MAP_LINK_TAP_CSS, MOBILE_DENSITY_CSS } from "@/server/guest-html/mobile-density";
import { TABLET_DENSITY_CSS } from "@/server/guest-html/tablet-density";
import { composeInviteComponents } from "@/server/guest-html/invite-components";

const NO_EDIT = editAttrs("", false);
import { TILI_CSS, TILI_FONTS_LINK } from "@/server/guest-html/tili/style";
import { TILI_HEAD_SCRIPT, TILI_SCRIPT } from "@/server/guest-html/tili/script";

/**
 * Что ещё знает рендерер, кроме блоков.
 *
 *   editable — страница открыта в визуальном редакторе: поля помечаются,
 *              заставки и анимации, мешающие править, выключены;
 *   rsvp     — анкета прямо на странице (шаблоны, у которых она есть):
 *              кто отвечает и что уже ответил.
 */
export type RenderOptions = { editable?: boolean; rsvp?: TiliRsvp | null; wishlist?: WishlistData | null; wishlistPage?: boolean };

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
.polaroids{display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem;margin-top:.5rem}
.polaroid{background:#fff;padding:.6rem .6rem 1rem;box-shadow:0 .5rem 1.5rem rgba(43,38,34,.14);
width:9.5rem;text-align:center;transition:transform .4s ease}
.polaroid.p1{transform:rotate(-4deg)}
.polaroid.p2{transform:rotate(3deg)}
.polaroid img{display:block;width:100%;height:9.5rem;object-fit:cover}
.polaroid-empty{display:block;width:100%;height:9.5rem;background:var(--line)}
.polaroid figcaption{margin-top:.6rem;font-family:var(--serif);font-style:italic;font-size:.8125rem;
color:var(--muted);line-height:1.35}
.cal-card{max-width:20rem;margin:1.25rem auto 0;padding:1.5rem 1rem;border:1px solid var(--line);
border-radius:var(--radius)}
.cal-month{margin:0 0 1rem;font-family:var(--serif);font-size:1.0625rem;letter-spacing:.06em}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.35rem;font-size:.8125rem}
.dn{color:var(--muted);font-size:.6875rem;letter-spacing:.08em;padding:.25rem 0}
.d{padding:.3rem 0}
.d-empty{visibility:hidden}
.d-marked{color:#fff;background:var(--accent);border-radius:999px}
.big-date{margin-top:1.5rem;font-family:var(--serif);font-style:italic;font-size:2rem;letter-spacing:.06em}
.js-reveal .sheet>section{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}
.js-reveal .sheet>section.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.js-reveal .sheet>section{transition:none;opacity:1;transform:none}}
`).replace(/\n/g, "");

/**
 * Заставки шаблонов: что прятать и какую кнопку «нажать», если заставку
 * выключили. Нажимаем настоящую кнопку, а не просто прячем слой: шаблон сам
 * снимает блокировку прокрутки и запускает свои анимации — как после
 * нажатия гостя.
 */
export const TEMPLATE_INTROS: Record<string, { hide: string; open: string; extra?: string }> = {
  gazette: { hide: ".ed-intro", open: ".ed-open" },
  protokol: { hide: ".ed-intro", open: ".ed-open" },
  postcard: { hide: ".ed-intro", open: ".ed-open" },
  zefir: { hide: ".sb-intro", open: ".sb-open" },
  crayon: { hide: ".sb-intro", open: ".sb-open" },
  iskra: { hide: ".ik-intro", open: ".ik-open" },
  bohema: { hide: ".bo-intro-cover", open: ".bo-open" },
  burgundy: { hide: ".bw-envelope", open: ".bw-envelope" },
  roseraie: { hide: ".rr-intro", open: ".rr-envelope" },
  // Пластинку дорисовывает скрипт шаблона; щелчок по ней же и открывает.
  vinyl: { hide: "#vinyl-intro", open: "#vinyl-intro" },
  // Без заставки содержимое не проявляется после конверта, а стоит сразу.
  tili: { hide: "#cover", open: "#cover", extra: ".main-content{opacity:1!important;transition:none!important}" },
};

export function hasTemplateIntro(template: string | undefined): boolean {
  return Boolean(template && TEMPLATE_INTROS[template]);
}

/** Стили, прячущие выключенную заставку ещё до первой отрисовки. */
function introOffCss(theme: InviteTheme | undefined): string {
  const intro = theme?.introOff ? TEMPLATE_INTROS[theme.template] : undefined;
  return intro ? `${intro.hide}{display:none!important}${intro.extra ?? ""}` : "";
}

export function invitePage(opts: Parameters<typeof buildInvitePage>[0] & {
  /** Страница редактора: положить исходные цвета и шрифты шаблона для панели «Оформление». */
  styleMeta?: boolean;
}): string {
  // Свои цвета и шрифты пары — поверх готовой страницы любого шаблона.
  const html = styleDocument(buildInvitePage(opts), opts.theme, opts.styleMeta === true);
  // Длинные имена и заголовки не должны резаться краем телефона — в любом шаблоне.
  // У wedwed своя подгонка имён, а крупные надписи там нарочно уходят за край.
  const at = html.lastIndexOf("</body>");
  const fitted = at < 0 || !opts.script || (opts.theme && isWedwedTemplate(opts.theme.template)) ? html : `${html.slice(0, at)}<script>${FIT_TEXT_SCRIPT}</script>${html.slice(at)}`;
  // Ошибки браузера гостя — в Sentry, посещения — в Rybbit. В холсте
  // редактора ни то ни другое не нужно: там смотрит пара, а не гость.
  if (opts.styleMeta) return fitted;
  const head = fitted.indexOf("</head>");
  const watch = `${errorReporterScript(opts.theme?.template ?? "")}${rybbitScriptTag()}`;
  return head < 0 || !watch ? fitted : `${fitted.slice(0, head)}${watch}${fitted.slice(head)}`;
}

function buildInvitePage(opts: {
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
  // Выключенная заставка прячется стилями в <head>: без мелькания.
  const hideIntro = introOffCss(opts.theme);
  opts = { ...opts, extraCss: `${opts.extraCss ?? ""}${inviteControlsCss(opts.theme?.template ?? "")}${hideIntro}` };
  if (opts.theme?.template === "tili") return tiliDocument(opts);
  if (opts.theme && isWedwedTemplate(opts.theme.template)) return wedwedDocument({ ...opts, theme: opts.theme });
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${opts.noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}
<meta name="theme-color" content="${esc((opts.theme ?? defaultTheme()).bg)}">
${(opts.theme ?? defaultTheme()).template === "vinyl" ? VINYL_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "aquarelle" ? AQUARELLE_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "lily" ? LILY_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "bohema" ? BOHEMA_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "kraski" ? KRASKI_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "serdce" ? SERDCE_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "antic" ? ANTIC_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "skvoz-vremya" ? SKVOZ_VREMYA_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "burgundy" ? BURGUNDY_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "roseraie" ? ROSERAIE_FONTS_LINK : ""}${(opts.theme ?? defaultTheme()).template === "floral-garden" ? FLORAL_GARDEN_FONTS_LINK : ""}
${opts.theme?.template === "zefir" || opts.theme?.template === "crayon" ? SCRAPBOOK_FONTS_LINK : ""}
${isEditorialTemplate(opts.theme?.template ?? "") ? EDITORIAL_FONTS_LINK : ""}
<title>${esc(opts.title)}</title><style>${floorFontSizes(`${CSS}${PREMIUM_MOTION_CSS}${inviteThemeCss(opts.theme ?? defaultTheme())}${MOBILE_DENSITY_CSS}${TABLET_DENSITY_CSS}${MAP_LINK_TAP_CSS}${opts.extraCss ?? ""}`)}</style></head>
<body><main class="sheet${(opts.theme ?? defaultTheme()).template === "constellation" ? " constellation" : ""}${(opts.theme ?? defaultTheme()).template === "evergreen" ? " evergreen" : ""}${(opts.theme ?? defaultTheme()).template === "silk" ? " silk" : ""}${(opts.theme ?? defaultTheme()).template === "pearl" ? " pearl" : ""}${(opts.theme ?? defaultTheme()).template === "prism" ? " prism" : ""}${(opts.theme ?? defaultTheme()).template === "ruby" ? " ruby" : ""}${(opts.theme ?? defaultTheme()).template === "tuscany" ? " tuscany" : ""}${(opts.theme ?? defaultTheme()).template === "vinyl" ? " vinyl" : ""}${(opts.theme ?? defaultTheme()).template === "aquarelle" ? " aquarelle" : ""}${(opts.theme ?? defaultTheme()).template === "lily" ? " lily" : ""}${(opts.theme ?? defaultTheme()).template === "bohema" ? " bohema" : ""}${(opts.theme ?? defaultTheme()).template === "kraski" ? " kraski" : ""}${(opts.theme ?? defaultTheme()).template === "serdce" ? " serdce" : ""}${(opts.theme ?? defaultTheme()).template === "antic" ? " antic" : ""}${(opts.theme ?? defaultTheme()).template === "skvoz-vremya" ? " skvoz-vremya" : ""}${(opts.theme ?? defaultTheme()).template === "burgundy" ? " burgundy" : ""}${(opts.theme ?? defaultTheme()).template === "roseraie" ? " roseraie" : ""}${(opts.theme ?? defaultTheme()).template === "floral-garden" ? " floral-garden" : ""}${(opts.theme ?? defaultTheme()).template === "iskra" ? " iskra" : ""}${opts.theme?.template === "zefir" ? " zefir" : opts.theme?.template === "crayon" ? " crayon" : ""}${isEditorialTemplate(opts.theme?.template ?? "") ? ` ${opts.theme!.template}` : ""}">${decorMarkup(opts.theme ?? defaultTheme())}${opts.body}</main>${
    opts.script ? `<script>${opts.script}</script>` : ""
  }</body></html>`;
}

/**
 * Документ шаблона «Тили-тесто». Общие стили приглашения сюда не входят:
 * у образца свои классы с теми же именами, и общие правила сломали бы
 * вёрстку. Служебные вставки маршрутов (`.foot`, `.links`) оформлены
 * здесь же, в цветах шаблона.
 */
const TILI_ROUTE_CSS = `.foot{background:#2A1D0D;color:rgba(255,255,255,.4);text-align:center;padding:0 24px 34px;font-size:.85rem;letter-spacing:.12em;margin:0}.foot a{color:inherit}.links{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;background:#2A1D0D;padding:0 24px 24px}.links a{color:#BFAF9F;font-size:1rem;border:1px solid rgba(191,175,159,.4);border-radius:40px;padding:9px 22px;text-decoration:none}.ok{margin:0;padding:14px 20px;background:#8B6914;color:#fff;text-align:center}.who{padding:28px 20px 0;text-align:center;font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;color:#BFAF9F}section.plain{padding:100px 24px;text-align:center}`;

function tiliDocument(opts: { title: string; body: string; noindex?: boolean; extraCss?: string; script?: string }): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${opts.noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}
<meta name="theme-color" content="#f8f1ea">
${TILI_FONTS_LINK}
<title>${esc(opts.title)}</title><script>${TILI_HEAD_SCRIPT}</script><style>${floorFontSizes(`${TILI_CSS}${PREMIUM_MOTION_CSS}${TILI_ROUTE_CSS}${MOBILE_DENSITY_CSS}${TABLET_DENSITY_CSS}${MAP_LINK_TAP_CSS}${opts.extraCss ?? ""}`)}</style></head>
<body>${opts.body}${opts.script ? `<script>${opts.script}</script>` : ""}</body></html>`;
}

/** Пользовательский текст: переносы строк сохраняем, разметку — нет. */
function paragraphs(text: string, className = "", attrs = ""): string {
  // В редакторе пустой абзац всё равно рисуется: иначе его нечем заполнить.
  if (!text.trim() && !attrs) return "";
  return `<p class="pre center ${className}"${attrs}>${esc(text)}</p>`;
}

function cover(content: BlockContentMap["COVER"], e: EditAttrs = NO_EDIT): string {
  return `<section class="cover">
${content.imageUrl ? `<img src="${esc(content.imageUrl)}" alt=""${e.image("imageUrl")}>` : e.enabled ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию на обложку</span>` : ""}
${content.names || e.enabled ? `<p class="names"${e.text("names")}>${esc(content.names)}</p>` : ""}
<h1${e.text("title")}>${esc(content.title)}</h1>
${content.dateText || e.enabled ? `<p class="date"${e.text("dateText")}>${esc(content.dateText)}</p>` : ""}
${paragraphs(content.subtitle, "muted", e.text("subtitle", { multiline: true }))}
</section>`;
}

function timeline(content: BlockContentMap["TIMELINE"], theme: InviteTheme, e: EditAttrs = NO_EDIT): string {
  const items = content.items
    .map((item, index) => {
      // Значок подбирается по смыслу подписи. Не угадали — значка нет,
      // и это лучше, чем блюдо напротив церемонии.
      const icon = theme.timelineIcons ? timelineIcon(item.title, theme.accent) : "";
      return `<li>${icon}<time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><span class="what"><span${e.text(`items.${index}.title`)}>${esc(item.title)}</span>
${item.note || e.enabled ? `<span class="note"${e.text(`items.${index}.note`)}>${esc(item.note)}</span>` : ""}</span>${e.enabled ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</li>`;
    })
    .join("");
  return `<section>${content.tag || e.enabled ? `<p class="small muted center"${e.text("tag")}>${esc(content.tag)}</p>` : ""}<h2${e.text("title")}>${esc(content.title)}</h2><ul class="timeline">${items}</ul>${e.enabled ? '<button type="button" class="ie-link" data-block-action="add-detail">+ Добавить деталь дня</button>' : ""}</section>`;
}

function venue(content: BlockContentMap["VENUE"], e: EditAttrs = NO_EDIT): string {
  return `<section><h2${e.text("title")}>${esc(content.title)}</h2>
${content.name || e.enabled ? `<p class="center"${e.text("name")}>${esc(content.name)}</p>` : ""}
${paragraphs(content.address, "small muted", e.text("address", { multiline: true }))}
${paragraphs(content.note, "small", e.text("note", { multiline: true }))}
</section>`;
}

function dresscode(content: BlockContentMap["DRESSCODE"], e: EditAttrs = NO_EDIT): string {
  const swatches = content.palette
    .map((color, index) => `<span class="swatch" style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}></span>`)
    .join("");
  return `<section><h2${e.text("title")}>${esc(content.title)}</h2>${paragraphs(content.text, "", e.text("text", { multiline: true }))}
${swatches ? `<div class="palette">${swatches}</div>` : ""}</section>`;
}

function mapBlock(content: BlockContentMap["MAP"], e: EditAttrs = NO_EDIT): string {
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

  return `<section><h2${e.text("title")}>${esc(content.title)}</h2>${paragraphs(content.note, "small", e.text("note", { multiline: true }))}
${links ? `<div class="links">${links}</div>` : ""}${e.enabled ? `<p class="center">${e.link("yandexUrl", content.yandexUrl)} ${e.link("googleUrl", content.googleUrl)}</p>` : ""}</section>`;
}

function textBlock(content: BlockContentMap["TEXT"], e: EditAttrs = NO_EDIT): string {
  return `<section>${content.title || e.enabled ? `<h2${e.text("title")}>${esc(content.title)}</h2>` : ""}
${paragraphs(content.text, "", e.text("text", { multiline: true }))}</section>`;
}

/** Галерея-полароид: детские фотографии под обложкой, снимки пары ниже —
 *  один и тот же блок, поставленный дважды с разным содержимым. */
function photos(content: BlockContentMap["PHOTOS"], e: EditAttrs = NO_EDIT): string {
  // Номер пункта — по исходному списку: по нему редактор знает, что сохранять.
  const editableItems = e.enabled && content.items.length < 4
    ? [...content.items, { imageUrl: "", caption: "" }]
    : content.items;
  const items = editableItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => e.enabled || item.imageUrl);
  if (items.length === 0) return "";

  const cards = items
    .map(
      ({ item, index }) => `<figure class="polaroid p${(index % 2) + 1}">
${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt=""${e.image(`items.${index}.imageUrl`)}>` : e.enabled ? `<span class="polaroid-empty ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить фотографию</span>` : ""}
${item.caption || e.enabled ? `<figcaption${e.text(`items.${index}.caption`)}>${esc(item.caption)}</figcaption>` : ""}
</figure>`,
    )
    .join("");

  return `<section class="center">${content.tag || e.enabled ? `<p class="small muted"${e.text("tag")}>${esc(content.tag)}</p>` : ""}${content.title || e.enabled ? `<h2${e.text("title")}>${esc(content.title)}</h2>` : ""}
<div class="polaroids">${cards}</div></section>`;
}

const MONTHS_NOMINATIVE = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

/** Год/месяц/число мероприятия в его часовом поясе — не в браузере гостя. */
function eventDateParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone, year: "numeric", month: "numeric", day: "numeric",
  });
  const map = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    day: Number(map.get("day")),
    month: Number(map.get("month")),
    year: Number(map.get("year")),
  };
}

/**
 * Календарь месяца с отмеченным днём и большой датой.
 *
 * Дата — из мероприятия, не из блока (см. схему в `lib/invite-blocks.ts`):
 * те же соображения, что и у отсчёта.
 */
function calendarBlock(content: BlockContentMap["CALENDAR"], eventDate: Date, timezone: string, e: EditAttrs = NO_EDIT): string {
  const { day, month, year } = eventDateParts(eventDate, timezone);
  const monthName = MONTHS_NOMINATIVE[month - 1];
  const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Понедельник первым: `getUTCDay()` даёт 0=воскресенье, здесь считаем
  // сеткой по календарным числам площадки, а не по времени браузера.
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const weekdayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    .map((name) => `<span class="dn">${name}</span>`)
    .join("");

  const cells: string[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(`<span class="d d-empty"></span>`);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`<span class="d${d === day ? " d-marked" : ""}">${d}</span>`);
  }

  const big = `${String(day).padStart(2, "0")} / ${String(month).padStart(2, "0")} / ${String(year).slice(-2)}`;

  return `<section class="center"><h2${e.text("title")}>${esc(content.title)}</h2>
<div class="cal-card"><p class="cal-month">${esc(label)} ${year}</p>
<div class="cal-grid">${weekdayNames}${cells.join("")}</div></div>
<p class="big-date">${esc(big)}</p>
${paragraphs(content.message, "small muted", e.text("message", { multiline: true }))}</section>`;
}

/**
 * Раздел «Анкета»: шапка и форма прямо в приглашении (именной или общей
 * ссылки, без данных гостя — образец; см. inline-rsvp-form.ts). Уже
 * ответившему по именной ссылке — его ответ и ссылка «изменить».
 */
function rsvpCall(
  block: InviteBlockView,
  href: string | null,
  answered: string | null,
  e: EditAttrs = NO_EDIT,
): string {
  const content = block.content as BlockContentMap["RSVP_FORM"];
  const given =
    answered && href
      ? `<p class="center" style="margin-top:1.25rem">Ваш ответ: <b>${esc(answered)}</b> · <a href="${esc(href)}">изменить</a></p>`
      : "";
  return `<section><h2${e.text("title")}>${esc(content.title)}</h2>${paragraphs(content.text, "", e.text("text", { multiline: true }))}${inlineRsvpForm(block)}${given}</section>`;
}

/**
 * Собрать блоки в HTML.
 *
 * @param rsvpHref ссылка на форму ответа; null на неименной странице.
 * @param answered уже данный ответ словами.
 */
/**
 * Обратный отсчёт: общий красивый таймер (guest-html/countdown.ts) для
 * шаблонов без своего. Дни, часы, минуты и секунды — в цветах шаблона.
 */
function countdown(content: BlockContentMap["COUNTDOWN"], eventDate: Date, e: EditAttrs = NO_EDIT): string {
  return `<section class="center"><h2${e.text("title")}>${esc(content.title)}</h2>${countdownCells(content, eventDate, e)}</section>`;
}

/** Скрипт общего таймера — см. guest-html/countdown.ts. */
export const COUNTDOWN_SCRIPT = SHARED_COUNTDOWN_SCRIPT;

/** Есть ли на странице отсчёт: только тогда нужен его скрипт. */
export function hasCountdown(blocks: InviteBlockView[]): boolean {
  return blocks.some((block) => block.type === "COUNTDOWN");
}

/**
 * Плавное появление разделов при прокрутке.
 *
 * Прогрессивное улучшение по тому же принципу, что и заставка-конверт:
 * класс `js-reveal`, который прячет разделы до появления в кадре, ставит
 * сам скрипт. Не доехал скрипт до телефона — раздела просто не прячут,
 * и приглашение открывается целиком сразу, как раньше. `IntersectionObserver`
 * не нашёлся — та же участь: разделы показываются без анимации, а не
 * остаются невидимыми навсегда.
 */
export const REVEAL_SCRIPT = `(function(){var d=document,r=d.documentElement;r.className+=' js-reveal';
var els=d.querySelectorAll('.sheet>section');
if(!('IntersectionObserver' in window)){for(var i=0;i<els.length;i++)els[i].className+=' in';return}
var io=new IntersectionObserver(function(es){es.forEach(function(e){
if(e.isIntersecting){e.target.className+=' in';io.unobserve(e.target)}})},{threshold:.15});
for(var i=0;i<els.length;i++)io.observe(els[i])})()`;

/**
 * Все скрипты страницы одной строкой.
 *
 * Собрано в одном месте, потому что маршрутов приглашения семь, и
 * «забыли подключить отсчёт на именной странице» — ровно та ошибка,
 * которая обнаруживается у гостя, а не у нас. Плавное появление разделов
 * включено всегда — оно ничего не считает и не хранит, в отличие от
 * отсчёта и заставки, которым есть что включать или не включать.
 */
export function inviteScript(blocks: InviteBlockView[], theme: InviteTheme, names: string): string | undefined {
  const script = templateScript(blocks, theme, names);
  const intro = theme.introOff ? TEMPLATE_INTROS[theme.template] : undefined;
  if (!intro) return script;
  // Заставка выключена — открываем её сразу, тем же путём, что и гость.
  const open = `(function(){var o=document.querySelector(${JSON.stringify(intro.open)});if(o)o.click();document.body.style.overflow=''})()`;
  return script ? `${script};${open}` : open;
}

function templateScript(blocks: InviteBlockView[], theme: InviteTheme, names: string): string | undefined {
  // У «Тили-тесто» свой скрипт целиком: отсчёт, конверт и появление
  // разделов устроены как в образце, а не как у остальных шаблонов.
  if (theme.template === "tili") return `${TILI_SCRIPT};${PREMIUM_MOTION_SCRIPT}`;
  // Таймер wedwed рисует общий рендер, и его скрипт нужен и здесь.
  if (isWedwedTemplate(theme.template)) return hasCountdown(blocks) ? `${WEDWED_SCRIPT};${COUNTDOWN_SCRIPT}` : WEDWED_SCRIPT;
  if (isEditorialTemplate(theme.template)) return `${hasCountdown(blocks) ? COUNTDOWN_SCRIPT + ";" : ""}${EDITORIAL_SCRIPT}`;
  if (theme.template === "zefir" || theme.template === "crayon") return `${hasCountdown(blocks) ? COUNTDOWN_SCRIPT + ";" : ""}${SCRAPBOOK_SCRIPT}`;
  const parts = [
    hasCountdown(blocks) && theme.template !== "bohema" && theme.template !== "kraski" && theme.template !== "serdce" && theme.template !== "antic" && theme.template !== "skvoz-vremya" && theme.template !== "burgundy" && theme.template !== "floral-garden" ? COUNTDOWN_SCRIPT : "",
    theme.intro === "envelope" ? introScript(envelopeMarkup(theme, names)) : "",
    theme.template === "constellation" ? CONSTELLATION_SCRIPT : theme.template === "prism" ? PRISM_SCRIPT : theme.template === "evergreen" ? EVERGREEN_SCRIPT : theme.template === "silk" ? SILK_SCRIPT : theme.template === "pearl" ? PEARL_SCRIPT : theme.template === "ruby" ? RUBY_SCRIPT : theme.template === "tuscany" ? TUSCANY_SCRIPT : theme.template === "vinyl" ? VINYL_SCRIPT : theme.template === "aquarelle" ? aquarelleScript() : theme.template === "lily" ? LILY_SCRIPT : theme.template === "bohema" ? BOHEMA_SCRIPT : theme.template === "kraski" ? KRASKI_SCRIPT : theme.template === "serdce" ? SERDCE_SCRIPT : theme.template === "antic" ? ANTIC_SCRIPT : theme.template === "skvoz-vremya" ? SKVOZ_VREMYA_SCRIPT : theme.template === "burgundy" ? BURGUNDY_SCRIPT : theme.template === "roseraie" ? ROSERAIE_SCRIPT : theme.template === "floral-garden" ? FLORAL_GARDEN_SCRIPT : theme.template === "iskra" ? ISKRA_SCRIPT : REVEAL_SCRIPT,
    PREMIUM_MOTION_SCRIPT,
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
  blocks: InviteBlockView[], rsvpHref: string | null, answered: string | null,
  eventDate?: Date, theme: InviteTheme = defaultTheme(), timezone = "UTC", options: RenderOptions = {},
): string {
  // Виш-лист шаблон рисует как свой текстовый раздел, а сетку подарков
  // под ним вставляет общий рендер (см. guest-html/wishlist.ts).
  if (isEditorialTemplate(theme.template) || theme.template === "zefir" || theme.template === "crayon") blocks = blocks.filter(block => block.visible);
  const html = withInlineRsvp(options.rsvp, options.editable === true, () => withTemplateLabels(theme, options.editable === true, () => renderWithWishlist(blocks, (list) => {
    if (!theme.template) return renderRawBlocks(list, rsvpHref, answered, eventDate, theme, timezone, options);
    const personalized = personalizeBlocks(list, theme, eventDate, timezone);
    return personalizeMarkup(renderRawBlocks(personalized, rsvpHref, answered, eventDate, theme, timezone, options), personalized, theme, options.editable);
  }, options.wishlist, options.editable === true, options.wishlistPage ? "page" : "button")));
  return composeInviteComponents(html, blocks, theme, options.editable === true);
}

function renderRawBlocks(
  blocks: InviteBlockView[],
  rsvpHref: string | null,
  answered: string | null,
  eventDate?: Date,
  theme: InviteTheme = defaultTheme(),
  timezone = "UTC",
  options: RenderOptions = {},
): string {
  const editable = options.editable === true;
  if (isEditorialTemplate(theme.template)) {
    return renderEditorialBlocks(blocks, theme, { eventDate, timezone, editable });
  }
  if (theme.template === "zefir" || theme.template === "crayon") {
    return renderScrapbookBlocks(blocks, theme, { eventDate, timezone, editable });
  }
  if (isWedwedTemplate(theme.template)) {
    return renderWedwedBlocks(blocks, theme, { eventDate, timezone, rsvp: options.rsvp ?? null, editable }, (block) => `<div class="wv-plain">${renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options)}</div>`);
  }
  if (theme.template === "tili") {
    return renderTiliBlocks(blocks, theme, { eventDate, timezone, rsvp: options.rsvp ?? null, editable });
  }
  if (theme.template === "bohema") {
    return renderBohemaBlocks(blocks, theme, { eventDate, rsvp: options.rsvp ?? null, editable });
  }
  if (theme.template === "kraski") {
    return renderKraskiBlocks(blocks, theme, { eventDate, timezone, rsvp: options.rsvp ?? null, editable });
  }
  if (theme.template === "serdce") {
    return renderSerdceBlocks(blocks, theme, { eventDate, timezone, rsvp: options.rsvp ?? null, editable });
  }
  if (theme.template === "antic") {
    return renderAnticBlocks(blocks, { eventDate, timezone, rsvp: options.rsvp ?? null, editable });
  }
  if (theme.template === "skvoz-vremya") {
    return renderSkvozVremyaBlocks(blocks, { eventDate, timezone, rsvp: options.rsvp ?? null, editable });
  }
  if (theme.template === "burgundy") {
    return renderBurgundyBlocks(blocks, { eventDate, editable });
  }
  if (theme.template === "roseraie") {
    return renderRoseraieBlocks(blocks, { editable, musicUrl: theme.musicUrl, eventDate });
  }
  if (theme.template === "iskra") {
    return renderIskraBlocks(blocks, { eventDate, timezone, editable, musicUrl: theme.musicUrl });
  }
  if (theme.template === "floral-garden") {
    return renderFloralGardenBlocks(blocks, { eventDate, timezone, rsvp: options.rsvp ?? null, musicUrl: theme.musicUrl, editable });
  }
  if (theme.template === "evergreen") {
    return renderEvergreenBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "silk") {
    return renderSilkBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "constellation") {
    return renderConstellationBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "pearl") {
    return renderPearlBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "prism") {
    return renderPrismBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "lily") {
    return renderLilyBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "aquarelle") {
    return renderAquarelleBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "vinyl") {
    return renderVinylBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "tuscany") {
    return renderTuscanyBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  if (theme.template === "ruby") {
    return renderRubyBlocks(blocks, theme, rsvpHref, answered, (block) =>
      renderRawBlocks([block], rsvpHref, answered, eventDate, { ...theme, template: "" }, timezone, options),
      { editable },
    );
  }
  return blocks
    .map((block) => {
      const e = editAttrs(block.id, editable);
      const html = (() => {
        switch (block.type) {
          case "COUNTDOWN":
            // Без даты мероприятия считать нечего — так бывает только в
            // тестах рендерера, которым блок отдают в одиночку.
            return eventDate
              ? countdown(block.content as BlockContentMap["COUNTDOWN"], eventDate, e)
              : "";
          case "CALENDAR":
            return eventDate
              ? calendarBlock(block.content as BlockContentMap["CALENDAR"], eventDate, timezone, e)
              : "";
          case "COVER":
            return cover(block.content as BlockContentMap["COVER"], e);
          case "PHOTOS":
            return photos(block.content as BlockContentMap["PHOTOS"], e);
          case "TIMELINE":
            return timeline(block.content as BlockContentMap["TIMELINE"], theme, e);
          case "VENUE":
            return venue(block.content as BlockContentMap["VENUE"], e);
          case "DRESSCODE":
            return dresscode(block.content as BlockContentMap["DRESSCODE"], e);
          case "MAP":
            return mapBlock(block.content as BlockContentMap["MAP"], e);
          case "TEXT":
            return textBlock(block.content as BlockContentMap["TEXT"], e);
          case "RSVP_FORM":
            return rsvpCall(block, rsvpHref, answered, e);
        }
      })();
      // В редакторе раздел получает признак и панель «вверх / вниз / скрыть».
      return html ? html.replace(/<section([^>]*)>/, `<section$1${e.section()}>${e.tools()}`) : html;
    })
    .join("");
}
