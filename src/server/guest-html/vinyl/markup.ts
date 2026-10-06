/**
 * Разметка шаблона «Винил».
 *
 * Обложка — мозаика: имена крупно посередине, вокруг три-четыре снимка
 * под углом. Ниже разделы идут по очереди на розовом фоне, разделённые
 * знаком-трилистником; «Дорогие гости» выезжает светлой карточкой с
 * фестончатым верхним краем — он нарисован маской, а не картинкой,
 * чтобы не грузить лишний файл в дороге.
 *
 * Заставка-пластинка сюда не входит: её ставит скрипт (`script.ts`).
 * Нет JavaScript — нет и пластинки, приглашение открывается сразу.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";
import { esc } from "@/server/guest-html/layout";
import { inlineRsvpForm } from "@/server/guest-html/inline-rsvp-form";
import { L } from "@/server/guest-html/template-labels";

/** Трилистник между разделами — как ✤ на бумажных приглашениях. */
const MARK = `<i class="vinyl-mark" aria-hidden="true"></i>`;

/** Четырёхлучевая искорка. Раскидываем по обложке и фотографиям. */
function spark(className: string): string {
  return `<i class="vinyl-spark ${className}" aria-hidden="true"></i>`;
}

function wrap(block: InviteBlockView, className: string, body: string, editable: boolean): string {
  const e = editAttrs(block.id, editable);
  return `<section class="${className}" data-vinyl-block="${block.type}"${e.section()}>${e.tools()}${body}</section>`;
}

/** Снимок обложки: карточка под углом, которая слегка едет при прокрутке. */
function tile(url: string, index: number, attrs: string, editable: boolean): string {
  const inner = url
    ? `<img src="${esc(url)}" alt="" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" data-vinyl-parallax${attrs}>`
    : editable
      ? `<span class="ie-image-placeholder"${attrs}>Фотография</span>`
      : "";
  if (!inner) return "";
  return `<figure class="vinyl-tile vinyl-tile-${index + 1}">${inner}</figure>`;
}

