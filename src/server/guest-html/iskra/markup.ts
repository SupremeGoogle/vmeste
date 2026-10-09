import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";
import { localeOf } from "@/lib/i18n";
import { initials } from "@/lib/invite-personalization";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { countdownCells } from "@/server/guest-html/countdown";
import { yandexMapEmbed } from "@/server/guest-html/personalization";

type Context = { eventDate?: Date; timezone: string; editable: boolean; musicUrl: string };

const HEART = '<svg class="ik-heart" viewBox="0 0 80 70" fill="none" aria-hidden="true"><path d="M40 61C24 47 5 34 8 19C11 3 34 2 40 20C49-2 71 8 72 22C73 39 53 51 40 61Z" stroke="currentColor" stroke-width="1.6"/><path d="M42 58C31 43 18 30 20 21" stroke="currentColor" stroke-width=".8"/></svg>';
const LILY = '<svg class="ik-lily" viewBox="0 0 85 160" fill="none" aria-hidden="true"><path d="M43 155C39 119 50 71 44 34M43 132C15 123 12 98 17 83C40 98 43 116 43 132ZM46 100C75 93 80 73 74 56C55 65 46 82 46 100ZM45 42C26 40 14 23 21 9C35 13 44 23 45 42ZM45 42C45 23 53 9 69 6C75 25 62 40 45 42ZM45 42C25 61 5 46 11 30C21 30 34 32 45 42ZM45 42C63 40 82 45 78 62C60 64 48 54 45 42Z" stroke="currentColor" stroke-width="1.3"/></svg>';

function image(url: string, path: string, alt: string, e: EditAttrs, cls = "", lazy = true) {
  return url ? `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}${e.image(path)}>`
    : e.enabled ? `<span class="ie-image-placeholder ${cls}"${e.image(path)}>${gl("Добавить фотографию", "Add a photo")}</span>` : "";
}

function section(block: InviteBlockView, cls: string, body: string, editable: boolean) {
  const e = editAttrs(block.id, editable);
  return `<section class="ik-section ${cls}" id="ik-${esc(block.id)}"${e.section()}>${e.tools()}${body}</section>`;
}

function heading(c: { tag?: string; title: string }, e: EditAttrs) {
  return `${c.tag || e.enabled ? `<p class="ik-kicker"${e.text("tag")}>${esc(c.tag ?? "")}</p>` : ""}<h2${e.text("title")}>${esc(c.title)}</h2>`;
}

