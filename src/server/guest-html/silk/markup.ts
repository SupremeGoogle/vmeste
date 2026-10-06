import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";

function flower(className = ""): string {
  return `<svg class="silk-flower ${className}" viewBox="0 0 150 190" fill="none" aria-hidden="true"><path class="silk-stem" pathLength="1" d="M22 181C45 142 45 92 94 22M45 138C27 123 18 105 20 83M58 111C83 102 101 84 110 61M76 78C61 63 58 48 62 31"/><g class="silk-leaves"><path d="M39 141C12 133 7 111 12 94C35 102 45 119 39 141Z"/><path d="M57 113C80 107 95 91 98 74C76 77 61 91 57 113Z"/><path d="M75 80C52 70 49 52 55 38C75 47 82 62 75 80Z"/></g><g class="silk-blossom"><path d="M91 35C75 18 83 3 100 10C106-3 126 4 121 21C140 18 146 37 130 47C141 61 124 74 111 61C100 77 82 66 88 50C70 53 68 37 91 35Z"/><circle cx="108" cy="37" r="5"/></g></svg>`;
}

/** Объёмная couture-композиция с отдельной SVG-анимацией нитей и лепестков. */
function coutureSculpture(): string {
  return `<figure class="silk-couture-scene" aria-hidden="true"><img src="/media/invite-silk/couture-sculpture.webp" alt="" loading="lazy" decoding="async"><svg class="silk-loom" viewBox="0 0 400 500" fill="none"><path class="silk-thread silk-thread-one" pathLength="1" d="M-25 385C79 308 99 205 190 232C275 257 302 128 432 85"/><path class="silk-thread silk-thread-two" pathLength="1" d="M-31 423C92 347 125 428 218 329C292 250 296 169 438 132"/><g class="silk-glass-petal silk-glass-petal-one"><path d="M0 0C24-13 40 0 34 22C28 41 8 43 0 0Z"/><path d="M3 4C13 14 21 22 29 31"/></g><g class="silk-glass-petal silk-glass-petal-two"><path d="M0 0C24-13 40 0 34 22C28 41 8 43 0 0Z"/><path d="M3 4C13 14 21 22 29 31"/></g><g class="silk-glass-petal silk-glass-petal-three"><path d="M0 0C24-13 40 0 34 22C28 41 8 43 0 0Z"/><path d="M3 4C13 14 21 22 29 31"/></g></svg><figcaption><span>${L("silk.t2", "Ткань нашей истории")}</span><b>∞</b></figcaption></figure>`;
}

function namesMarkup(value: string): string {
  const parts = value.trim().split(/\s+(?:и|&|and)\s+/i);
  if (parts.length !== 2) return esc(value);
  return `<span>${esc(parts[0])}</span><i>&amp;<wbr></i><span>${esc(parts[1])}</span>`;
}

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-silk-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

function renderBlock(
  block: InviteBlockView,
  rsvpHref: string | null,
  answered: string | null,
  editable: boolean,
  names: string,
): string {
  const e = editAttrs(block.id, editable);
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      return wrap(block, "silk-cover", `<div class="silk-cover-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high"${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span>` : ""}</div><div class="silk-petals" aria-hidden="true">${"<i></i>".repeat(9)}</div><div class="silk-cover-wave"><div class="silk-cover-copy"><p class="silk-kicker"${e.text("title")}>${esc(c.title)}</p><h1 class="silk-names"${e.text("names", { join: " и " })}>${namesMarkup(c.names)}</h1><span class="silk-rule"></span><p class="silk-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="silk-cover-note"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div></div><div class="silk-scroll" aria-hidden="true"><span></span><small>${L("silk.t4", "листайте")}</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /благодар|до встречи|с любовью/i.test(c.title);
      if (closing) {
        return wrap(block, "silk-closing", `${flower("silk-flower-left")}<p class="silk-script"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="silk-rule"></span><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${names ? `<p class="silk-signature">${namesMarkup(names)}</p>` : ""}`, editable);
      }
      // У виш-листа — только шапка: скульптура и записка под ним были бы
      // повтором истории пары.
      if ((c as { wishlist?: boolean }).wishlist) {
        return wrap(block, "silk-story silk-wishlist", `${flower("silk-flower-right")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="silk-rule"></span><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, editable);
      }
      return wrap(block, "silk-story", `${flower("silk-flower-right")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="silk-rule"></span><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${coutureSculpture()}<figure class="silk-note-card" aria-hidden="true"><blockquote>${L("silk.t1", "Одна любовь,")}<br>${L("silk.t6", "одна история —")}<br>${L("silk.t3", "и целая жизнь вдвоём")}</blockquote><figcaption><span>♡</span>${L("silk.t5", "навсегда")}<span>∞</span></figcaption></figure>`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      return wrap(block, "silk-weekend", `${flower("silk-flower-left")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="silk-weekend-grid">${items.map((item, index) => `<figure class="silk-event-card${index === 0 ? " silk-event-main" : ""}"><div class="silk-event-photo">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-silk-parallax${e.image(`items.${index}.imageUrl`)}>` : `<span class="silk-empty ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить фотографию</span>`}</div><figcaption${e.text(`items.${index}.caption`)}>${esc(item.caption)}</figcaption><b>${String(index + 1).padStart(2, "0")}</b></figure>`).join("")}</div>`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      return wrap(block, "silk-venue", `<div class="silk-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" data-silk-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию локации</span>` : ""}<span${e.text("tag")}>${esc(c.tag)}</span></div><div class="silk-venue-card"><p class="silk-section-tag"${e.text("title")}>${esc(c.title)}</p><h2${e.text("name")}>${esc(c.name)}</h2><p class="silk-address"${e.text("address")}>${esc(c.address)}</p><p class="silk-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p></div>`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return wrap(block, "silk-timeline", `${flower("silk-flower-right")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, index) => `<li><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong><small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</li>`).join("")}</ol>${editable ? '<button type="button" class="silk-add-detail" data-block-action="add-detail">+ Добавить деталь дня</button>' : ""}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return wrap(block, "silk-dress", `<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="silk-palette">${c.palette.map((color, index) => `<i style="background:${color}" data-color="${color}"${e.color(`palette.${index}`)}></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return wrap(block, "silk-rsvp", `${flower("silk-flower-left")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, editable);
    }
    default:
      return "";
  }
}

export function renderSilkBlocks(
  blocks: InviteBlockView[],
  theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  // Прощание подписано именами пары — как письмо, а не как раздел сайта.
  const cover = blocks.find((block) => block.type === "COVER")?.content as BlockContentMap["COVER"] | undefined;
  const names = theme.wedding?.names ?? cover?.names ?? "";
  const chrome = `<div class="silk-progress" aria-hidden="true"><i></i></div><div class="silk-ribbon silk-ribbon-one" aria-hidden="true"></div><div class="silk-ribbon silk-ribbon-two" aria-hidden="true"></div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable, names) || standard(block)).join("");
}
