import type { InviteBlockView } from "@/server/repositories/invites";
import type { InviteTheme } from "@/lib/invite-theme";
import { initials, photoAdjustmentSchema } from "@/lib/invite-personalization";
import { esc } from "@/server/guest-html/layout";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { guestText, templateLanguage } from "@/server/guest-html/template-labels";

/** Шаблоны, у которых снимки обложки уже стоят в самой обложке: полоса
 *  «из детства» под ней повторила бы те же кадры второй раз. */
const COVER_OWNS_PHOTOS = new Set(["iskra", "tili", "vinyl", "kraski", "odnazhdy", "little-happiness", "priznanie", "zefir", "crayon", "gazette", "protokol", "postcard", "gravure", "disco", "coral", "chrome"]);

/** Шаблоны, которые сами рисуют карту в блоке «Как добраться»: вторая
 *  карта под адресом была бы повтором. */
const OWN_MAP = new Set(["iskra", "kraski", "serdce", "antic", "skvoz-vremya", "burgundy", "roseraie", "floral-garden", "odnazhdy", "little-happiness", "priznanie"]);

/** Текст-заглушка блока «Как добраться» из образца шаблона. */
const MAP_PLACEHOLDER = /^Добавьте ссылку на карту/;

/**
 * Адрес встроенной Яндекс Карты для площадки.
 *
 * Своя точка — ссылка из «Поделиться» в Яндекс Картах (на организацию,
 * на метку или просто на участок карты): тот же путь под /map-widget/v1/
 * Яндекс отдаёт как встраиваемую карту. Без такой ссылки ищем по названию
 * и адресу — карта сама переедет, когда организатор впишет своё место.
 */
export function yandexMapEmbed(mapUrl: string, name: string, address: string): string {
  const localized = (src: string) => {
    if (!src || templateLanguage() !== "en") return src;
    const url = new URL(src);
    url.searchParams.set("lang", "en_US");
    return url.toString();
  };
  const own = mapUrl.match(/^https?:\/\/(?:www\.)?yandex\.(ru|com|kz|by|uz|com\.tr)\/(?:maps|map-widget\/v1)(\/[^#]*)?$/i);
  if (own) return localized(`https://yandex.${own[1]}/map-widget/v1${own[2] ?? "/"}`);
  // Ссылка из Google Карт тоже годится как «своя точка», если в ней есть
  // координаты: …/@55.94,38.08,15z или …!3d55.94!4d38.08.
  const google = /google\.[a-z.]+\/maps|goo\.gl\/maps/i.test(mapUrl)
    ? mapUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? mapUrl.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    : null;
  if (google) {
    const point = `${google[2]},${google[1]}`;
    return localized(`https://yandex.ru/map-widget/v1/?ll=${point}&z=16&pt=${point},pm2rdm`);
  }
  const query = [name, address].map((part) => part.trim()).filter(Boolean).join(", ");
  return query ? localized(`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(query)}&z=16`) : "";
}

const VOID_TAGS = new Set(["img", "br", "hr", "input", "source", "meta", "link", "wbr", "area", "col", "embed", "track"]);

/**
 * Куда поставить карту, если адрес стоит в позиции `at` разметки раздела.
 *
 * Обычно — сразу за элементом с адресом. Но во многих шаблонах название и
 * адрес лежат в карточке поверх фотографии площадки: карта внутри такой
 * карточки раздувает её и закрывает и снимок, и сам адрес. Поэтому, если
 * у адреса есть предок со снимком внутри, карта встаёт после самого
 * внешнего такого предка — под фотографией целиком.
 */
function mapInsertPoint(section: string, at: number): number {
  const tag = /<(\/?)([a-z][a-z0-9-]*)\b[^>]*?(\/?)>/gi;
  const stack: { name: string; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = tag.exec(section)) && match.index < at) {
    const [, closing, raw, self] = match;
    const name = raw.toLowerCase();
    if (closing) {
      const index = stack.map((item) => item.name).lastIndexOf(name);
      if (index >= 0) stack.length = index;
    } else if (!self && !VOID_TAGS.has(name)) {
      stack.push({ name, start: match.index });
    }
  }
  // stack[0] — сам <section>; остальные — предки адреса снаружи внутрь.
  const ancestors = stack.slice(1);
  const endOf = (item: { name: string; start: number }) => {
    const re = new RegExp(`<(/?)${item.name}\\b[^>]*>`, "gi");
    re.lastIndex = item.start;
    let depth = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section))) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) return m.index + m[0].length;
    }
    return -1;
  };
  for (const item of ancestors) {
    const end = endOf(item);
    if (end > 0 && section.slice(item.start, end).includes("<img")) return end;
  }
  const own = ancestors.at(-1);
  return own ? endOf(own) : -1;
}

