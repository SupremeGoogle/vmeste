import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";

function flower(className = ""): string {
  return `<svg class="silk-flower ${className}" viewBox="0 0 150 190" fill="none" aria-hidden="true"><path class="silk-stem" pathLength="1" d="M22 181C45 142 45 92 94 22M45 138C27 123 18 105 20 83M58 111C83 102 101 84 110 61M76 78C61 63 58 48 62 31"/><g class="silk-leaves"><path d="M39 141C12 133 7 111 12 94C35 102 45 119 39 141Z"/><path d="M57 113C80 107 95 91 98 74C76 77 61 91 57 113Z"/><path d="M75 80C52 70 49 52 55 38C75 47 82 62 75 80Z"/></g><g class="silk-blossom"><path d="M91 35C75 18 83 3 100 10C106-3 126 4 121 21C140 18 146 37 130 47C141 61 124 74 111 61C100 77 82 66 88 50C70 53 68 37 91 35Z"/><circle cx="108" cy="37" r="5"/></g></svg>`;
}

function namesMarkup(value: string): string {
  const parts = value.trim().split(/\s+(?:и|&|and)\s+/i);
  if (parts.length !== 2) return esc(value);
  return `<span>${esc(parts[0])}</span><i>&amp;</i><span>${esc(parts[1])}</span>`;
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
): string {
  const e = editAttrs(block.id, editable);
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      return wrap(block, "silk-cover", `<div class="silk-cover-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high"${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span>` : ""}</div><div class="silk-petals" aria-hidden="true">${"<i></i>".repeat(9)}</div><div class="silk-cover-wave"><div class="silk-cover-copy"><p class="silk-kicker"${e.text("title")}>${esc(c.title)}</p><h1 class="silk-names"${e.text("names", { join: " и " })}>${namesMarkup(c.names)}</h1><span class="silk-rule"></span><p class="silk-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="silk-cover-note"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div></div><div class="silk-scroll" aria-hidden="true"><span></span><small>листайте</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /благодар|до встречи|с любовью/i.test(c.title);
      if (closing) {
        return wrap(block, "silk-closing", `${flower("silk-flower-left")}<p class="silk-script"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="silk-rule"></span><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, editable);
      }
      return wrap(block, "silk-story", `${flower("silk-flower-right")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="silk-rule"></span><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="silk-note-card" aria-hidden="true"><span>♡</span><i>∞</i></div>`, editable);
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
      const result = answered === "yes" ? "Спасибо, мы будем вас ждать!" : answered === "no" ? "Спасибо, что сообщили нам." : "";
      return wrap(block, "silk-rsvp", `${flower("silk-flower-left")}<p class="silk-section-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="silk-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${result ? `<p class="silk-answer">${result}</p>` : rsvpHref ? `<a class="silk-cta" href="${esc(rsvpHref)}"${editable ? ' data-editor-ui' : ""}><b${e.text("buttonLabel")}>${esc(c.buttonLabel)}</b> <span>→</span></a>` : `<span class="silk-cta"><b${e.text("buttonLabel")}>${esc(c.buttonLabel)}</b> <span>→</span></span>`}`, editable);
    }
    default:
      return "";
  }
}

export function renderSilkBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  const chrome = `<div class="silk-progress" aria-hidden="true"><i></i></div><div class="silk-ribbon silk-ribbon-one" aria-hidden="true"></div><div class="silk-ribbon silk-ribbon-two" aria-hidden="true"></div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
