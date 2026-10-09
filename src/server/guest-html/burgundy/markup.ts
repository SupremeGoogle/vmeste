import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";
import { yandexMapEmbed } from "@/server/guest-html/personalization";
import { initials } from "@/lib/invite-personalization";
import { gl, guestLang } from "@/server/guest-html/guest-lang";

type Context = { eventDate?: Date; editable: boolean };

function section(block: InviteBlockView, cls: string, body: string, editable: boolean, id = "") {
  const e = editAttrs(block.id, editable);
  return `<section class="bw-section ${cls}"${id ? ` id="${id}"` : ""}${e.section()}>${e.tools()}${body}</section>`;
}

export function renderBurgundyBlocks(blocks: InviteBlockView[], ctx: Context): string {
  return blocks.map((block, index) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        return section(block, "bw-cover", `
          <button class="bw-envelope" type="button" aria-label="${gl("Открыть приглашение", "Open the invitation")}">
            <span class="bw-envelope-paper"></span><span class="bw-envelope-top"></span>
            <span class="bw-envelope-bottom"></span><span class="bw-envelope-seal" aria-hidden="true">${esc(initials(c.names))}</span>
            <span class="bw-envelope-caption">${L("burgundy.t3", gl("нажмите, чтобы открыть", "tap to open"))}</span>
          </button>
          ${c.imageUrl ? `<img class="bw-hero-image" src="${esc(c.imageUrl)}" alt="${gl("Акварельная арка и лебеди", "Watercolor arch with swans")}"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить изображение обложки", "Add a cover image")}</span>` : ""}
          <div class="bw-hero-copy"><span class="bw-kicker">${L("burgundy.t5", gl("приглашение на свадьбу", "wedding invitation"))}</span>
            <h1${e.text("names", { join: gl(" и ", " & ") })}>${esc(c.names)}</h1>
            <span class="bw-hero-rule" aria-hidden="true">✦</span>
            <p class="bw-hero-title"${e.text("title")}>${esc(c.title)}</p>
            <p class="bw-hero-date"${e.text("dateText")}>${esc(c.dateText)}</p>
          </div><a class="bw-scroll-cue" href="#bw-letter" aria-label="${gl("Листать к приглашению", "Scroll to the invitation")}">⌄</a>`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        if ((c as { wishlist?: boolean }).wishlist) return section(block, "bw-letter bw-wishlist", `<h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
        if (index === blocks.length - 1) return section(block, "bw-finale", `<span class="bw-finale-ornament">❦</span><p class="bw-kicker"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
        return section(block, "bw-letter", `<span class="bw-flower-mark">✿</span><p class="bw-kicker"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="bw-letter-swan" aria-hidden="true">♡</div>`, ctx.editable, "bw-letter");
      }
      case "COUNTDOWN": {
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return section(block, "bw-countdown", `<p class="bw-kicker">${L("burgundy.t6", gl("скоро увидимся", "see you soon"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="bw-clock" data-until="${ctx.eventDate?.getTime() ?? 0}" data-done="${esc(c.doneText)}">${["days", "hours", "minutes", "seconds"].map((unit, i) => `<div><strong data-unit="${unit}">00</strong><span>${(guestLang() === "en" ? ["days", "hours", "minutes", "seconds"] : ["дней", "часов", "минут", "секунд"])[i]}</span></div>`).join("")}</div><span class="bw-divider">❦</span>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return section(block, "bw-timeline", `<span class="bw-section-flower">✿</span><p class="bw-kicker">${L("burgundy.t4", gl("наш особенный день", "our special day"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, i) => `<li><time${e.text(`items.${i}.time`)}>${esc(item.time)}</time><span class="bw-timeline-dot" aria-hidden="true">✿</span><div><h3${e.text(`items.${i}.title`)}>${esc(item.title)}</h3><p${e.text(`items.${i}.note`)}>${esc(item.note)}</p></div>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${i}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button type="button" class="bw-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return section(block, "bw-venue", `<p class="bw-kicker">${L("burgundy.t1", gl("ждём вас здесь", "join us here"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="bw-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.imageUrl ? `<img class="bw-venue-image" src="${esc(c.imageUrl)}" alt="${gl("Место торжества", "Wedding venue")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фото места", "Add a venue photo")}</span>` : ""}<h3${e.text("name")}>${esc(c.name)}</h3><p class="bw-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>${c.mapUrl ? `<div class="bw-map-frame"><iframe title="${gl("Карта места торжества", "Map of the venue")}" src="${esc(yandexMapEmbed(c.mapUrl, c.name, c.address))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div><a class="bw-map" href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"><span class="bw-map-pin">♥</span><span${e.text("mapLabel")}>${esc(c.mapLabel)}</span> ↗</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}`, ctx.editable);
      }
      case "DRESSCODE": {
        const c = block.content as BlockContentMap["DRESSCODE"];
        return section(block, "bw-dress", `<p class="bw-kicker">${L("burgundy.t2", gl("маленькая просьба", "a small request"))}</p><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="bw-palette">${c.palette.map((color, i) => `<span style="background:${esc(color)}" aria-label="${gl("Цвет", "Color")} ${i + 1}"${e.color(`palette.${i}`)}></span>`).join("")}</div>`, ctx.editable);
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        return section(block, "bw-fashion", `<p class="bw-kicker"${e.text("title")}>${esc(c.title)}</p>${c.items.map((item, i) => `${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>${gl("Добавить фотографию", "Add a photo")}</span>` : ""}<span class="bw-fashion-caption"${e.text(`items.${i}.caption`)}>${esc(item.caption)}</span>`).join("")}`, ctx.editable);
      }
      case "RSVP_FORM": {
        // Анкета прямо в приглашении (стандарт, §2): шапка в стиле шаблона, форма общая.
        const c = block.content as BlockContentMap["RSVP_FORM"];
        return section(block, "bw-letter bw-rsvp", `<span class="bw-flower-mark">✿</span><p class="bw-kicker"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, ctx.editable, "rsvp");
      }
      default: return "";
    }
  }).join("");
}
