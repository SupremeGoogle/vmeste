import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";
import { gl } from "@/server/guest-html/guest-lang";

function branch(className = ""): string {
  return `<svg class="pearl-branch ${className}" viewBox="0 0 180 260" fill="none" aria-hidden="true"><path class="pearl-branch-line" pathLength="1" d="M20 248C44 202 42 154 81 119C112 91 126 55 137 13M55 177C31 166 19 146 20 123M74 132C104 124 122 105 129 80M102 88C82 69 78 48 84 28"/><g class="pearl-leaves"><path d="M54 179C21 170 9 145 15 122C44 131 59 151 54 179Z"/><path d="M75 134C105 129 124 108 129 85C100 88 80 106 75 134Z"/><path d="M104 90C77 77 73 52 82 32C107 43 116 66 104 90Z"/><path d="M120 55C143 51 158 37 164 20C142 20 125 34 120 55Z"/></g><g class="pearl-buds"><circle cx="137" cy="13" r="7"/><circle cx="20" cy="123" r="5"/><circle cx="129" cy="80" r="4"/></g></svg>`;
}

function namesMarkup(value: string): string {
  const parts = value.trim().split(/\s+(?:и|&|and)\s+/i);
  if (parts.length !== 2) return esc(value);
  return `<span>${esc(parts[0])}</span><i>&amp;<wbr></i><span>${esc(parts[1])}</span>`;
}

function dayIcon(index: number): string {
  const icons = [
    `<path d="M8 21h16M11 21v-8h10v8M13 13V9h6v4M16 9V5"/>`,
    `<circle cx="16" cy="16" r="7"/><path d="M11 11l10 10M21 11 11 21"/>`,
    `<path d="M9 6v8a7 7 0 0 0 14 0V6M16 21v5M12 26h8"/>`,
    `<path d="M8 24c3-7 13-7 16 0M12 10a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"/>`,
  ];
  return `<svg class="pearl-day-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">${icons[index % icons.length]}</svg>`;
}

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-pearl-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

function renderBlock(
  block: InviteBlockView,
  rsvpHref: string | null,
  answered: string | null,
  editable: boolean,
): string {
  const e = editAttrs(block.id, editable);
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      return wrap(block, "pearl-cover", `<div class="pearl-cover-caption">${L("pearl.caption.left", gl("Наша история", "Our story"), { tag: "span" })}${L("pearl.caption.right", gl("Вместе навсегда", "Together forever"), { tag: "span" })}</div>${branch("pearl-cover-branch pearl-branch-left")}${branch("pearl-cover-branch pearl-branch-right")}<div class="pearl-portrait-wrap"><div class="pearl-portrait">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high" data-pearl-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фотографию пары", "Add a photo of the two of you")}</span>` : ""}</div><i class="pearl-orbit pearl-orbit-one"></i><i class="pearl-orbit pearl-orbit-two"></i><i class="pearl-orbit pearl-orbit-three"></i></div><div class="pearl-cover-copy"><p class="pearl-eyebrow"${e.text("title")}>${esc(c.title)}</p><h1 class="pearl-names"${e.text("names", { join: gl(" и ", " & ") })}>${namesMarkup(c.names)}</h1><span class="pearl-diamond" aria-hidden="true"></span><p class="pearl-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="pearl-cover-note"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div><div class="pearl-scroll" aria-hidden="true"><span></span><small>${L("pearl.t3", gl("Листайте", "Scroll"))}</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /до встречи|с любовью|благодар|see you|with love|gratitude/i.test(c.title);
      if (closing) {
        return wrap(block, "pearl-closing", `${branch("pearl-closing-branch pearl-branch-left")}${branch("pearl-closing-branch pearl-branch-right")}<div class="pearl-closing-rings" aria-hidden="true"><i></i><i></i></div><p class="pearl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="pearl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><span class="pearl-heart">♡</span>`, editable);
      }
      return wrap(block, "pearl-story", `${branch("pearl-story-branch")}<p class="pearl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="pearl-rule"></span><p class="pearl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${(c as { wishlist?: boolean }).wishlist ? "" : `<blockquote aria-hidden="true">“<span>${L("pearl.t4", gl("Любовь живёт в деталях", "Love lives in the details"))}</span>”</blockquote>`}`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const map = c.mapUrl ? `<a class="pearl-map" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || gl("Открыть на карте", "View on map"))} <span>→</span></a>` : "";
      return wrap(block, "pearl-venue", `<p class="pearl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="pearl-venue-frame"><div class="pearl-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async" data-pearl-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Добавить фотографию локации", "Add a venue photo")}</span>` : ""}</div><div class="pearl-venue-glass"><h3${e.text("name")}>${esc(c.name)}</h3><p class="pearl-address"${e.text("address")}>${esc(c.address)}</p></div></div><p class="pearl-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${map}${editable ? e.link("mapUrl", c.mapUrl) : ""}`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      const items = c.items.map((item, index) => `<li>${dayIcon(index)}<time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong><small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить деталь", "Remove detail")}">×</button>` : ""}</li>`).join("");
      return wrap(block, "pearl-timeline", `${branch("pearl-timeline-branch")}<p class="pearl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${items}</ol>${editable ? `<button type="button" class="pearl-add-detail" data-block-action="add-detail">${gl("+ Добавить деталь дня", "+ Add a detail")}</button>` : ""}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return wrap(block, "pearl-dress", `<p class="pearl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="pearl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="pearl-palette">${c.palette.map((color, index) => `<i style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return wrap(block, "pearl-rsvp", `<p class="pearl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="pearl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, editable);
    }
    default:
      return "";
  }
}

export function renderPearlBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  const chrome = `<div class="pearl-progress" aria-hidden="true"><i></i></div><div class="pearl-ambient" aria-hidden="true">${"<i></i>".repeat(12)}</div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
