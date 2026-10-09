/**
 * Разметка шаблона «Лилия».
 *
 * Спокойные бумажные разделы, временная линия и карточки пожеланий.
 * Каждый исходный блок сохраняет свои поля и инструменты редактора,
 * в том числе внутри группы подряд идущих пожеланий.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { L } from "@/server/guest-html/template-labels";
import { gl, guestLang } from "@/server/guest-html/guest-lang";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";

type Band = "green" | "light";

/** Контурная лилия — фирменный декор полос. */
function lily(className: string): string {
  return (
    `<svg class="lily-flower ${className}" viewBox="0 0 120 200" aria-hidden="true" focusable="false">` +
    `<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">` +
    `<path d="M60 196V96"/>` +
    `<path d="M60 96c-14-20-30-26-46-24 6 18 22 30 46 24z"/>` +
    `<path d="M60 96c14-20 30-26 46-24-6 18-22 30-46 24z"/>` +
    `<path d="M60 92c-10-26-6-52 8-72 12 22 10 50-8 72z"/>` +
    `<path d="M60 92c-18-22-20-50-8-72 14 20 18 46 8 72z"/>` +
    `<path d="M60 150c-10-8-22-10-34-6 6 10 20 14 34 6z"/>` +
    `<path d="M60 168c10-8 22-10 34-6-6 10-20 14-34 6z"/>` +
    `</g></svg>`
  );
}

function isDetail(block: InviteBlockView): boolean {
  const tag = (block.content as BlockContentMap["TEXT"]).tag?.trim() ?? "";
  return block.type === "TEXT" && (/^детали$/i.test(tag) || (guestLang() === "en" && /^details$/i.test(tag)));
}

