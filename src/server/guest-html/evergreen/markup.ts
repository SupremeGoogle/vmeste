import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";

type Options = { editable?: boolean };

function attrs(blockId: string, path: string, multiline = false): string {
  return ` data-inline-edit data-block-id="${esc(blockId)}" data-path="${esc(path)}"${multiline ? ' data-multiline="true"' : ""}`;
}

function tools(block: InviteBlockView, editable: boolean): string {
  if (!editable) return "";
  return `<div class="eg-edit-badge" aria-label="Действия с разделом"><button type="button" data-block-action="up" title="Поднять раздел">↑</button><button type="button" data-block-action="down" title="Опустить раздел">↓</button><button type="button" data-block-action="hide" title="Скрыть раздел">Скрыть</button></div>`;
}

function vine(order: number): string {
  const side = order % 2 === 0 ? "" : " eg-vine-right";
  return `<svg class="eg-scroll-vine${side}" viewBox="0 0 160 520" fill="none" aria-hidden="true"><path class="eg-vine-line" pathLength="1" d="M35 520C18 442 92 410 59 334C31 269 103 236 82 164C70 121 91 68 133 18"/><g class="eg-vine-leaves"><path d="M57 397C22 387 15 359 19 338C47 349 62 369 57 397Z"/><path d="M66 355C101 343 114 316 108 292C80 305 65 329 66 355Z"/><path d="M78 226C41 214 34 184 40 160C69 174 84 199 78 226Z"/><path d="M88 185C120 169 132 142 124 120C99 135 86 159 88 185Z"/><path d="M111 76C80 63 75 38 81 20C106 31 118 51 111 76Z"/></g></svg>`;
}

function section(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const ornament = className === "eg-cover" ? "" : vine(block.order);
  return `<section class="${className}" data-evergreen-block="${block.type}" data-block-id="${esc(block.id)}">${tools(block, editable)}${ornament}${body}</section>`;
}

function names(value: string, blockId: string, editable: boolean): string {
  const match = value.trim().match(/^(.+?)\s+(?:и|&|and)\s+(.+)$/i);
  const display = match ? `<span class="eg-person">${esc(match[1])}</span><span class="eg-person"><span class="eg-amp">&amp;</span> ${esc(match[2])}</span>` : esc(value);
  return `<h1 class="eg-names"${editable ? attrs(blockId, "names") : ""}>${display}</h1>`;
}

function renderBlock(block: InviteBlockView, rsvpHref: string | null, answered: string | null, editable: boolean): string {
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      return section(block, "eg-cover", `<div class="eg-cover-media">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" data-eg-parallax${editable ? ` data-image-edit data-block-id="${esc(block.id)}" data-path="imageUrl"` : ""}>` : ""}</div><div class="eg-fireflies" aria-hidden="true">${"<i></i>".repeat(9)}</div><svg class="eg-cover-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle class="eg-mark-orbit" cx="43" cy="50" r="25"/><circle class="eg-mark-orbit eg-mark-delay" cx="58" cy="50" r="25"/><path class="eg-mark-spark" d="M50 9V22M50 78V91M9 50H22M78 50H91"/></svg><div class="eg-cover-copy"><p class="eg-eyebrow"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</p>${names(c.names, block.id, editable)}<span class="eg-gold-line"></span><p class="eg-date"${editable ? attrs(block.id, "dateText") : ""}>${esc(c.dateText)}</p><p class="eg-cover-subtitle"${editable ? attrs(block.id, "subtitle", true) : ""}>${esc(c.subtitle)}</p></div><div class="eg-scroll-cue" aria-hidden="true"><span></span><small>листайте</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /до встречи|с любовью/i.test(c.title);
      return section(block, closing ? "eg-closing" : "eg-intro", `<h2${editable ? attrs(block.id, "title", true) : ""}>${esc(c.title)}</h2>${closing ? '<span class="eg-gold-line"></span>' : ""}<p class="eg-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p>`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const mosaic = c.items.length > 1;
      const photos = c.items.map((item, index) => `<figure class="eg-photo">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" data-eg-parallax${editable ? ` data-image-edit data-block-id="${esc(block.id)}" data-path="items.${index}.imageUrl"` : ""}>` : ""}<figcaption${editable ? attrs(block.id, `items.${index}.caption`) : ""}>${esc(item.caption)}</figcaption><span class="eg-photo-number">0${index + 1}</span></figure>`).join("");
      return section(block, `eg-gallery${mosaic ? " eg-gallery-mosaic" : ""}`, `<div class="eg-location-head"><p class="eg-label">${mosaic ? "Our story in frames" : "Destination"}</p><h2${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2></div>${mosaic ? `<div class="eg-mosaic">${photos}</div>` : photos}`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      return section(block, "eg-venue", `<p class="eg-label"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</p><h2${editable ? attrs(block.id, "name") : ""}>${esc(c.name)}</h2><p class="eg-address"${editable ? attrs(block.id, "address", true) : ""}>${esc(c.address)}</p><p class="eg-note"${editable ? attrs(block.id, "note", true) : ""}>${esc(c.note)}</p>`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      const addDetail = editable ? `<button type="button" class="eg-add-detail" data-block-action="add-detail">＋ Добавить деталь дня</button>` : "";
      return section(block, "eg-timeline", `<p class="eg-label">Wedding details</p><h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><ol class="eg-schedule">${c.items.map((item, index) => `<li><time${editable ? attrs(block.id, `items.${index}.time`) : ""}>${esc(item.time)}</time><div><strong${editable ? attrs(block.id, `items.${index}.title`) : ""}>${esc(item.title)}</strong><small${editable ? attrs(block.id, `items.${index}.note`) : ""}>${esc(item.note)}</small></div></li>`).join("")}</ol>${addDetail}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return section(block, "eg-dress", `<p class="eg-label">Attire</p><h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><p class="eg-dress-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p><div class="eg-palette">${c.palette.map((color) => `<i style="background:${color}"></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return section(block, "eg-rsvp", `<p class="eg-label">RSVP</p><h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><p class="eg-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p>${rsvpHref ? `<a class="cta" href="${esc(rsvpHref)}"${editable ? attrs(block.id, "buttonLabel") : ""}>${esc(answered ? "Изменить ответ" : c.buttonLabel)}</a>` : `<span class="cta"${editable ? attrs(block.id, "buttonLabel") : ""}>${esc(c.buttonLabel)}</span>`}`, editable);
    }
    case "MAP": {
      const c = block.content as BlockContentMap["MAP"];
      return section(block, "eg-venue", `<p class="eg-label">Route</p><h2${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><p class="eg-note"${editable ? attrs(block.id, "note", true) : ""}>${esc(c.note)}</p>`, editable);
    }
    default:
      return "";
  }
}

export function renderEvergreenBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: Options = {},
): string {
  const editable = options.editable === true;
  const chrome = `<div class="eg-progress" aria-hidden="true"><i></i></div><img class="eg-journey-ring" src="/media/invite-evergreen/flying-ring.webp" alt="" aria-hidden="true">`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
