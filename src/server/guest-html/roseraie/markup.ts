import type { BlockContentMap } from "@/lib/invite-blocks";
import { initials } from "@/lib/invite-personalization";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { countdownCells } from "@/server/guest-html/countdown";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";

type Context = { editable: boolean; musicUrl: string; eventDate?: Date };

function section(block: InviteBlockView, cls: string, body: string, editable: boolean, id = "") {
  const e = editAttrs(block.id, editable);
  return `<section class="rr-section ${cls}"${id ? ` id="${id}"` : ""}${e.section()}>${e.tools()}${body}</section>`;
}

export function renderRoseraieBlocks(blocks: InviteBlockView[], ctx: Context): string {
  let photoGroups = 0;
  const names = (blocks.find((block) => block.type === "COVER")?.content as BlockContentMap["COVER"] | undefined)?.names ?? "";
  return blocks.map((block, index) => {
    const e = editAttrs(block.id, ctx.editable);
    switch (block.type) {
      case "COVER": {
        const c = block.content as BlockContentMap["COVER"];
        const [quote, source] = c.subtitle.split("\n");
        return section(block, "rr-cover", `
          <div class="rr-intro" role="presentation"><button class="rr-envelope" type="button" aria-label="${gl("Открыть приглашение", "Open the invitation")}"><span class="rr-envelope-face"></span><span class="rr-envelope-flap"></span><span class="rr-seal">❧</span></button><span class="rr-intro-hint">${L("roseraie.t2", gl("нажмите на печать", "tap the seal"))}</span></div>
          ${c.imageUrl ? `<img class="rr-hero-image" src="${esc(c.imageUrl)}" alt="${gl("Фотография пары", "Photo of the couple")}"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фотографию пары", "Add a photo of the couple")}</span>` : ""}
          <div class="rr-cover-shade"></div><div class="rr-cover-content"><p class="rr-cover-kicker"${e.text("title")}>${esc(c.title)}</p><h1${e.text("names", { join: gl(" и ", " & ") })}>${esc(c.names)}</h1><div class="rr-verse"${e.text("subtitle", { multiline: true })}><p>${esc(quote)}</p>${source ? `<small>${esc(source)}</small>` : ""}</div><p class="rr-cover-date"${e.text("dateText")}>${esc(c.dateText)}</p></div><a href="#rr-letter" class="rr-down" aria-label="${gl("Прокрутить к приглашению", "Scroll to the invitation")}">↓</a>${ctx.musicUrl ? `<audio id="rrMusic" src="${esc(ctx.musicUrl)}" preload="none" loop></audio><button id="rrMusicToggle" class="rr-music" type="button" data-lang="${guestLang()}" aria-label="${gl("Включить музыку", "Play music")}">♫ <span>${L("roseraie.t1", gl("Включить", "Play"))}</span></button>` : ""}`, ctx.editable);
      }
      case "TEXT": {
        const c = block.content as BlockContentMap["TEXT"];
        // Виш-лист — заголовок сверху: в «письме» он стоит подписью под текстом и кнопкой.
        if ((c as { wishlist?: boolean }).wishlist) return section(block, "rr-letter rr-wishlist", `<div class="rr-monogram" aria-hidden="true">${esc(initials(names))}</div><p class="rr-eyebrow"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="rr-letter-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable, "rr-letter");
        if (index === blocks.length - 1) return section(block, "rr-finale", `<span class="rr-finale-mark">${esc(initials(names))}</span><p class="rr-eyebrow"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, ctx.editable);
        return section(block, "rr-letter", `<div class="rr-monogram" aria-hidden="true">${esc(initials(names))}</div><p class="rr-eyebrow"${e.text("tag")}>${esc(c.tag)}</p><p class="rr-letter-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="rr-letter-line"></span>`, ctx.editable, "rr-letter");
      }
      case "PHOTOS": {
        const c = block.content as BlockContentMap["PHOTOS"];
        photoGroups++;
        if (photoGroups > 1) return section(block, "rr-last-photo", `<p class="rr-eyebrow"${e.text("title")}>${esc(c.title)}</p>${c.items.map((item, i) => `<figure>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>${gl("Добавить фотографию", "Add a photo")}</span>` : ""}<figcaption${e.text(`items.${i}.caption`)}>${esc(item.caption)}</figcaption></figure>`).join("")}`, ctx.editable);
        return section(block, "rr-photos", `<p class="rr-eyebrow"${e.text("title")}>${esc(c.title)}</p><div class="rr-photos-stack">${c.items.map((item, i) => `<figure class="rr-photo rr-photo-${i}">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.caption)}" loading="lazy"${e.image(`items.${i}.imageUrl`)}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image(`items.${i}.imageUrl`)}>${gl("Добавить фотографию", "Add a photo")}</span>` : ""}<figcaption${e.text(`items.${i}.caption`)}>${esc(item.caption)}</figcaption></figure>`).join("")}</div>`, ctx.editable);
      }
      case "TIMELINE": {
        const c = block.content as BlockContentMap["TIMELINE"];
        return section(block, "rr-timeline", `<img class="rr-botanical" src="/media/invite-roseraie/botanical.webp" alt="" aria-hidden="true"><div class="rr-timeline-inner"><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, i) => `<li><time${e.text(`items.${i}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${i}.title`)}>${esc(item.title)}</strong><span${e.text(`items.${i}.note`)}>${esc(item.note)}</span></div>${ctx.editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${i}" title="${gl("Удалить пункт", "Remove item")}">×</button>` : ""}</li>`).join("")}</ol>${ctx.editable ? `<button type="button" class="rr-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""}</div>`, ctx.editable);
      }
      case "VENUE": {
        const c = block.content as BlockContentMap["VENUE"];
        return section(block, "rr-venue", `<h2${e.text("title")}>${esc(c.title)}</h2><div class="rr-venue-card">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gl("Место торжества", "Wedding venue")}" loading="lazy"${e.image("imageUrl")}>` : ctx.editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фотографию места", "Add a venue photo")}</span>` : ""}<span class="rr-venue-kicker">${L("roseraie.t3", gl("церемония и ужин", "ceremony & dinner"))}</span><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address", { multiline: true })}>${esc(c.address)}</p><p class="rr-venue-note"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${c.mapUrl ? `<a href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer"${e.text("mapLabel")}>${esc(c.mapLabel || gl("Показать на карте", "View on map"))} ↗</a>` : ""}${ctx.editable ? e.link("mapUrl", c.mapUrl) : ""}</div>`, ctx.editable);
      }
      case "RSVP_FORM": {
        // Анкета прямо в приглашении (стандарт, §2): шапка в стиле шаблона, форма общая.
        const c = block.content as BlockContentMap["RSVP_FORM"];
        return section(block, "rr-letter rr-rsvp", `<p class="rr-eyebrow"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="rr-letter-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, ctx.editable, "rsvp");
      }
      case "COUNTDOWN": {
        // Общий таймер в цветах шаблона (стандарт, §11).
        const c = block.content as BlockContentMap["COUNTDOWN"];
        return ctx.eventDate ? section(block, "rr-countdown", `<h2${e.text("title")}>${esc(c.title)}</h2>${countdownCells(c, ctx.eventDate, e)}`, ctx.editable) : "";
      }
      default: return "";
    }
  }).join("");
}
