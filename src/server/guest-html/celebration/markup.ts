import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import { celebrationSampleTranslations, type CelebrationDesign } from "@/lib/invite-templates/celebration";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { countdownCells } from "@/server/guest-html/countdown";
import { guestText, initialsOf, labelText, L } from "@/server/guest-html/template-labels";
import { esc } from "@/server/guest-html/layout";

type Context = { eventDate?: Date; timezone: string; editable: boolean };
const rich = (s: string) => esc(s).replace(/\n/g, "<br>");
const paragraph = (s: string, path: string, e: EditAttrs, cls = "") => s || e.enabled ? `<p class="cl-copy ${cls}"${e.text(path, { multiline: true })}>${rich(s)}</p>` : "";
const heading = (s: string, e: EditAttrs) => s || e.enabled ? `<h2 class="cl-heading"${e.text("title")}>${esc(s)}</h2>` : "";

export function localizeCelebrationBlocks(blocks: InviteBlockView[], design: CelebrationDesign, theme: InviteTheme): InviteBlockView[] {
  if (theme.language !== "en") return blocks;
  const translations = celebrationSampleTranslations(design);
  // The automatically added wishlist is shared by all designs.
  for (const [ru, en] of [
    ["Подарки", "Gifts"], ["Наш виш-лист", "Our wishlist"], ["Открыть виш-лист", "Open wishlist"], ["Я подарю это", "I will gift this"],
    ["Если захотите порадовать нас подарком — вот что нам пригодится. Отметьте подарок, чтобы его не выбрал кто-то ещё.", "If you would like to give us a gift, here are a few things we would love. Reserve your choice so nobody else picks the same gift."],
  ]) translations.set(ru, en);
  const translate = (value: unknown): unknown => {
    if (typeof value === "string") return translations.get(value) ?? value;
    if (Array.isArray(value)) return value.map(translate);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translate(item)]));
    return value;
  };
  return blocks.map(b => ({ ...b, content: translate(b.content) as InviteBlockView["content"] }));
}

function photo(url: string, path: string, e: EditAttrs, cls = "", eager = false): string {
  if (!url) return e.enabled ? `<div class="cl-photo cl-placeholder ${cls}"${e.image(path)}>${guestText("Добавить фотографию", "Add a photograph")}</div>` : "";
  return `<div class="cl-photo ${cls}"><img src="${esc(url)}" alt=""${eager ? ' fetchpriority="high"' : ' loading="lazy"'}${e.image(path)}></div>`;
}

/** Image decorations are separate removable components, never backgrounds with baked copy. */
function ornament(design: CelebrationDesign, e: EditAttrs, variant = ""): string {
  const src = design === "gravure" ? "/media/invite-gravure/roses.webp" : design === "disco" ? "/media/invite-disco/ball.webp" : design === "coral" ? "/media/invite-coral/bow.webp" : "";
  if (!src) return `<div class="cl-disc ${variant}"${e.component(`decor:disc${variant ? "-" + variant : ""}`)} aria-hidden="true"><i></i></div>`;
  return `<img class="cl-ornament ${variant}" src="${src}" alt="" loading="lazy"${e.component(`decor:ornament${variant ? "-" + variant : ""}`)}>`;
}

function ribbon(design: CelebrationDesign, text: string, e: EditAttrs): string {
  const key = `${design}.ribbon`;
  text = labelText(key, text);
  return `<div class="cl-ribbon"${e.component("decor:ribbon")}><div class="cl-ribbon-track">${L(key, text)}${Array.from({ length: 5 }, () => `<span aria-hidden="true" data-cl-label-copy="${key}">${esc(text)}</span>`).join("")}</div></div>`;
}

function intro(design: CelebrationDesign, names: string, e: EditAttrs): string {
  const title = L(`${design}.intro-title`, guestText("Для самых близких", "For our favorite people"), { tag: "p", className: "cl-intro-title" });
  const seal = L(`${design}.monogram`, initialsOf(names).join(" & "), { className: "cl-monogram" });
  const hint = L(`${design}.intro-note`, guestText("Наша история начинается здесь", "Our story begins here"), { tag: "p" });
  const open = L(`${design}.intro-open`, guestText(design === "disco" ? "Начать вечеринку" : "Открыть приглашение", design === "disco" ? "Let the party begin" : "Open invitation"));
  if (e.enabled) return `<details class="cl-intro-settings" data-editor-ui><summary>${guestText("Надписи заставки", "Opening screen text")}</summary>${title}${seal}${hint}<p>${open}</p></details>`;
  return `<div class="cl-intro" hidden><div class="cl-intro-inner">${title}<div class="cl-intro-card">${ornament(design, e, "intro-art")}${seal}${hint}</div><button class="cl-open" type="button">${open}</button></div></div>`;
}