/** Small line drawings remain crisp at any size; they are decorative only. */
function detailIcon(title: string): string {
  const path = /подар|gift/i.test(title)
    ? '<path d="M4 11h24v17H4zM2 7h28v5H2zM16 7v21M16 7C8 7 7 1 11 2c3 0 5 5 5 5zm0 0c8 0 9-6 5-5-3 0-5 5-5 5z"/>'
    : /цвет|flower/i.test(title)
      ? '<path d="M16 29V15m0 6c-6 0-9-4-9-4 6-1 9 4 9 4zm0 4c6 0 9-4 9-4-6-1-9 4-9 4zM16 15c-9 0-12-8-9-10 4-1 9 6 9 10zm0 0c9 0 12-8 9-10-4-1-9 6-9 10zm0 0C12 9 13 2 16 2s4 7 0 13z"/>'
      : '<path d="M16 27S3 19 3 10a7 7 0 0 1 13-3 7 7 0 0 1 13 3c0 9-13 17-13 17z"/>';
  return `<svg class="lily-detail-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

function wrap(block: InviteBlockView, band: Band, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return (
    `<section class="lily-sec lily-${band} ${className}" data-lily-block="${block.type}"${e.section()}>` +
    `${e.tools()}${body}</section>`
  );
}

/** Имена: фамилия капителью, имя невесты — рукописным. */
function namesMarkup(names: string): string {
  const match = names.match(/^(.+?)\s+(?:и|&)\s+(.+)$/i);
  if (!match) return esc(names);
  return (
    `<span class="lily-groom">${esc(match[1].trim())}</span>` +
    `<span class="lily-amp">${gl("и", "&")}</span>` +
    `<span class="lily-bride">${esc(match[2].trim())}</span>`
  );
}

function renderBlock(block: InviteBlockView, band: Band, rsvpHref: string | null, answered: string | null, editable: boolean): string {
  const e = editAttrs(block.id, editable);

  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      const photo = c.imageUrl
        ? `<img src="${esc(c.imageUrl)}" alt="" fetchpriority="high"${e.image("imageUrl")}>`
        : editable
          ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Фотография пары", "Photo of the couple")}</span>`
          : "";
      return wrap(
        block,
        band,
        "lily-cover",
        lily("lily-flower-cover") +
          `<div class="lily-cover-grid">` +
          `<div class="lily-cover-copy">` +
          `<h1 class="lily-names"${e.text("names")}>${namesMarkup(c.names)}</h1>` +
          `<p class="lily-kicker"${e.text("title")}>${esc(c.title)}</p>` +
          (c.dateText || editable ? `<p class="lily-cover-date"${e.text("dateText")}>${esc(c.dateText)}</p>` : "") +
          `</div>` +
          (photo ? `<figure class="lily-cover-photo">${photo}</figure>` : "") +
          `</div>`,
        editable,
      );
    }

    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      if (isDetail(block)) {
        return wrap(block, "light", "lily-detail-card",
          detailIcon(c.title) +
          `<p class="lily-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
          `<h3 class="lily-detail-title"${e.text("title")}>${esc(c.title)}</h3>` +
          `<p class="lily-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`, editable);
      }
      const closing = /встреч|любов/i.test(`${c.title} ${c.text}`) || (guestLang() === "en" && /see you soon|with love/i.test(`${c.title} ${c.text}`));
      return wrap(
        block,
        band,
        closing ? "lily-closing" : "lily-note",
        (band === "green" ? lily("lily-flower-side") : "") +
          (c.tag || editable ? `<p class="lily-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<h2 class="lily-script"${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="lily-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`,
        editable,
      );
    }

    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const photo = c.imageUrl
        ? `<figure class="lily-photo"><img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async"${e.image("imageUrl")}></figure>`
        : editable
          ? `<figure class="lily-photo"><span class="ie-image-placeholder"${e.image("imageUrl")}>${gl("Фотография места", "Venue photo")}</span></figure>`
          : "";
      const map = c.mapUrl
        ? `<a class="lily-button" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || gl("Открыть карту", "Open map"))}</a>`
        : "";
      return wrap(
        block,
        band,
        "lily-venue",
        `<h2 class="lily-script"${e.text("title")}>${esc(c.title)}</h2>` +
          (c.tag || editable ? `<p class="lily-tag"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<p class="lily-venue-name"${e.text("name")}>${esc(c.name)}</p>` +
          `<p class="lily-venue-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>` +
          photo +
          `<p class="lily-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>` +
          map +
          (editable ? e.link("mapUrl", c.mapUrl) : ""),
        editable,
      );
    }

    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      const items = c.items
        .map(
          (item, index) =>
            `<li data-lily-rise>` +
            `<time${e.text(`items.${index}.time`)}>${esc(item.time)}</time>` +
            `<span class="lily-timeline-point" aria-hidden="true"></span><div class="lily-timeline-content">` +
            `<strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong>` +
            `<small${e.text(`items.${index}.note`)}>${esc(item.note)}</small>` +
            `</div>` +
            (editable
              ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="${gl("Удалить пункт", "Remove item")}">×</button>`
              : "") +
            `</li>`,
        )
        .join("");
      return wrap(
        block,
        band,
        "lily-timing",
        lily("lily-flower-side") +
          `<p class="lily-tag">${L("lily.timeline.tag", gl("Вместе, минута за минутой", "Together, minute by minute"))}</p>` +
          `<h2 class="lily-script"${e.text("title")}>${esc(c.title)}</h2>` +
          (c.tag || editable ? `<p class="lily-copy"${e.text("tag")}>${esc(c.tag)}</p>` : "") +
          `<ol class="lily-slots">${items}</ol>` +
          (editable ? `<button type="button" class="lily-add" data-block-action="add-detail">${gl("+ Добавить пункт", "+ Add item")}</button>` : ""),
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
        band,
        "lily-dress",
        `<h2 class="lily-script"${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="lily-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
          (swatches ? `<div class="lily-palette">${swatches}</div>` : ""),
        editable,
      );
    }

    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      const head =
        c.title || c.tag || editable
          ? `<h2 class="lily-script"${e.text("title")}>${esc(c.title)}</h2>`
          : "";
      return wrap(
        block,
        band,
        head ? "lily-gallery" : "lily-gallery lily-gallery-bare",
        head +
          `<div class="lily-grid">` +
          items
            .map(
              (item, index) =>
                `<figure class="lily-photo" data-lily-rise>` +
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
        band,
        "lily-rsvp",
        lily("lily-flower-side") +
          `<h2 class="lily-script"${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="lily-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
          action,
        editable,
      );
    }

    default:
      return "";
  }
}

/**
 * Полоса блока. Оливковый берут разделы-«паузы» — история, программа,
 * анкета, прощание; всё, где смотрят на фотографии, остаётся белым.
 * Детали оформляются отдельной группой карточек; перестановка остальных
 * разделов сохраняет выбранную для них палитру.
 */
function bandFor(type: string, previous: Band): Band {
  if (type === "RSVP_FORM") return "green";
  if (type === "TIMELINE") return "light";
  if (type === "COVER" || type === "VENUE" || type === "PHOTOS" || type === "DRESSCODE") return "light";
  if (type === "TEXT") return previous === "green" ? "light" : "green";
  return previous;
}

export function renderLilyBlocks(
  blocks: InviteBlockView[],
  theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  const music = theme.musicUrl
    ? `<audio id="lily-audio" src="${esc(theme.musicUrl)}" preload="none" loop></audio>` +
      `<button type="button" class="lily-music" aria-pressed="false" aria-label="${gl("Музыка", "Music")}"${editable ? " data-editor-ui" : ""}>` +
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19.5a2.5 2.5 0 1 1-2-2.45V6.2l10-2.2v9.5a2.5 2.5 0 1 1-2-2.45V6.6L9 8.1z" fill="currentColor"/></svg>` +
      `</button>`
    : "";

  let previous: Band = "light";
  const parts: string[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (isDetail(block)) {
      const cards: string[] = [];
      do {
        cards.push(renderBlock(blocks[index], "light", rsvpHref, answered, editable));
        index++;
      } while (index < blocks.length && isDetail(blocks[index]));
      index--;
      parts.push(`<div class="lily-details"><div class="lily-details-intro"><p class="lily-tag">${L("lily.details.tag", gl("Чтобы нам всем было хорошо", "So everyone has a wonderful time"))}</p><h2>${L("lily.details.title", gl("Маленькие пожелания", "A few small wishes"))}</h2></div><div class="lily-details-grid">${cards.join("")}</div></div>`);
      previous = "light";
      continue;
    }
    const band = bandFor(block.type, previous);
    const own = renderBlock(block, band, rsvpHref, answered, editable);
    // Блок, который рисует не «Лилия», а общий рендерер: заворачиваем
    // его в полосу сами, иначе он выпадет из ленты белым пятном.
    const html = own || `<section class="lily-sec lily-${band} lily-plain">${standard(block)}</section>`;
    previous = band;
    parts.push(html);
  }

  return music + parts.join("");
}
