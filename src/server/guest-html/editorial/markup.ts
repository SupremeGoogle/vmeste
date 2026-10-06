import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { EditorialDesign } from "@/lib/invite-templates/editorial";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { countdownCells } from "@/server/guest-html/countdown";
import { initialsOf, L } from "@/server/guest-html/template-labels";
import { esc } from "@/server/guest-html/layout";

type Context = { eventDate?: Date; timezone: string; editable: boolean };
const rich = (value: string) => esc(value).replace(/\n/g, "<br>");
const paragraph = (value: string, path: string, e: EditAttrs, cls = "") => value || e.enabled ? `<p${cls ? ` class="${cls}"` : ""}${e.text(path, { multiline: true })}>${rich(value)}</p>` : "";
const heading = (value: string, e: EditAttrs) => `<h2 class="ed-heading"${e.text("title")}>${esc(value)}</h2>`;

function photo(url: string, path: string, e: EditAttrs, cls = "", eager = false): string {
  if (!url) return e.enabled ? `<div class="ed-photo ed-placeholder ${cls}"${e.image(path)}>Добавить фотографию</div>` : "";
  return `<div class="ed-photo ${cls}"><img src="${esc(url)}" alt=""${eager ? ' fetchpriority="high"' : ' loading="lazy"'}${e.image(path)}></div>`;
}

/** Editable stationery, not text baked into the generated artwork. */
function intro(design: EditorialDesign, names: string, e: EditAttrs): string {
  const title = { gazette: "Для вас — особенный выпуск", protokol: "Вам передано секретное дело", postcard: "Открытка для самых близких" }[design];
  const titleLabel = L(`${design}.intro-title`, title, { tag: "h2" });
  const hint = L(`${design}.intro-hint`, "Наша история начинается здесь", { tag: "p" });
  const seal = L(`${design}.seal`, initialsOf(names).join(" & "));
  const open = L(`${design}.intro-open`, design === "gazette" ? "Читать выпуск" : design === "protokol" ? "Открыть дело" : "Открыть открытку");
  const paperTitle = L(`${design}.intro-paper`, design === "gazette" ? "Свадебная газета" : design === "protokol" ? "Дело о взаимной любви" : "С любовью");
  if (e.enabled) return `<details class="ed-intro-settings" data-editor-ui><summary>Надписи заставки</summary>${titleLabel}${hint}<p>${paperTitle}</p><p>${seal}</p><p>${open}</p></details>`;
  const art = design === "postcard" ? '<img class="ed-intro-art" src="/media/invite-editorial/postcard-heart.webp" width="400" height="500" alt="" aria-hidden="true">' : '<span class="ed-intro-lines" aria-hidden="true"></span>';
  return `<div class="ed-intro" hidden><div class="ed-intro-content">${titleLabel}${hint}<div class="ed-intro-paper">${paperTitle}${art}<div class="ed-seal">${seal}</div></div><button class="ed-open" type="button">${open}</button></div></div>`;
}

function nameFields(design: EditorialDesign, who: "groom" | "bride", name: string): string {
  return `<div class="ed-form-lines">${[
    { key: "surname", value: who === "groom" ? "Волков" : "Лебедева", hint: "фамилия" },
    { key: "name", value: name, hint: "имя" },
    { key: "patronymic", value: who === "groom" ? "Сергеевич" : "Андреевна", hint: "отчество" },
  ].map(({ key, value, hint }) => `<div class="ed-form-line"><div class="ed-letter-boxes">${L(`${design}.${who}-${key}`, value, { className: "ed-written" })}</div>${L(`${design}.field-${key}`, hint, { className: "ed-field-hint" })}</div>`).join("")}</div>`;
}

