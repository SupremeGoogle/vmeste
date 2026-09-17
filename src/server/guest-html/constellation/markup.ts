import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";

function starMap(className = ""): string {
  return `<svg class="constellation-map ${className}" viewBox="0 0 240 180" fill="none" aria-hidden="true"><g class="constellation-lines"><path pathLength="1" d="M18 128L56 93L91 112L124 66L170 82L214 34M91 112L108 154M124 66L98 28M170 82L205 136"/></g><g class="constellation-points"><circle cx="18" cy="128" r="3"/><circle cx="56" cy="93" r="2.5"/><circle cx="91" cy="112" r="4"/><circle cx="124" cy="66" r="3"/><circle cx="170" cy="82" r="4"/><circle cx="214" cy="34" r="3"/><circle cx="108" cy="154" r="2.5"/><circle cx="98" cy="28" r="2.5"/><circle cx="205" cy="136" r="3"/></g></svg>`;
}

function names(value: string): string {
  const parts = value.trim().split(/\s+(?:и|&|and)\s+/i);
  return parts.length === 2 ? `<span>${esc(parts[0])}</span><i>&amp;</i><span>${esc(parts[1])}</span>` : esc(value);
}

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-constellation-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

function renderBlock(block: InviteBlockView, rsvpHref: string | null, answered: string | null, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      const photo = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high" data-constellation-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span>` : "";
      return wrap(block, "constellation-cover", `<div class="constellation-cover-photo">${photo}</div><div class="constellation-eclipse" aria-hidden="true"><i></i></div>${starMap("constellation-cover-map")}<div class="constellation-cover-copy"><p class="constellation-tag"${e.text("title")}>${esc(c.title)}</p><h1 class="constellation-names"${e.text("names", { join: " и " })}>${names(c.names)}</h1><p class="constellation-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="constellation-copy"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div><div class="constellation-scroll" aria-hidden="true"><span></span><small>начать путешествие</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /созвезди|до нашей|до встречи/i.test(`${c.tag} ${c.title}`);
      if (closing) return wrap(block, "constellation-closing", `${starMap("constellation-closing-map")}<p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="constellation-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="constellation-infinity" aria-hidden="true">∞</div>`, editable);
      return wrap(block, "constellation-story", `${starMap("constellation-story-map")}<div class="constellation-story-orbit" aria-hidden="true"><i></i></div><p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="constellation-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><p class="constellation-coordinate" aria-hidden="true">45°59′N · 09°15′E</p>`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const map = c.mapUrl ? `<a class="constellation-map-link" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || "Открыть карту")} <span>↗</span></a>` : "";
      return wrap(block, "constellation-venue", `<div class="constellation-venue-head"><p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2></div><div class="constellation-venue-frame"><div class="constellation-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async" data-constellation-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию локации</span>` : ""}</div><div class="constellation-venue-glass"><span>01</span><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address")}>${esc(c.address)}</p>${map}</div><div class="constellation-moon" aria-hidden="true"></div></div><p class="constellation-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${editable ? e.link("mapUrl", c.mapUrl) : ""}`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      return wrap(block, "constellation-gallery", `<p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="constellation-gallery-track">${items.map((item, index) => `<figure class="constellation-photo constellation-photo-${index + 1}"><div>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-constellation-parallax${e.image(`items.${index}.imageUrl`)}>` : `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить фотографию</span>`}</div><figcaption><b>0${index + 1}</b><span${e.text(`items.${index}.caption`)}>${esc(item.caption)}</span></figcaption></figure>`).join("")}</div>`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return wrap(block, "constellation-timeline", `${starMap("constellation-timeline-map")}<p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, index) => `<li><div class="constellation-node"><i></i><span>0${index + 1}</span></div><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong><small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</li>`).join("")}</ol>${editable ? '<button type="button" class="constellation-add-detail" data-block-action="add-detail">+ Добавить точку на орбиту</button>' : ""}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return wrap(block, "constellation-dress", `<div class="constellation-aurora" aria-hidden="true"></div><p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="constellation-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="constellation-palette">${c.palette.map((color, index) => `<i style="background:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}><span>0${index + 1}</span></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      const result = answered === "yes" ? "Ваше место в созвездии сохранено!" : answered === "no" ? "Спасибо, что сообщили нам." : "";
      const action = result ? `<p class="constellation-answer">${result}</p>` : rsvpHref ? `<a class="constellation-cta" href="${esc(rsvpHref)}"${editable ? " data-editor-ui" : ""}><b${e.text("buttonLabel")}>${esc(c.buttonLabel)}</b><span>↗</span></a>` : `<span class="constellation-cta"><b${e.text("buttonLabel")}>${esc(c.buttonLabel)}</b><span>↗</span></span>`;
      return wrap(block, "constellation-rsvp", `${starMap("constellation-rsvp-map")}<p class="constellation-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="constellation-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="constellation-options" aria-hidden="true"><span class="active"><i>✓</i> Буду рядом</span><span><i>×</i> Не смогу</span></div><div class="constellation-form-preview" aria-hidden="true"><label>Количество гостей <b>− &nbsp; 2 &nbsp; +</b></label><label>Послание молодожёнам <i></i></label></div>${action}`, editable);
    }
    default:
      return "";
  }
}

export function renderConstellationBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  const chrome = `<div class="constellation-progress" aria-hidden="true"><i></i></div><div class="constellation-stars" aria-hidden="true">${"<i></i>".repeat(18)}</div><div class="constellation-comet" aria-hidden="true"><i></i></div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