export function personalizeMarkup(html: string, blocks: InviteBlockView[], theme: InviteTheme, editable = false): string {
  if (!html) return "";
  const cover = blocks.find((b) => b.type === "COVER");
  const names = theme.wedding?.names ?? (cover?.content as { names?: string } | undefined)?.names ?? "";
  const monogram = esc(initials(names));
  let result = html.replace(/(<span class="prism-sign"[^>]*>)[^<]*(<\/span>)/g, (_match, start, end) => `${start}${monogram}${end}`)
    .replace(/(<span class="(?:ruby|tuscany)-seal"[^>]*><i>)(?:E · J|O · D)(<\/i>)/g, (_match, start, end) => `${start}${monogram}${end}`);
  const wedding = theme.wedding;
  if (wedding) {
    result = result.replace(/<span>(?:Two hearts|A love story|Два сердца|Наша история)<\/span>/g, () => `<span>${esc(wedding.captionLeft)}</span>`)
      .replace(/<span>(?:A brighter tomorrow|Together always|Наше светлое завтра|Вместе навсегда)<\/span>/g, () => `<span>${esc(wedding.captionRight)}</span>`);
  }
  // «Как добраться» рядом со встроенной картой. Без своего текста блок —
  // повтор карты под адресом, и гостю его не показываем. Со своим текстом
  // (про парковку) блок остаётся, а ссылка «Как добраться ↗»
  // под адресом тогда лишняя: она уже есть в нём.
  const venueMap = !OWN_MAP.has(theme.template ?? "") && blocks.some((b) => b.type === "VENUE");
  const mapBlockNeeded = (b: InviteBlockView) => {
    const note = String((b.content as { note?: string }).note ?? "").trim();
    return editable || !venueMap || (note !== "" && !MAP_PLACEHOLDER.test(note));
  };
  const routeInMapBlock = blocks.some((b) => b.type === "MAP" && mapBlockNeeded(b));
  const supplementedCovers = new Set<string>();
  result = result.replace(/<section\b[^>]*>[\s\S]*?<\/section>/g, (section) => {
    const id = section.match(/data-(?:content-block|block-id)="([^"]+)"/)?.[1];
    const block = blocks.find((b) => esc(b.id) === id);
    if (!block) return section;
    if (block.type === "MAP" && !mapBlockNeeded(block)) return "";
    const e = editAttrs(block.id, editable);
    const c = block.content;
    if ((block.type === "VENUE" || block.type === "DRESSCODE") && "imageUrl" in c && !section.includes(`data-media-path="imageUrl"`)) {
      const photo = c.imageUrl ? `<div class="personal-photo"><img src="${esc(c.imageUrl)}" alt="${block.type === "VENUE" ? guestText("Место торжества", "Wedding venue") : guestText("Примеры нарядов", "Outfit ideas")}" loading="lazy"${e.image("imageUrl")}></div>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${block.type === "VENUE" ? guestText("Добавить фотографию площадки", "Add a venue photo") : guestText("Добавить примеры нарядов", "Add outfit ideas")}</span>` : "";
      section = section.replace("</section>", `${photo}</section>`);
    }
    if (block.type === "VENUE" && "mapUrl" in c && !section.includes('data-link-edit') && !section.includes('target="_blank"') && !routeInMapBlock) {
      section = section.replace("</section>", `${c.mapUrl ? `<p class="center"><a href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.mapLabel || guestText("Как добраться", "Get directions"))} ↗</a></p>` : ""}${editable ? e.link("mapUrl", c.mapUrl) : ""}</section>`);
    }
    if (block.type === "VENUE" && "mapUrl" in c && !section.includes("data-venue-map") && !OWN_MAP.has(theme.template ?? "")) {
      const src = yandexMapEmbed(c.mapUrl, c.name, c.address);
      // Ленивая загрузка: карта тянет сторонние скрипты, и гость, который
      // не долистал до места, не должен за них платить.
      if (src) {
        const map = `<div class="venue-map" data-venue-map><iframe src="${esc(src)}" title="${guestText("Карта", "Map")}: ${esc(c.name || c.address)}" loading="lazy" allowfullscreen></iframe></div>`;
        // Карта — сразу под адресом (или названием, если адреса нет): у
        // каждого шаблона своя разметка, поэтому ищем строку по тексту и
        // ставим карту после закрывающего тега её абзаца.
        const anchor = [c.address, c.name].map((text) => esc(text.split("\n")[0].trim())).find((text) => text && section.includes(`>${text}`));
        const end = anchor ? mapInsertPoint(section, section.indexOf(`>${anchor}`) + 1) : -1;
        section = end >= 0 ? section.slice(0, end) + map + section.slice(end) : section.replace("</section>", `${map}</section>`);
      }
    }
    if (block.type === "COVER" && "photos" in c && !COVER_OWNS_PHOTOS.has(theme.template ?? "") && !supplementedCovers.has(block.id) && c.photos.some((p) => p.imageUrl)) {
      supplementedCovers.add(block.id);
      const photos = c.photos.map((photo, index) => photo.imageUrl && !result.includes(`data-media-block="${esc(block.id)}" data-media-path="photos.${index}.imageUrl"`) ? `<figure><div class="personal-photo"><img src="${esc(photo.imageUrl)}" alt="${guestText("Фотография из детства", "Childhood photo")}"${e.image(`photos.${index}.imageUrl`)}></div><figcaption${e.text(`photos.${index}.caption`)}>${esc(photo.caption)}</figcaption></figure>` : "").join("");
      if (photos) section += `<section class="personal-childhood">${photos}</section>`;
    }
    return section;
  });
  result = result.replace(/<(?:img|span)\b[^>]*data-media-block="[^"]*"[^>]*>/g, (tag) => {
    if (tag.includes("data-photo-ready")) return tag;
    const id = tag.match(/data-media-block="([^"]*)"/)?.[1];
    const path = tag.match(/data-media-path="([^"]*)"/)?.[1];
    const block = blocks.find((b) => esc(b.id) === id);
    const settings = block && "photoSettings" in block.content ? block.content.photoSettings?.[path ?? ""] : undefined;
    if (!settings) return tag;
    const parsed = photoAdjustmentSchema.safeParse(settings);
    if (!parsed.success) return tag;
    const p = parsed.data;
    const css = `object-position:${p.x}% ${p.y}%!important;object-fit:${p.fit}!important;scale:${p.zoom};filter:brightness(${p.brightness * (1 - p.darkness / 100)}%) ${p.original ? "" : "saturate(.65) sepia(.08)"}!important;`;
    let output = tag.replace(/>$/, ` data-photo-ready data-photo-settings="${esc(JSON.stringify(p))}">`);
    if (output.startsWith("<img")) output = output.includes('style="') ? output.replace('style="', `style="${css}`) : output.replace(/>$/, ` style="${css}">`);
    return output;
  });
  const css = `
    [class$="-names"]{max-width:100%;overflow-wrap:anywhere;flex-wrap:wrap}
    .personal-photo{height:22rem;overflow:hidden;position:relative;margin:1.5rem auto;border-radius:1rem}.personal-photo img{width:100%;height:100%;object-fit:cover;display:block}.personal-childhood{position:relative;z-index:4;display:flex;flex-wrap:wrap;justify-content:center;gap:1rem}.personal-childhood figure{width:42%;margin:0}.personal-childhood .personal-photo{height:14rem}.personal-childhood figcaption{font-size:.8rem}
    .venue-map{position:relative;z-index:2;max-width:40rem;height:20rem;margin:1.5rem auto;border-radius:1rem;overflow:hidden;box-shadow:0 14px 34px #0000001f}.venue-map iframe{display:block;width:100%;height:100%;border:0}.constellation .venue-map{width:calc(100% - 2.6rem)}
    .silk-weekend-grid:not(:has(figure:nth-child(2))),.tuscany-gallery-grid:not(:has(figure:nth-child(2))){grid-template-columns:1fr}
    .silk-weekend-grid:not(:has(figure:nth-child(2))) figure{grid-row:auto;grid-column:1}
    ${wedding?.portraitShape === "rectangle" ? ".pearl-portrait,.ruby-portrait{border-radius:1rem!important}.pearl-portrait::after{border-radius:inherit}" : ""}
    ${wedding?.textPosition === "top" ? ".eg-cover-copy,.constellation-cover-copy,.prism-cover-copy{top:4rem!important;bottom:auto!important}.silk-cover-wave{top:0!important;bottom:auto!important}" : ""}
    @media(max-width:480px){body:not(.wv-template) [class$="-names"]{font-size:clamp(2rem,9vw,3.2rem)!important;line-height:1.12!important}.ruby-cover{height:auto!important;min-height:100svh}}
  `;
  return `<style>${css}</style>${result}`;
}
