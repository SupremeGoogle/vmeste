import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";

function driedStem(className = ""): string {
  return `<svg class="tuscany-stem ${className}" viewBox="0 0 190 300" fill="none" aria-hidden="true"><path class="tuscany-stem-line" pathLength="1" d="M23 292C70 230 53 163 112 103C137 78 153 45 159 9M63 219C29 207 15 180 20 151M78 178C112 166 134 142 140 112M105 119C78 95 74 68 83 45M133 73C110 54 111 31 122 17"/><g class="tuscany-seeds"><path d="M61 222C26 216 11 190 16 157C49 168 66 191 61 222Z"/><path d="M79 181C111 177 134 151 139 119C106 124 84 149 79 181Z"/><path d="M106 122C75 107 70 76 81 50C110 64 120 94 106 122Z"/><path d="M134 76C108 66 106 39 119 20C143 34 148 56 134 76Z"/></g><g class="tuscany-buds"><circle cx="159" cy="9" r="6"/><circle cx="20" cy="151" r="5"/><circle cx="140" cy="112" r="4"/></g></svg>`;
}

function namesMarkup(value: string): string {
  const parts = value.trim().split(/\s+(?:и|&|and)\s+/i);
  if (parts.length !== 2) return esc(value);
  return `<span>${esc(parts[0])}</span><i>&amp;</i><span>${esc(parts[1])}</span>`;
}

function waxSeal(label = "O · D"): string {
  return `<span class="tuscany-seal" aria-hidden="true"><i>${esc(label)}</i><svg viewBox="0 0 64 64"><path d="M32 11c2 10-2 17-12 24m12-24c7 9 8 18 2 28m-4-18c-8-5-14-3-17 4 8 4 14 2 17-4Zm3 8c8-4 14-1 16 6-8 3-13 1-16-6Z"/></svg></span>`;
}

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-tuscany-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
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
      return wrap(block, "tuscany-cover", `<div class="tuscany-cover-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high" data-tuscany-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span>` : ""}<div class="tuscany-cover-words"><span>Two hearts</span><span>A brighter tomorrow</span></div></div>${driedStem("tuscany-cover-stem")}<div class="tuscany-cover-paper"><p class="tuscany-kicker"${e.text("title")}>${esc(c.title)}</p><h1 class="tuscany-names"${e.text("names", { join: " и " })}>${namesMarkup(c.names)}</h1><p class="tuscany-date"${e.text("dateText")}>${esc(c.dateText)}</p><span class="tuscany-pin">⌖</span><p class="tuscany-cover-note"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p>${waxSeal()}</div><div class="tuscany-scroll" aria-hidden="true"><small>История начинается</small><span>↓</span></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /до встречи|с любовью|тоскан/i.test(c.title);
      if (closing) return wrap(block, "tuscany-closing", `${driedStem("tuscany-closing-left")}${driedStem("tuscany-closing-right")}<p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="tuscany-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${waxSeal("∞")}`, editable);
      return wrap(block, "tuscany-story", `${driedStem("tuscany-story-stem")}<p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><span class="tuscany-rule"></span><p class="tuscany-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="tuscany-handnote" aria-hidden="true">Here begins<br>forever <span>♡</span></div>`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const map = c.mapUrl ? `<a class="tuscany-map" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || "Открыть карту")} <span>→</span></a>` : "";
      return wrap(block, "tuscany-venue", `<p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="tuscany-venue-card"><div class="tuscany-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async" data-tuscany-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию локации</span>` : ""}</div><div class="tuscany-venue-copy"><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address")}>${esc(c.address)}</p>${map}</div>${waxSeal()}</div><p class="tuscany-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${editable ? e.link("mapUrl", c.mapUrl) : ""}`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      return wrap(block, "tuscany-gallery", `<p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="tuscany-gallery-grid">${items.map((item, index) => `<figure class="tuscany-photo-card"><div>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-tuscany-parallax${e.image(`items.${index}.imageUrl`)}>` : `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить фотографию</span>`}</div><figcaption${e.text(`items.${index}.caption`)}>${esc(item.caption)}</figcaption><b>${String(index + 1).padStart(2, "0")}</b></figure>`).join("")}</div>`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return wrap(block, "tuscany-timeline", `<p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, index) => `<li><span class="tuscany-day-num">${String(index + 1).padStart(2, "0")}</span><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong><small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div><span class="tuscany-arrow">›</span>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</li>`).join("")}</ol>${editable ? '<button type="button" class="tuscany-add-detail" data-block-action="add-detail">+ Добавить деталь дня</button>' : ""}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return wrap(block, "tuscany-dress", `${driedStem("tuscany-dress-stem")}<p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="tuscany-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="tuscany-palette">${c.palette.map((color, index) => `<i style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      const result = answered === "yes" ? "Спасибо, мы будем вас ждать!" : answered === "no" ? "Спасибо, что сообщили нам." : "";
      return wrap(block, "tuscany-rsvp", `<div class="tuscany-steps" aria-hidden="true"><b>1</b><i></i><span>2</span><i></i><span>3</span></div><p class="tuscany-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="tuscany-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="tuscany-options" aria-hidden="true"><span class="active">Да, буду</span><span>К сожалению, нет</span><span>Возможно</span></div>${result ? `<p class="tuscany-answer">${result}</p>` : rsvpHref ? `<a class="tuscany-cta" href="${esc(rsvpHref)}"${editable ? " data-editor-ui" : ""}><b${e.text("buttonLabel")}>${esc(c.buttonLabel)}</b><span>→</span></a>` : `<span class="tuscany-cta"><b${e.text("buttonLabel")}>${esc(c.buttonLabel)}</b><span>→</span></span>`}`, editable);
    }
    default:
      return "";
  }
}

export function renderTuscanyBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  const chrome = `<div class="tuscany-progress" aria-hidden="true"><i></i></div><div class="tuscany-ribbon" aria-hidden="true"></div><div class="tuscany-leaves" aria-hidden="true">${"<i></i>".repeat(10)}</div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
