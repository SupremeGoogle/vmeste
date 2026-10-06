import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L, initialsOf } from "@/server/guest-html/template-labels";

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-prism-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

function glassShard(className: string): string {
  return `<i class="prism-shard ${className}" aria-hidden="true"><b></b><span></span></i>`;
}

function renderBlock(block: InviteBlockView, rsvpHref: string | null, answered: string | null, editable: boolean, monogram: [string, string]): string {
  const e = editAttrs(block.id, editable);
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      const photo = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high" data-prism-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span>` : "";
      return wrap(block, "prism-cover", `<div class="prism-cover-photo">${photo}</div><div class="prism-rays" aria-hidden="true"><i></i><i></i><i></i></div>${glassShard("prism-shard-a")}${glassShard("prism-shard-b")}<div class="prism-cover-copy"><p class="prism-index">${L("prism.t3", "П / 01")}</p><p class="prism-tag"${e.text("title")}>${esc(c.title)}</p><h1 class="prism-names"${e.text("names", { join: " и " })}>${esc(c.names)}</h1><p class="prism-date"${e.text("dateText")}>${esc(c.dateText)}</p><p class="prism-copy"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p></div><div class="prism-scroll" aria-hidden="true"><span></span><small>${L("prism.t2", "Листайте дальше")}</small></div>`, editable);
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /встреч|02|любов/i.test(`${c.tag} ${c.title}`);
      if (closing) return wrap(block, "prism-closing", `<div class="prism-closing-glow" aria-hidden="true"></div><p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="prism-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><span class="prism-sign" aria-hidden="true">${L("prism.monogram.first", monogram[0])} / ${L("prism.monogram.second", monogram[1])}</span>`, editable);
      return wrap(block, "prism-manifesto", `<div class="prism-manifesto-grid" aria-hidden="true"></div><div class="prism-manifesto-copy"><p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="prism-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p></div>${(c as { wishlist?: boolean }).wishlist ? "" : `<figure class="prism-sculpture" aria-hidden="true"><img src="/media/invite-prism/sculpture.webp" alt="" loading="lazy" decoding="async"><i></i><figcaption>${L("prism.t4", "Преломление света · 2027")}</figcaption></figure>`}`, editable);
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const map = c.mapUrl ? `<a class="prism-link" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || "Открыть карту")} <span>↗</span></a>` : "";
      return wrap(block, "prism-venue", `<header><p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2></header><div class="prism-venue-card"><div class="prism-venue-photo">${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async" data-prism-parallax${e.image("imageUrl")}>` : editable ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию локации</span>` : ""}</div><div class="prism-venue-glass"><span>${L("prism.t1", "01 / МЕСТО")}</span><h3${e.text("name")}>${esc(c.name)}</h3><p${e.text("address")}>${esc(c.address)}</p>${map}</div></div><p class="prism-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>${editable ? e.link("mapUrl", c.mapUrl) : ""}`, editable);
    }
    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      return wrap(block, "prism-gallery", `<p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><div class="prism-card-swap">${items.map((item, index) => `<figure class="prism-photo prism-photo-${index + 1}" data-prism-card><div>${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-prism-parallax${e.image(`items.${index}.imageUrl`)}>` : `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить фотографию</span>`}</div><figcaption><b>0${index + 1}</b><span${e.text(`items.${index}.caption`)}>${esc(item.caption)}</span></figcaption></figure>`).join("")}</div>`, editable);
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return wrap(block, "prism-timeline", `<p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><ol>${c.items.map((item, index) => `<li data-prism-stack><span class="prism-step">0${index + 1}</span><time${e.text(`items.${index}.time`)}>${esc(item.time)}</time><div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong><small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div>${editable ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить деталь">×</button>` : ""}</li>`).join("")}</ol>${editable ? '<button type="button" class="prism-add" data-block-action="add-detail">+ Добавить момент</button>' : ""}`, editable);
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return wrap(block, "prism-dress", `<div class="prism-spectrum" aria-hidden="true"></div><p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="prism-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p><div class="prism-palette">${c.palette.map((color, index) => `<i style="--swatch:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}><b>0${index + 1}</b></i>`).join("")}</div>`, editable);
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return wrap(block, "prism-rsvp", `<div class="prism-rsvp-glow" aria-hidden="true"></div><p class="prism-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2><p class="prism-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>${inlineRsvpForm(block)}`, editable);
    }
    default:
      return "";
  }
}

export function renderPrismBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  // Монограмма в финале — из имён пары (стандарт, §5), меняется как подпись шаблона.
  const cover = blocks.find((block) => block.type === "COVER");
  const monogram = initialsOf((cover?.content as BlockContentMap["COVER"] | undefined)?.names ?? "");
  const chrome = `<div class="prism-progress" aria-hidden="true"><i></i></div><div class="prism-cursor" aria-hidden="true"></div>`;
  return chrome + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable, monogram) || standard(block)).join("");
}