function calendar(date: Date, ctx: Context, design: CelebrationDesign, theme: InviteTheme, e: EditAttrs): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ctx.timezone, day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const part = (key: string) => Number(parts.find(p => p.type === key)?.value);
  const day = part("day"), month = part("month"), year = part("year");
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat(theme.language === "en" ? "en-GB" : "ru-RU", { timeZone: ctx.timezone, month: "long", year: "numeric" }).format(date);
  const weekdays = theme.language === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return `<div class="cl-calendar-widget"${e.component("widget:calendar")}><p class="cl-month">${esc(title)}</p><div class="cl-calendar-grid">${weekdays.map((v,i) => L(`${design}.weekday-${i}`,v,{className:"cl-weekday"})).join("")}${'<span aria-hidden="true"></span>'.repeat(start)}${Array.from({length:days},(_,i)=>`<span${i+1===day?' class="cl-selected" aria-current="date"':""}>${i+1}</span>`).join("")}</div></div>`;
}

function cover(c: BlockContentMap["COVER"], design: CelebrationDesign, e: EditAttrs, theme: InviteTheme): string {
  const names = `<h1 class="cl-names"${e.text("names")}>${esc(c.names).replace(/\s+(?:и|&|and|\+)\s+/i,'<i>&amp;<wbr></i>')}</h1>`;
  const date = `<p class="cl-date"${e.text("dateText")}>${esc(c.dateText)}</p>`;
  const title = `<p class="cl-cover-title"${e.text("title")}>${esc(c.title)}</p>`;
  const image = photo(c.imageUrl,"imageUrl",e,"cl-cover-photo",true);
  const extra = c.photos.length ? `<div class="cl-cover-extras">${c.photos.map((p,i)=>`<figure>${photo(p.imageUrl,`photos.${i}.imageUrl`,e)}<figcaption${e.text(`photos.${i}.caption`)}>${esc(p.caption)}</figcaption></figure>`).join("")}</div>` : "";
  const copy = paragraph(c.subtitle,"subtitle",e,"cl-cover-subtitle");
  const scroll = L(`${design}.scroll`,guestText("Листайте нашу историю ↓","Scroll into our story ↓"),{tag:"p",className:"cl-scroll"});
  if (design === "chrome") return `${ribbon(design,`${c.names} · ${c.dateText}`,e)}<div class="cl-chrome-stage">${image}<div class="cl-metal"${e.component("decor:metal")} aria-hidden="true"></div><div class="cl-chrome-type">${title}${names}${date}</div></div>${copy}${scroll}${extra}`;
  if (design === "disco") return `${title}${ribbon(design,guestText("навсегда · вместе","forever · together"),e)}<div class="cl-disco-stage">${image}<span class="cl-tape"${e.component("decor:tape")} aria-hidden="true"></span>${ornament(design,e,"hero-ball")}</div><div class="cl-cover-copy">${names}${date}</div>${copy}${scroll}${extra}`;
  if (design === "coral") return `${ornament(design,e,"hero-bow")}${date}${names}<div class="cl-coral-stage"><span class="cl-heart"${e.component("decor:heart")} aria-hidden="true"></span>${image}</div>${title}${copy}${scroll}${extra}`;
  return `${ornament(design,e,"rose-left")}${ornament(design,e,"rose-right")}${title}${date}${image}<div class="cl-cover-copy">${names}</div>${copy}${scroll}${extra}`;
}

