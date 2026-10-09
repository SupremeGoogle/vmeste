import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";
import { gl } from "@/server/guest-html/guest-lang";

type Options = { editable?: boolean };

function attrs(blockId: string, path: string, multiline = false): string {
  return ` data-inline-edit data-block-id="${esc(blockId)}" data-path="${esc(path)}"${multiline ? ' data-multiline="true"' : ""}`;
}

function colorAttrs(blockId: string, path: string, color: string, editable: boolean): string {
  return editable
    ? ` data-color-edit data-block-id="${esc(blockId)}" data-path="${esc(path)}" data-color="${esc(color)}"`
    : "";
}

function imagePlaceholder(blockId: string, path: string, label: string, editable: boolean): string {
  return editable
    ? `<span class="ie-image-placeholder" data-image-edit data-block-id="${esc(blockId)}" data-path="${esc(path)}">${esc(label)}</span>`
    : "";
}

function tools(block: InviteBlockView, editable: boolean): string {
  if (!editable) return "";
  return `<div class="eg-edit-badge" aria-label="${gl("Действия с разделом", "Section actions")}"><button type="button" data-block-action="up" title="${gl("Поднять раздел", "Move section up")}">↑</button><button type="button" data-block-action="down" title="${gl("Опустить раздел", "Move section down")}">↓</button><button type="button" data-block-action="hide" title="${gl("Скрыть раздел", "Hide section")}">${gl("Скрыть", "Hide")}</button></div>`;
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
      return section(block, "eg-cover", `<div class="eg-cover-media">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" data-eg-parallax${editAttrs(block.id, editable).image("imageUrl")}>` : imagePlaceholder(block.id, "imageUrl", gl("Добавить фотографию пары", "Add a photo of the two of you"), editable)}</div><div class="eg-fireflies" aria-hidden="true">${"<i></i>".repeat(9)}</div><svg class="eg-cover-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle class="eg-mark-orbit" cx="43" cy="50" r="25"/><circle class="eg-mark-orbit eg-mark-delay" cx="58" cy="50" r="25"/><path class="eg-mark-spark" d="M50 9V22M50 78V91M9 50H22M78 50H91"/></svg><div class="eg-cover-copy"><p class="eg-eyebrow"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</p>${names(c.names, block.id, editable)}<span class="eg-gold-line"></span><p class="eg-date"${editable ? attrs(block.id, "dateText") : ""}>${esc(c.dateText)}</p><p class="eg-cover-subtitle"${editable ? attrs(block.id, "subtitle", true) : ""}>${esc(c.subtitle)}</p></div><div class="eg-scroll-cue" aria-hidden="true"><span></span><small>${L("evergreen.t2", gl("листайте", "scroll"))}</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /до встречи|с любовью|see you|with love/i.test(c.title);
      return section(block, closing ? "eg-closing" : "eg-intro", `${c.tag || editable ? `<p class="eg-label"${editable ? attrs(block.id, "tag") : ""}>${esc(c.tag)}</p>` : ""}<h2${editable ? attrs(block.id, "title", true) : ""}>${esc(c.title)}</h2>${closing ? '<span class="eg-gold-line"></span>' : ""}<p class="eg-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p>`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const indexed = c.items.map((item, index) => ({ item, index }));
      if (editable && c.items.length < 4) indexed.push({ item: { imageUrl: "", caption: "" }, index: c.items.length });
      const items = indexed.filter(({ item }) => editable || item.imageUrl);
      if (!items.length) return "";
      const mosaic = items.length > 1;
      const photos = items.map(({ item, index }) => `<figure class="eg-photo">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" data-eg-parallax${editAttrs(block.id, editable).image(`items.${index}.imageUrl`)}>` : imagePlaceholder(block.id, `items.${index}.imageUrl`, gl("Добавить фотографию", "Add a photo"), editable)}<figcaption${editable ? attrs(block.id, `items.${index}.caption`) : ""}>${esc(item.caption)}</figcaption><span class="eg-photo-number">${String(index + 1).padStart(2, "0")}</span></figure>`).join("");
      return section(block, `eg-gallery${mosaic ? " eg-gallery-mosaic" : ""}`, `<div class="eg-location-head">${c.tag || editable ? `<p class="eg-label"${editable ? attrs(block.id, "tag") : ""}>${esc(c.tag)}</p>` : ""}<h2${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2></div>${mosaic ? `<div class="eg-mosaic">${photos}</div>` : photos}`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      return section(block, "eg-venue", `${c.imageUrl ? `<div class="eg-photo" style="clip-path:none"><img src="${esc(c.imageUrl)}" alt=""${editAttrs(block.id, editable).image("imageUrl")}></div>` : imagePlaceholder(block.id, "imageUrl", gl("Добавить фотографию площадки", "Add a venue photo"), editable)}<p class="eg-label"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</p><h2${editable ? attrs(block.id, "name") : ""}>${esc(c.name)}</h2><p class="eg-address"${editable ? attrs(block.id, "address", true) : ""}>${esc(c.address)}</p><p class="eg-note"${editable ? attrs(block.id, "note", true) : ""}>${esc(c.note)}</p>${c.mapUrl ? `<a href="${esc(c.mapUrl)}" target="_blank" rel="noopener noreferrer">${L("evergreen.t1", gl("Как добраться ↗", "Get directions ↗"))}</a>` : ""}${editable ? editAttrs(block.id, true).link("mapUrl", c.mapUrl) : ""}`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      const addDetail = editable ? `<button type="button" class="eg-add-detail" data-block-action="add-detail">${gl("＋ Добавить деталь дня", "＋ Add a detail")}</button>` : "";
      return section(block, "eg-timeline", `${c.tag || editable ? `<p class="eg-label"${editable ? attrs(block.id, "tag") : ""}>${esc(c.tag)}</p>` : ""}<h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><ol class="eg-schedule">${c.items.map((item, index) => `<li><time${editable ? attrs(block.id, `items.${index}.time`) : ""}>${esc(item.time)}</time><div><strong${editable ? attrs(block.id, `items.${index}.title`) : ""}>${esc(item.title)}</strong><small${editable ? attrs(block.id, `items.${index}.note`) : ""}>${esc(item.note)}</small></div>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить деталь", "Remove detail")}">×</button>` : ""}</li>`).join("")}</ol>${addDetail}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return section(block, "eg-dress", `${c.tag || editable ? `<p class="eg-label"${editable ? attrs(block.id, "tag") : ""}>${esc(c.tag)}</p>` : ""}<h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><p class="eg-dress-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p><div class="eg-palette">${c.palette.map((color, index) => `<i style="background:${color}"${colorAttrs(block.id, `palette.${index}`, color, editable)}></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return section(block, "eg-rsvp", `${c.tag || editable ? `<p class="eg-label"${editable ? attrs(block.id, "tag") : ""}>${esc(c.tag)}</p>` : ""}<h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><p class="eg-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, editable);
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
  const chrome = `<div class="eg-progress" aria-hidden="true"><i></i></div><div class="eg-journey-rings" aria-hidden="true"><img class="eg-journey-ring eg-ring-one" src="/media/invite-evergreen/flying-ring.webp" alt=""><img class="eg-journey-ring eg-ring-two" src="/media/invite-evergreen/flying-ring.webp" alt=""></div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