function cover(c: BlockContentMap["COVER"], design: EditorialDesign, e: EditAttrs, ctx: Context, theme: InviteTheme): string {
  const names = `<h1 class="ed-names"${e.text("names")}>${esc(c.names).replace(/\s+(?:и|&)\s+/i, '<i> &amp;<wbr> </i>')}</h1>`;
  const date = ctx.eventDate ? new Intl.DateTimeFormat("ru-RU", { timeZone: ctx.timezone, day: "2-digit", month: "2-digit", year: "numeric" }).format(ctx.eventDate) : c.dateText;
  const dateMarkup = `<p class="ed-date"${e.text("dateText")}>${esc(date)}</p>`;
  const extraPhotos = c.photos.map((p, i) => `<figure>${photo(p.imageUrl, `photos.${i}.imageUrl`, e)}<figcaption${e.text(`photos.${i}.caption`)}>${esc(p.caption)}</figcaption></figure>`).join("");
  if (design === "gazette") return `<header class="ed-masthead"><p${e.text("title")}>${esc(c.title)}</p><div class="ed-edition">${dateMarkup}${L("gazette.city", theme.wedding?.city || "г. Казань", { tag: "p" })}</div></header><div class="ed-cover-copy">${L("gazette.story-kicker", "История одной любви", { tag: "p", className: "ed-script" })}${names}</div><figure class="ed-lead-photo">${photo(c.imageUrl, "imageUrl", e, "ed-cover-image", true)}${L("gazette.photo-caption", "Двое. Одна история. Целая жизнь впереди.", { tag: "figcaption" })}</figure>${paragraph(c.subtitle, "subtitle", e, "ed-editorial-note")}${extraPhotos ? `<div class="ed-gallery">${extraPhotos}</div>` : ""}`;
  if (design === "postcard") return `<p class="ed-post-kicker"${e.text("title")}>${esc(c.title)}</p>${names}${dateMarkup}<div class="ed-post-art">${photo(c.imageUrl, "imageUrl", e, "ed-cover-image", true)}<span class="ed-post-seal">${L("postcard.monogram", initialsOf(c.names).join(" & "))}</span></div>${paragraph(c.subtitle, "subtitle", e)}${L("postcard.scroll", "Листайте нашу историю ↓", { tag: "p", className: "ed-script ed-scroll" })}${extraPhotos ? `<div class="ed-gallery">${extraPhotos}</div>` : ""}`;
  const pair = c.names.split(/\s+(?:и|&|and|\+)\s+/i);
  const portraits = (["groom", "bride"] as const).map((who, index) => {
    const p = c.photos[index];
    const image = p ? photo(p.imageUrl, `photos.${index}.imageUrl`, e, "ed-id-photo", true) : photo("", `photos.${index}.imageUrl`, e, "ed-id-photo");
    return `<div class="ed-person">${L(`protokol.${who}-statement`, who === "groom" ? "Гражданин, действуя по велению сердца:" : "Гражданка, ответившая взаимностью:", { tag: "p", className: "ed-statement" })}${nameFields(design, who, pair[index === 0 ? 1 : 0] ?? pair[0] ?? "")}<figure class="ed-evidence">${image}<figcaption>${p ? `<span${e.text(`photos.${index}.caption`)}>${esc(p.caption)}</span>` : L(`protokol.${who}-role`, who === "groom" ? "Жених" : "Невеста")}${L(`protokol.${who}-photo-note`, "Фото 3 × 4. Особые приметы: влюблённость.", { tag: "small" })}</figcaption></figure></div>`;
  }).join("");
  return `<h2 class="ed-document-title"${e.text("title")}>${esc(c.title)}</h2>${L("protokol.document-subtitle", "о добровольном задержании сердца", { tag: "p", className: "ed-document-subtitle" })}${portraits}${names}<div class="ed-ruling">${L("protokol.ruling", "Решение принято: стать семьёй", { tag: "p" })}${dateMarkup}</div>${paragraph(c.subtitle, "subtitle", e)}${photo(c.imageUrl, "imageUrl", e, "ed-couple-proof")}${L("protokol.stamp", "Любовь подтверждена", { tag: "div", className: "ed-stamp" })}`;
}

function calendar(date: Date, timezone: string, design: EditorialDesign): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const day = part("day"), month = part("month"), year = part("year");
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, month: "long", year: "numeric" }).format(date);
  return `<div class="ed-calendar-paper"><p class="ed-month">${esc(label)}</p><div class="ed-calendar">${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((v, i) => L(`${design}.weekday-${i}`, v, { className: "ed-weekday" })).join("")}${'<span aria-hidden="true"></span>'.repeat(start)}${Array.from({ length: days }, (_, i) => `<span${i + 1 === day ? ' class="ed-selected" aria-current="date"' : ""}>${i + 1}</span>`).join("")}</div></div>`;
}

