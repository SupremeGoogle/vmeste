import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { RUBY_DECOR_IMAGES } from "@/lib/invite-templates/ruby-assets";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";

function rose(className = "", variant: "rose" | "cluster" = "rose"): string {
  return `<img class="ruby-rose ${className}" src="${RUBY_DECOR_IMAGES[variant]}" alt="" loading="lazy" decoding="async" aria-hidden="true">`;
}

function seal(label = "E · J"): string {
  return `<span class="ruby-seal" aria-hidden="true"><i>${esc(label)}</i><svg viewBox="0 0 64 64"><path d="M31 48V17m0 8c-9-7-18-4-21 5 10 5 17 3 21-5Zm1 9c10-5 18-1 20 8-10 4-17 1-20-8Z"/></svg></span>`;
}

function names(value: string): string {
  const parts = value.trim().split(/\s+(?:и|&|and)\s+/i);
  return parts.length === 2 ? `<span>${esc(parts[0])}</span><i>&amp;<wbr></i><span>${esc(parts[1])}</span>` : esc(value);
}

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-ruby-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

function renderBlock(block: InviteBlockView, rsvpHref: string | null, answered: string | null, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      const photo = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high" data-ruby-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span>` : "";
      return wrap(block, "ruby-cover", `${rose("ruby-cover-rose")}<div class="ruby-monogram" aria-hidden="true">${L("ruby.t1", "Вместе")}<br>${L("ruby.t10", "навсегда")}</div><div class="ruby-portrait">${photo}</div><div class="ruby-cover-copy"><p class="ruby-tag"${e.text("title")}>${esc(c.title)}</p><h1 class="ruby-names"${e.text("names", { join: " и " })}>${names(c.names)}</h1><span class="ruby-rule"></span><p class="ruby-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="ruby-copy"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div><a class="ruby-open" href="#ruby-story"><b>${L("ruby.t6", "Открыть приглашение")}</b><span>→</span></a><p class="ruby-cover-foot">${L("ruby.t8", "Разные люди · одна любовь")}</p>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /с любовью|до скорой|до встречи/i.test(`${c.tag} ${c.title}`);
      if (closing) return wrap(block, "ruby-closing", `${rose("ruby-closing-rose", "cluster")}<p class="ruby-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="ruby-rule"></span><p class="ruby-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${seal("♥")}`, editable);
      return wrap(block, "ruby-story", `${rose("ruby-story-rose", "cluster")}<div id="ruby-story"></div><p class="ruby-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="ruby-rule"></span><p class="ruby-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${(c as { wishlist?: boolean }).wishlist ? "" : `<div class="ruby-handnote" aria-hidden="true">${L("ruby.t3", "Здесь живёт")}<br>${L("ruby.t9", "любовь")}</div>`}`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const map = c.mapUrl ? `<a class="ruby-map" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || "Открыть карту")} →</a>` : "";
      return wrap(block, "ruby-venue", `<p class="ruby-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="ruby-venue-card"><div class="ruby-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async" data-ruby-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию локации</span>` : ""}</div><div class="ruby-venue-copy"><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address")}>${esc(c.address)}</p>${map}</div>${seal()}</div><p class="ruby-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${editable ? e.link("mapUrl", c.mapUrl) : ""}`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return wrap(block, "ruby-timeline", `${rose("ruby-timeline-rose")}<p class="ruby-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, index) => `<li><span class="ruby-dot">${["♡", "♢", "✦", "♪"][index % 4]}</span><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong><small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</li>`).join("")}</ol>${editable ? '<button type="button" class="ruby-add-detail" data-block-action="add-detail">+ Добавить деталь дня</button>' : ""}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return wrap(block, "ruby-dress", `<p class="ruby-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="ruby-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="ruby-palette">${c.palette.map((color, index) => `<i style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return wrap(block, "ruby-rsvp", `<p class="ruby-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="ruby-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, editable);
    }
    default:
      return "";
  }
}

export function renderRubyBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  const chrome = `<div class="ruby-progress" aria-hidden="true"><i></i></div><div class="ruby-ribbon ruby-ribbon-a" aria-hidden="true"></div><div class="ruby-ribbon ruby-ribbon-b" aria-hidden="true"></div><div class="ruby-petals" aria-hidden="true">${"<i></i>".repeat(8)}</div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
