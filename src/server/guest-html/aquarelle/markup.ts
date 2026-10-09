/** Разметка редакционного шаблона «Акварель». */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";
import { AQUARELLE_SAMPLE_IMAGES } from "@/lib/invite-templates/aquarelle-assets";
import { gl } from "@/server/guest-html/guest-lang";

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-aq-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

/** Имена: «Валерия и Давид» — капитель, союз, рукописное. */
export function splitNames(names: string): { groom: string; bride: string } | null {
  const match = names.match(/^(.+?)\s+(?:и|&)\s+(.+)$/i);
  if (!match) return null;
  return { groom: match[1].trim(), bride: match[2].trim() };
}

export function namesMarkup(names: string): string {
  const parts = splitNames(names);
  if (!parts) return esc(names);
  return (
    `<span class="aq-groom">${esc(parts.groom)}</span> ` +
    `<span class="aq-and">${gl("и", "&amp;")}</span> ` +
    `<span class="aq-bride">${esc(parts.bride)}</span>`
  );
}

function renderBlock(block: InviteBlockView, rsvpHref: string | null, answered: string | null, editable: boolean): string {
  const e = editAttrs(block.id, editable);

  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      const imageUrl = c.imageUrl || AQUARELLE_SAMPLE_IMAGES[4];
      return wrap(
        block,
        "aq-cover",
        `<div class="aq-cover-copy"><p class="aq-eyebrow">${L("aquarelle.t2", gl("Свадебное приглашение", "Wedding invitation"))}</p>` +
          `<h1 class="aq-names"${e.text("names")}>${namesMarkup(c.names)}</h1>` +
          `<p class="aq-kicker"${e.text("title")}>${esc(c.title)}</p>` +
          (c.dateText || editable ? `<p class="aq-cover-date"${e.text("dateText")}>${esc(c.dateText)}</p>` : "") +
          (c.subtitle || editable ? `<p class="aq-copy"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p>` : "") +
          `</div><figure class="aq-cover-photo"><img src="${esc(imageUrl)}" alt="" decoding="async"${e.image("imageUrl")}></figure>` +
          `<span class="aq-cover-index" aria-hidden="true">${L("aquarelle.t1", gl("01 / Приглашение", "01 / Invitation"))}</span>`,
        editable,
      );
    }

    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      const closing = /встреч|любов|see you|with love/i.test(`${c.title} ${c.text}`);
      return wrap(
        block,
        closing ? "aq-closing" : c.tag ? "aq-note aq-note-detail" : "aq-note aq-note-intro",
        (c.tag || editable ? `<p class="aq-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="aq-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`,
        editable,
      );
    }

    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const photo = c.imageUrl
        ? `<figure class="aq-arch"><img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async"${e.image("imageUrl")}></figure>`
        : editable
          ? `<figure class="aq-arch"><span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Фотография места", "Venue photo")}</span></figure>`
          : "";
      const map = c.mapUrl
        ? `<a class="aq-button" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || gl("Открыть карту", "Open map"))}</a>`
        : "";
      return wrap(
        block,
        "aq-venue",
        `<div class="aq-venue-content">` +
          (c.tag || editable ? `<p class="aq-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="aq-venue-name"${e.text("name")}>${esc(c.name)}</p>` +
          `<p class="aq-venue-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>` +
          `<p class="aq-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>` +
          map +
          (editable ? e.link("mapUrl", c.mapUrl) : "") + `</div>` + photo,
        editable,
      );
    }

    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      const items = c.items
        .map(
          (item, index) =>
            `<li data-aq-rise>` +
            `<time${e.text(`items.${index}.time`)}>${esc(item.time)}</time>` +
            `<div><strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong>` +
            `<small${e.text(`items.${index}.note`)}>${esc(item.note)}</small></div>` +
            (editable
              ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить пункт", "Remove item")}">×</button>`
              : "") +
            `</li>`,
        )
        .join("");
      return wrap(
        block,
        "aq-timing",
        (c.tag || editable ? `<p class="aq-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<ol class="aq-slots">${items}</ol>` +
          (editable ? `<button type="button" class="aq-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""),
        editable,
      );
    }

    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      const swatches = c.palette
        .map((color, index) => `<i style="--swatch:${esc(color)}" data-color="${esc(color)}"${e.color(`palette.${index}`)}></i>`)
        .join("");
      return wrap(
        block,
        "aq-dress",
        (c.tag || editable ? `<p class="aq-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="aq-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
          (swatches ? `<div class="aq-palette">${swatches}</div>` : ""),
        editable,
      );
    }

    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      return wrap(
        block,
        "aq-gallery",
        (c.tag || editable ? `<p class="aq-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<div class="aq-arches">` +
          items
            .map(
              (item, index) =>
                `<figure class="aq-arch" data-aq-rise>` +
                (item.imageUrl
                  ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async"${e.image(`items.${index}.imageUrl`)}>`
                  : `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>${gl("Фотография", "Photo")}</span>`) +
                (item.caption || editable ? `<figcaption${e.text(`items.${index}.caption`)}>${esc(item.caption)}</figcaption>` : "") +
                `</figure>`,
            )
            .join("") +
          `</div>`,
        editable,
      );
    }

    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      const action = inlineRsvpForm(block);
      return wrap(
        block,
        "aq-rsvp",
        (c.tag || editable ? `<p class="aq-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="aq-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
          action,
        editable,
      );
    }

    default:
      return "";
  }
}

/** Имена с обложки используются на заставке. */
export function coverNames(blocks: InviteBlockView[]): string {
  const cover = blocks.find((block) => block.type === "COVER");
  return cover ? String((cover.content as BlockContentMap["COVER"]).names ?? "") : "";
}

export function renderAquarelleBlocks(
  blocks: InviteBlockView[],
  _theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  // Акварельные разводы — под всем листом, одним слоем: у каждого раздела
  // свой фон означал бы видимые стыки там, где на бумаге их не бывает.
  const wash = `<div class="aq-wash" aria-hidden="true"></div>`;
  return wash + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