export function renderEditorialBlocks(blocks: InviteBlockView[], theme: InviteTheme, ctx: Context): string {
  const design = theme.template as EditorialDesign;
  return blocks.filter(b => b.visible).map(block => {
    const e = editAttrs(block.id, ctx.editable);
    const frame = (cls: string, body: string, id = "") => `<section class="ed-section ${cls}"${id ? ` id="${id}"` : ""}${e.section()}>${e.tools()}${body}</section>`;
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        return frame("ed-cover", `${intro(design, c.names, e)}${theme.musicUrl ? `<audio class="ed-music" src="${esc(theme.musicUrl)}" preload="none" loop></audio><button class="ed-music-toggle" type="button" aria-pressed="false">${L(`${design}.music`, "Музыка ♫")}</button>` : ""}${cover(c, design, e, ctx, theme)}`);
      }
      case "CALENDAR": {
        const c = block.content as BlockContentMap["CALENDAR"];
        return frame("ed-calendar-section", `${heading(c.title, e)}${ctx.eventDate ? calendar(ctx.eventDate, ctx.timezone, design) : ""}${paragraph(c.message, "message", e)}`);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return frame("ed-countdown", `${heading(c.title, e)}${ctx.eventDate ? countdownCells(c, ctx.eventDate, e) : ""}`);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return frame("ed-timing", `${heading(c.title, e)}<ol class="ed-program">${c.items.map((p, i) => `<li><time${e.text(`items.${i}.time`)}>${esc(p.time)}</time><div><h3${e.text(`items.${i}.title`)}>${esc(p.title)}</h3>${paragraph(p.note, `items.${i}.note`, e)}</div>${ctx.editable ? `<button type="button" data-editor-ui data-block-action="delete-item" data-item-index="${i}">Удалить пункт</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? '<button type="button" data-editor-ui data-block-action="add-item">+ Пункт программы</button>' : ""}`);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return frame("ed-venue", `${heading(c.title, e)}<h3${e.text("name")}>${esc(c.name)}</h3>${paragraph(c.address, "address", e)}${photo(c.imageUrl, "imageUrl", e, "ed-venue-photo")}${paragraph(c.note, "note", e)}${c.mapUrl ? `<a class="ed-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"><span${e.text("mapLabel")}>${esc(c.mapLabel)}</span> ↗</a>` : ""}${e.link("mapUrl", c.mapUrl)}`);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        return frame("ed-map", `${heading(c.title, e)}${paragraph(c.text, "text", e)}${c.url ? `<a class="ed-button" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${L(`${design}.map-open`, "Открыть карту")} ↗</a>` : ""}${e.link("url", c.url)}`);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return frame("ed-dress", `${heading(c.title, e)}${paragraph(c.text, "text", e)}<div class="ed-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" data-color="${esc(color)}" aria-label="${esc(color)}"${e.color(`palette.${i}`)}></span>`).join("")}</div>${photo(c.imageUrl, "imageUrl", e, "ed-outfits")}`);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return frame("ed-album", `${heading(c.title, e)}<div class="ed-gallery">${c.items.map((p, i) => `<figure>${photo(p.imageUrl, `items.${i}.imageUrl`, e)}<figcaption${e.text(`items.${i}.caption`)}>${esc(p.caption)}</figcaption></figure>`).join("")}</div>`);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"] & { wishlist?: boolean };
        return frame(c.wishlist ? "ed-wishlist" : "ed-note", `${paragraph(c.tag, "tag", e, "ed-tag")}${heading(c.title, e)}${paragraph(c.text, "text", e)}`);
      }
      case "RSVP_FORM": {
        const c = block.content as BlockContentMap["RSVP_FORM"];
        return frame("ed-rsvp", `${heading(c.title, e)}${paragraph(c.text, "text", e)}${inlineRsvpForm(block)}`, "rsvp");
      }
      default: return "";
    }
  }).join("");
}