export function renderCelebrationBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: Context): string {
  const design = theme.template as CelebrationDesign;
  const visible = blocks.filter(b=>b.visible);
  const lastText = visible.filter(b=>b.type === "TEXT" && !(b.content as {wishlist?:boolean}).wishlist).at(-1)?.id;
  return visible.map(block=>{
    const e = editAttrs(block.id,ctx.editable);
    const frame = (cls:string,body:string) => `<section class="cl-section ${cls}"${e.section()}>${e.tools()}<div class="cl-inner">${body}</div></section>`;
    switch(block.type) {
      case "COVER": { const c=block.content as BlockContentMap["COVER"]; return frame("cl-cover",`${intro(design,c.names,e)}${theme.musicUrl?`<audio class="cl-music" src="${esc(theme.musicUrl)}" preload="none" loop></audio><button type="button" class="cl-music-toggle" aria-pressed="false">${L(`${design}.music`,guestText("Музыка ♫","Music ♫"))}</button>`:""}${cover(c,design,e,theme)}`); }
      case "CALENDAR": { const c=block.content as BlockContentMap["CALENDAR"]; return frame("cl-calendar",`${heading(c.title,e)}${ctx.eventDate?calendar(ctx.eventDate,ctx,design,theme,e):""}${paragraph(c.message,"message",e)}${design==="disco"?ornament(design,e,"calendar-ball"):""}`); }
      case "COUNTDOWN": { const c=block.content as BlockContentMap["COUNTDOWN"]; return frame("cl-countdown",`${heading(c.title,e)}${ctx.eventDate?countdownCells(c,ctx.eventDate,e):""}`); }
      case "TIMELINE": { const c=block.content as BlockContentMap["TIMELINE"]; return frame("cl-timing",`${heading(c.title,e)}${design==="chrome"?ornament(design,e):""}<ol class="cl-program">${c.items.map((p,i)=>`<li class="cl-step"><time${e.text(`items.${i}.time`)}>${esc(p.time)}</time><div><h3${e.text(`items.${i}.title`)}>${esc(p.title)}</h3>${paragraph(p.note,`items.${i}.note`,e)}</div>${ctx.editable?`<button type="button" data-editor-ui data-block-action="remove-detail" data-item-index="${i}">Удалить пункт</button>`:""}</li>`).join("")}</ol>${ctx.editable?'<button type="button" data-editor-ui data-block-action="add-detail">+ Пункт программы</button>':""}`); }
      case "VENUE": { const c=block.content as BlockContentMap["VENUE"]; return frame("cl-venue",`${heading(c.title,e)}<h3 class="cl-venue-name"${e.text("name")}>${esc(c.name)}</h3>${paragraph(c.address,"address",e)}${photo(c.imageUrl,"imageUrl",e,"cl-venue-photo")}${paragraph(c.note,"note",e)}${c.mapUrl?`<a class="cl-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"${e.component("link:mapUrl")}><span${e.text("mapLabel")}>${esc(c.mapLabel)}</span><span aria-hidden="true">↗</span></a>`:""}${e.link("mapUrl",c.mapUrl)}`); }
      case "MAP": { const c=block.content as BlockContentMap["MAP"]; return frame("cl-map",`${heading(c.title,e)}${paragraph(c.note,"note",e)}${(["yandexUrl","googleUrl"] as const).map(key=>`${c[key]?`<a class="cl-button" href="${esc(c[key])}" target="_blank" rel="noopener noreferrer"${e.component(`link:${key}`)}>${L(`${design}.map-${key}`,key==="googleUrl"?"Google Maps":guestText("Яндекс Карты","Yandex Maps"))} ↗</a>`:""}${e.link(key,c[key])}`).join("")}`); }
      case "DRESSCODE": { const c=block.content as BlockContentMap["DRESSCODE"]; return frame("cl-dress",`${heading(c.title,e)}${paragraph(c.text,"text",e)}<div class="cl-palette">${c.palette.map((color,i)=>`<span style="background:${esc(color)}" data-color="${esc(color)}" aria-label="${esc(color)}"${e.color(`palette.${i}`)}></span>`).join("")}</div>${photo(c.imageUrl,"imageUrl",e,"cl-outfits")}`); }
      case "PHOTOS": { const c=block.content as BlockContentMap["PHOTOS"]; return frame("cl-album",`${heading(c.title,e)}<div class="cl-gallery">${c.items.map((p,i)=>`<figure class="cl-memory" style="--cl-tilt:${i%2?4:-4}deg;--cl-delay:${i*.12}s">${photo(p.imageUrl,`items.${i}.imageUrl`,e)}<figcaption${e.text(`items.${i}.caption`)}>${esc(p.caption)}</figcaption></figure>`).join("")}</div>`); }
      case "TEXT": { const c=block.content as BlockContentMap["TEXT"] & {wishlist?:boolean}; const closing=!c.wishlist && block.id===lastText; return frame(c.wishlist?"cl-wishlist":closing?"cl-closing":"cl-note",`${paragraph(c.tag,"tag",e,"cl-tag")}${heading(c.title,e)}${paragraph(c.text,"text",e)}${closing?`${ornament(design,e,"closing-art")}${L(`${design}.closing-monogram`,initialsOf(theme.wedding?.names??String((visible.find(b=>b.type==="COVER")?.content as {names?:string})?.names??"")).join(" & "),{tag:"p",className:"cl-closing-monogram"})}`:""}`); }
      case "RSVP_FORM": { const c=block.content as BlockContentMap["RSVP_FORM"]; return frame("cl-rsvp",`${heading(c.title,e)}${paragraph(c.text,"text",e)}${inlineRsvpForm(block)}`); }
      default: return "";
    }
  }).join("");
}