function calendar(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const get = (key: string) => Number(parts.find((p) => p.type === key)?.value);
  const [day, month, year] = [get("day"), get("month"), get("year")];
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthName = new Intl.DateTimeFormat(localeOf(guestLang()), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `<div class="ik-calendar"><h3>${esc(monthName)}</h3><div class="ik-calendar-grid">${(guestLang() === "en" ? ["mo", "tu", "we", "th", "fr", "sa", "su"] : ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]).map((d, i) => `<small>${L(`iskra.weekday.${i}`, d)}</small>`).join("")}${Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, i) => {
    const n = i - start + 1;
    return n < 1 || n > count ? '<span aria-hidden="true"></span>' : `<span class="${n === day ? "ik-wedding-day" : ""}"${n === day ? ' aria-current="date"' : ""}>${n === day ? HEART : ""}<b>${n}</b></span>`;
  }).join("")}</div></div>`;
}

export function renderIskraBlocks(blocks: InviteBlockView[], ctx: Context): string {
  const cover = blocks.find((b) => b.type === "COVER")?.content as BlockContentMap["COVER"] | undefined;
  const names = cover?.names ?? "";
  return blocks.map((block) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        const pictures = [{ imageUrl: c.imageUrl, caption: "", path: "imageUrl" }, ...c.photos.map((p, i) => ({ ...p, path: `photos.${i}.imageUrl` }))].filter((p) => p.imageUrl || ctx.editable);
        return section(block, "ik-cover", `
          ${!ctx.editable ? `<div class="ik-intro" hidden><div class="ik-intro-inner"><p class="ik-kicker">${L("iskra.for-you", gl("Для самых близких", "For our dearest"))}</p>
            <div class="ik-closed-box"><div class="ik-box-cover">${HEART}<span class="ik-save">${L("iskra.save", "Save the Date")}</span><span class="ik-box-date">${esc(c.dateText)}</span><span class="ik-stamp">${L("iskra.monogram", initials(c.names))}</span></div></div>
            <p class="ik-intro-names">${esc(c.names)}</p><button type="button" class="ik-button ik-open">${L("iskra.open", gl("Открыть нашу историю", "Open our story"))}</button></div></div>` : ""}
          <p class="ik-kicker"${e.text("title")}>${esc(c.title)}</p>
          <div class="ik-open-box"><div class="ik-letter-mini">${LILY}<span class="ik-mini-script">${L("iskra.mini-letter", gl("Однажды\nи навсегда", "Once\nand forever"), { multiline: true })}</span><span class="ik-mini-mark">${L("iskra.monogram", initials(c.names))}</span></div>
            ${pictures.length ? `<div class="ik-filmstrip">${pictures.map((p) => image(p.imageUrl, p.path, p.caption || c.names, e, "ik-film-photo", false)).join("")}<span class="ik-film-caption">${L("iskra.film", gl("Наша история любви", "Our love story"))}</span></div>` : ""}
            <span class="ik-box-edge" aria-hidden="true"></span></div>
          <div class="ik-cover-copy"><h1${e.text("names", { join: gl(" и ", " & ") })}>${esc(c.names).replace(/\s+(и|&amp;|and)\s+/i, '<i> &amp;<wbr> </i>')}</h1><p class="ik-cover-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="ik-cover-subtitle"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div>
          ${ctx.editable ? `<div class="ik-intro-labels">${L("iskra.for-you", gl("Для самых близких", "For our dearest"))} · ${L("iskra.save", "Save the Date")} · ${L("iskra.open", gl("Открыть нашу историю", "Open our story"))}</div><div class="ik-editor-add">${c.photos.length < 4 ? `<button type="button" data-block-action="add-photo">${gl("+ Добавить фото", "+ Add photo")}</button>` : ""}${c.photos.map((_, i) => `<button type="button" data-block-action="remove-photo" data-item-index="${i}">${gl("Убрать фото", "Remove photo")} ${i + 1}</button>`).join("")}</div>` : ""}
          ${ctx.musicUrl && !ctx.editable ? `<audio class="ik-music" src="${esc(ctx.musicUrl)}" preload="none" loop></audio><button class="ik-music-toggle" type="button" aria-label="${gl("Музыка", "Music")}" aria-pressed="false">♫</button>` : ""}`, ctx.editable);
      }
      case "CALENDAR": {
        const c = block.content as BlockContentMap["CALENDAR"];
        return section(block, "ik-date-section", `${heading(c, e)}${ctx.eventDate ? calendar(ctx.eventDate, ctx.timezone) : ""}<p class="ik-copy"${e.text("message", { multiline: true })}>${esc(c.message)}</p>`, ctx.editable);
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        const clock = ctx.eventDate ? countdownCells(c, ctx.eventDate, e).replace(/<span data-word="(days|hours|minutes|seconds)">[^<]*<\/span>/g, (_match, unit: string) => L(`iskra.clock.${unit}`, (guestLang() === "en" ? { days: "days", hours: "hours", minutes: "minutes", seconds: "seconds" } : { days: "дней", hours: "часов", minutes: "минут", seconds: "секунд" } as Record<string, string>)[unit])) : "";
        return section(block, "ik-countdown", `${heading(c, e)}${clock}${ctx.editable && ctx.eventDate && ctx.eventDate.getTime() > Date.now() ? `<p class="ik-copy"${e.text("doneText")}>${esc(c.doneText)}</p>` : ""}`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return section(block, "ik-program", `${heading(c, e)}<ol class="ik-timeline">${c.items.map((item, i) => `<li><time${e.text(`items.${i}.time`)}>${esc(item.time)}</time><span class="ik-event-heart" aria-hidden="true">♡</span><div><h3${e.text(`items.${i}.title`)}>${esc(item.title)}</h3><p${e.text(`items.${i}.note`, { multiline: true })}>${esc(item.note)}</p></div>${ctx.editable ? `<button class="ie-remove-detail" type="button" data-block-action="remove-detail" data-item-index="${i}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button class="ik-button" type="button" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return section(block, "ik-venue", `${heading(c, e)}<figure class="ik-venue-photo">${image(c.imageUrl, "imageUrl", c.name, e)}<figcaption${e.text("name")}>${esc(c.name)}</figcaption></figure><p class="ik-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p><p class="ik-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.mapUrl ? `<a class="ik-button" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"><span${e.text("mapLabel")}>${esc(c.mapLabel)}</span> ↗</a><div class="ik-map"><iframe src="${esc(yandexMapEmbed(c.mapUrl, c.name, c.address))}" title="${gl("Карта места торжества", "Venue map")}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return section(block, "ik-dress", `${heading(c, e)}<p class="ik-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="ik-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" aria-label="${gl("Цвет", "Color")} ${i + 1}"${e.color(`palette.${i}`)}></span>`).join("")}</div>${image(c.imageUrl, "imageUrl", gl("Примеры праздничных образов", "Outfit ideas"), e, "ik-dress-photo")}`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        const photos = c.items.map((p, i) => ({ ...p, i })).filter((p) => p.imageUrl || ctx.editable);
        return section(block, "ik-photos", `${heading(c, e)}<div class="ik-memories">${photos.map((p) => `<figure>${image(p.imageUrl, `items.${p.i}.imageUrl`, p.caption, e)}<figcaption${e.text(`items.${p.i}.caption`)}>${esc(p.caption)}</figcaption>${ctx.editable ? `<button class="ie-remove-detail" type="button" data-block-action="remove-photo" data-item-index="${p.i}" title="${gl("Убрать фото", "Remove photo")}">×</button>` : ""}</figure>`).join("")}</div>${ctx.editable && c.items.length < 4 ? `<button class="ik-button" type="button" data-block-action="add-photo">${gl("+ Добавить фото", "+ Add photo")}</button>` : ""}`, ctx.editable);
      }
      case "RSVP_FORM": {
        const c = block.content as BlockContentMap["RSVP_FORM"];
        return section(block, "ik-rsvp", `${HEART}${heading(c, e)}<p class="ik-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"] & { wishlist?: boolean };
        // Виш-лист получает чистую шапку; обычный текст — бумажную записку.
        return section(block, c.wishlist ? "ik-wishlist" : "ik-letter-section", `${c.wishlist ? "" : '<div class="ik-paper"><span class="ik-paper-pin" aria-hidden="true"></span>'}${heading(c, e)}<p class="ik-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${c.wishlist ? "" : `</div><p class="ik-signature">${L("iskra.signature", names)}</p>`}`, ctx.editable);
      }
      case "MAP": {
        const c = block.content as BlockContentMap["MAP"];
        return section(block, "ik-route", `${heading(c, e)}<p class="ik-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${[["yandexUrl", c.yandexUrl], ["googleUrl", c.googleUrl]].map(([path, url]) => `${url ? `<a class="ik-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${L(`iskra.map.${path}`, path === "yandexUrl" ? gl("Яндекс Карты", "Yandex Maps") : gl("Google Карты", "Google Maps"))}</a>` : ""}${ctx.editable ? e.link(path, url) : ""}`).join("")}`, ctx.editable);
      }
      default: return "";
    }
  }).join("");
}
