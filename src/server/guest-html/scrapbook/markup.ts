import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { countdownCells } from "@/server/guest-html/countdown";
import { esc } from "@/server/guest-html/layout";
import { initialsOf, L } from "@/server/guest-html/template-labels";

type Context = { eventDate?: Date; timezone: string; editable: boolean };
type Design = "zefir" | "crayon";

/** Small original line drawings, kept as vector components rather than text in an image. */
function doodle(kind: "heart" | "star" | "flower" | "rings" | "glasses" | "cake"): string {
  const paths = {
    heart: '<path d="M30 50C22 43 5 32 8 18C12 4 27 8 30 17C35 5 51 6 53 19C57 33 38 47 30 50Z"/>',
    star: '<path d="m30 5 6 18 19 6-19 7-6 19-6-19-19-7 19-6Z"/>',
    flower: '<path d="M30 23C7 0 8 32 23 30C-1 46 30 60 30 37C43 62 59 33 37 30C61 16 32 0 30 23Z"/><circle cx="30" cy="30" r="5"/><path d="M30 40v17"/>',
    rings: '<circle cx="23" cy="34" r="16"/><circle cx="39" cy="34" r="16"/><path d="m31 11 8-7 8 7-8 9Z"/>',
    glasses: '<path d="m8 8 16 3-3 20C18 43 3 39 5 27ZM36 11l16-3 3 19c2 12-13 16-16 4ZM12 39l-2 13M4 52h17M48 39l2 13M41 52h16M5 21l17 3M39 24l16-3"/>',
    cake: '<path d="M10 53V35h40v18ZM16 35V22h28v13ZM30 22V11M26 7q4-8 8 0q0 6-8 0ZM10 40q5 9 10 0q5 9 10 0q5 9 10 0q5 9 10 0"/>',
  };
  return `<svg class="sb-doodle sb-${kind}" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
}

const text = (value: string) => esc(value).replace(/\n/g, "<br>");
const heading = (value: string, e: EditAttrs) => `<h2${e.text("title")}>${esc(value)}</h2>`;
const paragraph = (value: string, path: string, e: EditAttrs) => value || e.enabled ? `<p${e.text(path, { multiline: true })}>${text(value)}</p>` : "";

function photo(url: string, path: string, e: EditAttrs, cls = "", lazy = true): string {
  if (!url) return e.enabled ? `<span class="ie-image-placeholder"${e.image(path)}>Добавить фотографию</span>` : "";
  return `<div class="sb-photo ${cls}"><img src="${esc(url)}" alt=""${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}${e.image(path)}></div>`;
}

function intro(c: BlockContentMap["COVER"], e: EditAttrs, design: Design, names: string): string {
  const monogram = initialsOf(names).join(" + ");
  const labels = `${L(`${design}.intro-title`, design === "zefir" ? "Кто будет моей женой?" : "Вам письмо из детства", { tag: "h2" })}${L(`${design}.intro-hint`, design === "zefir" ? "Нажмите на карточку, чтобы узнать" : "Внутри — наша самая счастливая история", { tag: "p" })}`;
  if (e.enabled) return `<details class="sb-intro-settings" data-editor-ui><summary>Надписи заставки</summary>${labels}${L(`${design}.seal`, monogram)}${design === "zefir" ? `<p>${L("zefir.flip", "Кто же?")}</p><p>${L("zefir.flip-answer", "Это любовь!")}</p>` : ""}${L(`${design}.intro-open`, "Открыть приглашение")}</details>`;
  const children = c.photos.filter(p => p.imageUrl);
  const envelope = design === "crayon"
    ? `<div class="sb-envelope sb-envelope-art"><img src="/media/invite-scrapbook/crayon-envelope.webp" width="1100" height="825" alt="" aria-hidden="true" fetchpriority="high"><span class="sb-seal">${L(`${design}.seal`, monogram)}</span></div>`
    : `<div class="sb-envelope">${doodle("heart")}<span class="sb-seal">${L(`${design}.seal`, monogram)}</span></div>`;
  const cards = design === "zefir" && children.length ? `<div class="sb-intro-pair"><figure>${photo(children[0].imageUrl, `photos.${c.photos.indexOf(children[0])}.imageUrl`, e, "", false)}<figcaption>${esc(children[0].caption)}</figcaption></figure><button class="sb-flip" type="button" aria-pressed="false"><span class="sb-flip-front">${doodle("heart")}${L("zefir.flip", "Кто же?")}</span><span class="sb-flip-back">${children[1] ? photo(children[1].imageUrl, `photos.${c.photos.indexOf(children[1])}.imageUrl`, e, "", false) : photo(c.imageUrl, "imageUrl", e, "", false)}${L("zefir.flip-answer", "Это любовь!")}</span></button></div>` : envelope;
  return `<div class="sb-intro" hidden><div class="sb-intro-card">${labels}${cards}<button class="sb-open" type="button">${L(`${design}.intro-open`, "Открыть приглашение")}</button></div></div>`;
}

function calendar(date: Date, timezone: string, design: Design): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const n = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const day = n("day"), month = n("month"), year = n("year");
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthText = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, month: "long", year: "numeric" }).format(date);
  return `<div class="sb-calendar-paper"><p class="sb-month">${esc(monthText)}</p><div class="sb-calendar">${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((v, i) => L(`${design}.weekday-${i}`, v, { className: "sb-weekday" })).join("")}${'<span aria-hidden="true"></span>'.repeat(start)}${Array.from({ length: count }, (_, i) => `<span${i + 1 === day ? ' class="sb-selected" aria-current="date"' : ""}>${i + 1}${i + 1 === day ? doodle("heart") : ""}</span>`).join("")}</div></div>`;
}

export function renderScrapbookBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: Context): string {
  const design = theme.template as Design;
  const names = (blocks.find(b => b.type === "COVER")?.content as BlockContentMap["COVER"] | undefined)?.names ?? "";
  return blocks.filter(b => b.visible).map(block => {
    const e = editAttrs(block.id, ctx.editable);
    const frame = (cls: string, body: string, id = "") => `<section class="sb-section ${cls}"${id ? ` id="${id}"` : ""}${e.section()}>${e.tools()}${body}</section>`;
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        const date = ctx.eventDate ? [new Intl.DateTimeFormat("ru-RU", { timeZone: ctx.timezone, day: "2-digit", month: "2-digit", year: "numeric" }).format(ctx.eventDate), theme.wedding?.city].filter(Boolean).join(" · ") : c.dateText;
        const children = c.photos.map((p, i) => p.imageUrl || ctx.editable ? `<figure class="sb-child">${photo(p.imageUrl, `photos.${i}.imageUrl`, e)}<figcaption${e.text(`photos.${i}.caption`)}>${esc(p.caption)}</figcaption></figure>` : "").join("");
        return frame("sb-cover", `${intro(c, e, design, names)}${theme.musicUrl ? `<audio class="sb-music" src="${esc(theme.musicUrl)}" preload="none" loop></audio><button class="sb-music-toggle" type="button" aria-pressed="false">${L(`${design}.music`, "Музыка ♫")}</button>` : ""}<div class="sb-cover-title"><p${e.text("title")}>${esc(c.title)}</p>${doodle("star")}</div><div class="sb-hero-frame">${photo(c.imageUrl, "imageUrl", e, "sb-hero-photo", false)}${doodle("heart")}${L(`${design}.photo-note`, "это мы ♡", { className: "sb-photo-note" })}</div><div class="sb-cover-heading"><h1 class="sb-names"${e.text("names")}>${esc(c.names).replace(/\s+(?:и|&)\s+/i, '<i> &amp;<wbr> </i>')}</h1><p class="sb-date"${e.text("dateText")}>${esc(date)}</p></div>${paragraph(c.subtitle, "subtitle", e)}${children ? `<div class="sb-childhood"><p class="sb-hand">${L(`${design}.childhood-title`, "А начиналось всё вот так…")}</p><div class="sb-child-grid">${children}</div>${doodle("flower")}</div>` : ""}`);
      }
      case "CALENDAR": {
        const c = block.content as BlockContentMap["CALENDAR"];
        return frame("sb-date-section", `${heading(c.title, e)}${ctx.eventDate ? calendar(ctx.eventDate, ctx.timezone, design) : ""}${paragraph(c.message, "message", e)}`);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return frame("sb-countdown", `${heading(c.title, e)}${ctx.eventDate ? countdownCells(c, ctx.eventDate, e) : ""}${doodle("star")}`);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        const icons = ["glasses", "rings", "flower", "cake", "star"] as const;
        return frame("sb-timeline", `${heading(c.title, e)}<ol>${c.items.map((item, i) => `<li>${item.icon ? photo(item.icon, `items.${i}.icon`, e, "sb-timing-icon") : doodle(icons[i % icons.length])}<time${e.text(`items.${i}.time`)}>${esc(item.time)}</time><div><h3${e.text(`items.${i}.title`)}>${esc(item.title)}</h3>${paragraph(item.note, `items.${i}.note`, e)}</div>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${i}" title="Удалить пункт">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? '<button type="button" class="sb-add" data-block-action="add-detail">+ Добавить пункт</button>' : ""}`);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame("sb-venue", `${heading(c.title, e)}${photo(c.imageUrl, "imageUrl", e, "sb-venue-photo")}<h3${e.text("name")}>${esc(c.name)}</h3>${paragraph(c.address, "address", e)}${paragraph(c.note, "note", e)}${c.mapUrl ? `<a class="sb-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"><span${e.text("mapLabel")}>${esc(c.mapLabel || "Построить маршрут")}</span> ↗</a>` : ""}${e.link("mapUrl", c.mapUrl)}`);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        return frame("sb-map", `${heading(c.title, e)}${paragraph(c.note, "note", e)}${["yandexUrl", "googleUrl"].map(key => { const url = c[key as "yandexUrl" | "googleUrl"]; return `${url ? `<a class="sb-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${L(`${design}.${key}`, key === "yandexUrl" ? "Яндекс Карты" : "Google Maps")}</a>` : ""}${e.link(key, url)}`; }).join("")}`);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame("sb-dresscode", `${doodle("flower")}${heading(c.title, e)}${paragraph(c.text, "text", e)}<div class="sb-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" data-color="${esc(color)}" aria-label="${esc(color)}"${e.color(`palette.${i}`)}></span>`).join("")}</div>${photo(c.imageUrl, "imageUrl", e, "sb-outfits")}`);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return frame("sb-album", `${heading(c.title, e)}<div class="sb-gallery">${c.items.map((p, i) => p.imageUrl || ctx.editable ? `<figure>${photo(p.imageUrl, `items.${i}.imageUrl`, e)}<figcaption${e.text(`items.${i}.caption`)}>${esc(p.caption)}</figcaption></figure>` : "").join("")}</div>`);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"] & { wishlist?: boolean };
        return frame(c.wishlist ? "sb-wishlist" : "sb-note", `${c.tag || ctx.editable ? `<p class="sb-hand"${e.text("tag")}>${esc(c.tag)}</p>` : ""}${heading(c.title, e)}${paragraph(c.text, "text", e)}${c.wishlist ? "" : doodle("heart")}`);
      }
      case "RSVP_FORM": {
        const c = block.content as BlockContentMap["RSVP_FORM"];
        return frame("sb-rsvp", `${heading(c.title, e)}${paragraph(c.text, "text", e)}${inlineRsvpForm(block)}`, "rsvp");
      }
      default: return "";
    }
  }).join("");
}
