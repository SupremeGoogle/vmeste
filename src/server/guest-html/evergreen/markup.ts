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

function section(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  return `<section class="${className}" data-evergreen-block="${block.type}" data-block-id="${esc(block.id)}">${tools(block, editable)}${body}</section>`;
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
      return section(block, "eg-cover", `<div class="eg-cover-media">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt=""${editable ? ` data-image-edit data-block-id="${esc(block.id)}" data-path="imageUrl"` : ""}>` : ""}</div><div class="eg-cover-copy"><p class="eg-eyebrow"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</p>${names(c.names, block.id, editable)}<span class="eg-gold-line"></span><p class="eg-date"${editable ? attrs(block.id, "dateText") : ""}>${esc(c.dateText)}</p><p class="eg-cover-subtitle"${editable ? attrs(block.id, "subtitle", true) : ""}>${esc(c.subtitle)}</p></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /до встречи|с любовью/i.test(c.title);
      return section(block, closing ? "eg-closing" : "eg-intro", `<h2${editable ? attrs(block.id, "title", true) : ""}>${esc(c.title)}</h2>${closing ? '<span class="eg-gold-line"></span>' : ""}<p class="eg-copy"${editable ? attrs(block.id, "text", true) : ""}>${esc(c.text)}</p>`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      return section(block, "eg-gallery", `<div class="eg-location-head"><p class="eg-label">Destination</p><h2${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2></div>${c.items.map((item, index) => `<figure class="eg-photo">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt=""${editable ? ` data-image-edit data-block-id="${esc(block.id)}" data-path="items.${index}.imageUrl"` : ""}>` : ""}<figcaption${editable ? attrs(block.id, `items.${index}.caption`) : ""}>${esc(item.caption)}</figcaption></figure>`).join("")}`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      return section(block, "eg-venue", `<p class="eg-label"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</p><h2${editable ? attrs(block.id, "name") : ""}>${esc(c.name)}</h2><p class="eg-address"${editable ? attrs(block.id, "address", true) : ""}>${esc(c.address)}</p><p class="eg-note"${editable ? attrs(block.id, "note", true) : ""}>${esc(c.note)}</p>`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return section(block, "eg-timeline", `<p class="eg-label">Wedding details</p><h2 class="eg-section-title"${editable ? attrs(block.id, "title") : ""}>${esc(c.title)}</h2><ol class="eg-schedule">${c.items.map((item, index) => `<li><time${editable ? attrs(block.id, `items.${index}.time`) : ""}>${esc(item.time)}</time><div><strong${editable ? attrs(block.id, `items.${index}.title`) : ""}>${esc(item.title)}</strong><small${editable ? attrs(block.id, `items.${index}.note`) : ""}>${esc(item.note)}</small></div></li>`).join("")}</ol>`, editable);
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
  return blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