function renderBlock(block: InviteBlockView, rsvpHref: string | null, answered: string | null, editable: boolean): string {
  const e = editAttrs(block.id, editable);

  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      const tiles = [
        tile(c.imageUrl, 0, e.image("imageUrl"), editable),
        tile(c.photos[0]?.imageUrl ?? "", 1, e.image("photos.0.imageUrl"), editable),
        tile(c.photos[1]?.imageUrl ?? "", 2, e.image("photos.1.imageUrl"), editable),
        tile(c.photos[2]?.imageUrl ?? "", 3, e.image("photos.2.imageUrl"), editable),
        tile(c.photos[3]?.imageUrl ?? "", 4, e.image("photos.3.imageUrl"), editable),
      ].join("");
      return wrap(
        block,
        "vinyl-cover",
        // Зеркальный шар висит внутри той же колонки, что и снимки: иначе
        // на широком мониторе он уезжает к самому краю окна.
        `<div class="vinyl-tiles">${tiles}<i class="vinyl-ball" aria-hidden="true"></i></div>` +
          spark("vinyl-spark-a") + spark("vinyl-spark-b") + spark("vinyl-spark-c") +
          `<div class="vinyl-cover-copy">` +
          `<p class="vinyl-kicker"${e.text("title")}>${esc(c.title)}</p>` +
          `<h1 class="vinyl-names"${e.text("names", { join: " & " })}>${esc(c.names)}</h1>` +
          `<p class="vinyl-lead"${e.text("subtitle", { multiline: true })}>${esc(c.subtitle)}</p>` +
          `<p class="vinyl-cover-date"${e.text("dateText")}>${esc(c.dateText)}</p>` +
          `</div>` +
          `<span class="vinyl-scroll" aria-hidden="true"></span>`,
        editable,
      );
    }

    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      // Последний блок — прощание: он другой по форме, и узнаём мы его по
      // тому же признаку, по которому его узнаёт человек, — по смыслу.
      const closing = /встреч|любов|ждём|ждем/i.test(`${c.title} ${c.text}`);
      if (closing) {
        return wrap(
          block,
          "vinyl-closing",
          `<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
            `<h2${e.text("title")}>${esc(c.title)}</h2>` +
            `<p class="vinyl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
            `<i class="vinyl-disc-small" aria-hidden="true"></i>`,
          editable,
        );
      }
      return wrap(
        block,
        "vinyl-hello",
        `${MARK}<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="vinyl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>`,
        editable,
      );
    }

    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      const items = c.items
        .map(
          (item, index) =>
            `<li class="vinyl-slot" data-vinyl-rise>` +
            `<time${e.text(`items.${index}.time`)}>${esc(item.time)}</time>` +
            `<strong${e.text(`items.${index}.title`)}>${esc(item.title)}</strong>` +
            `<small${e.text(`items.${index}.note`)}>${esc(item.note)}</small>` +
            (editable
              ? `<button type="button" class="ie-remove-detail" data-block-action="remove-detail" data-item-index="${index}" title="Удалить пункт">×</button>`
              : "") +
            `</li>`,
        )
        .join("");
      return wrap(
        block,
        "vinyl-timing",
        `${MARK}<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<ol class="vinyl-slots">${items}</ol>` +
          (editable ? `<button type="button" class="vinyl-add" data-block-action="add-detail">+ Добавить пункт</button>` : ""),
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
        "vinyl-dress",
        `${MARK}<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="vinyl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
          (swatches ? `<div class="vinyl-palette">${swatches}</div>` : ""),
        editable,
      );
    }

    case "PHOTOS": {
      const c = block.content as BlockContentMap["PHOTOS"];
      const items = c.items.filter((item) => item.imageUrl || editable);
      if (editable && items.length < 4) items.push({ imageUrl: "", caption: "" });
      // Блок без заголовка — просто полоса снимков (например, образцы
      // нарядов под дресс-кодом): ни трилистника, ни пустой строки.
      const head =
        c.tag || c.title || editable
          ? `${MARK}<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p><h2${e.text("title")}>${esc(c.title)}</h2>`
          : "";
      return wrap(
        block,
        head ? "vinyl-gallery" : "vinyl-gallery vinyl-gallery-bare",
        head +
          `<div class="vinyl-mosaic">` +
          items
            .map(
              (item, index) =>
                `<figure data-vinyl-rise>` +
                (item.imageUrl
                  ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async"${e.image(`items.${index}.imageUrl`)}>`
                  : `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Фотография</span>`) +
                (item.caption || editable ? `<figcaption${e.text(`items.${index}.caption`)}>${esc(item.caption)}</figcaption>` : "") +
                `</figure>`,
            )
            .join("") +
          `</div>`,
        editable,
      );
    }

    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      const photo = c.imageUrl
        ? `<img src="${esc(c.imageUrl)}" alt="" loading="lazy" decoding="async" data-vinyl-parallax${e.image("imageUrl")}>`
        : editable
          ? `<span class="ie-image-placeholder"${e.image("imageUrl")}>Фотография места</span>`
          : "";
      const map = c.mapUrl
        ? `<a class="vinyl-button" href="${esc(c.mapUrl)}" target="_blank" rel="noreferrer noopener"${editable ? " data-editor-ui" : ""}>${esc(c.mapLabel || "Открыть карту")}</a>`
        : "";
      return wrap(
        block,
        "vinyl-venue",
        `${MARK}<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<div class="vinyl-venue-photo">${photo}</div>` +
          `<p class="vinyl-venue-name"${e.text("name")}>${esc(c.name)}</p>` +
          `<p class="vinyl-venue-address"${e.text("address", { multiline: true })}>${esc(c.address)}</p>` +
          `<p class="vinyl-copy"${e.text("note", { multiline: true })}>${esc(c.note)}</p>` +
          map +
          (editable ? e.link("mapUrl", c.mapUrl) : ""),
        editable,
      );
    }

    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      const action = inlineRsvpForm(block);
      return wrap(
        block,
        "vinyl-rsvp",
        `${MARK}<p class="vinyl-tag"${e.text("tag")}>${esc(c.tag)}</p>` +
          `<h2${e.text("title")}>${esc(c.title)}</h2>` +
          `<p class="vinyl-copy"${e.text("text", { multiline: true })}>${esc(c.text)}</p>` +
          action,
        editable,
      );
    }

    default:
      return "";
  }
}

export function renderVinylBlocks(
  blocks: InviteBlockView[],
  theme: InviteTheme,
  rsvpHref: string | null,
  answered: string | null,
  standard: (block: InviteBlockView) => string,
  options: { editable?: boolean } = {},
): string {
  const editable = options.editable === true;
  // Музыка включается вместе с пластинкой на заставке; звук без кнопки
  // «выключить» — повод закрыть вкладку, поэтому кнопка рисуется всегда,
  // когда файл задан. `preload="none"` — чтобы трек не качался в дороге
  // у того, кто его так и не включит.
  const music = theme.musicUrl
    ? `<audio id="vinyl-audio" src="${esc(theme.musicUrl)}" preload="none" loop></audio>` +
      `<button type="button" class="vinyl-music" aria-pressed="false" aria-label="Музыка"${editable ? " data-editor-ui" : ""}><i aria-hidden="true"></i></button>`
    : "";
  // Подпись заставки — подпись шаблона: гостю её берёт скрипт пластинки,
  // в редакторе она видна в превью заставки над обложкой.
  const copy = L("vinyl.intro", "Нажмите на пластинку,\nчтобы открыть приглашение", { tag: "p", multiline: true, attrs: editable ? "" : ' id="vinyl-intro-copy" hidden' });
  const intro = theme.introOff ? "" : editable
    ? `<div class="vinyl-intro-preview"><span class="vinyl-disc" aria-hidden="true"><i class="vinyl-disc-hole"></i></span>${copy}<small>Заставка — гость видит её при открытии</small></div>`
    : copy;
  return music + intro + blocks.map((block) => renderBlock(block, rsvpHref, answered, editable) || standard(block)).join("");
}
