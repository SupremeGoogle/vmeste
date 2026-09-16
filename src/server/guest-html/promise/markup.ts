import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { editAttrs, type EditAttrs } from "@/server/guest-html/inline-editor";

/** A small ornament in the existing vector idiom, coloured by the editor theme. */
export function promiseSprig(): string {
  return `<svg class="promise-sprig" viewBox="0 0 120 70" fill="none" aria-hidden="true"><path d="M18 59Q57 36 101 12M52 40Q40 24 31 18M70 29Q74 42 86 48" stroke="currentColor" stroke-width="1"/><g fill="currentColor" opacity=".7"><path d="M34 51Q17 45 21 35Q35 35 34 51M46 43Q42 26 52 23Q61 34 46 43M59 35Q55 19 65 16Q73 26 59 35M75 26Q75 10 86 9Q91 20 75 26M88 20Q93 5 105 7Q103 18 88 20M64 34Q78 31 81 38Q74 47 64 34M43 27Q27 29 26 17Q37 14 43 27M78 42Q94 37 97 46Q90 54 78 42"/></g><g fill="var(--line)" stroke="var(--accent)" stroke-width=".5"><circle cx="44" cy="18" r="4"/><circle cx="49" cy="13" r="3"/><circle cx="39" cy="13" r="3"/></g></svg>`;
}

function namesMarkup(names: string): string {
  const parts = names.trim().split(/\s+(?:и|&|and)\s+/i);
  if (parts.length !== 2) return esc(names);
  return `<span>${esc(parts[0])}</span><span class="promise-amp" aria-label="и">&amp;</span><span>${esc(parts[1])}</span>`;
}

function cover(content: BlockContentMap["COVER"], theme: InviteTheme, date: Date | undefined, timezone: string, e: EditAttrs): string {
  const dateText = content.dateText || (date ? new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric", timeZone: timezone,
  }).format(date).replace(/\s*г\.$/, "") : "");
  const photo = content.imageUrl && theme.cover !== "plain";
  return `<section class="cover promise-cover${photo || e.enabled ? " promise-with-photo" : ""}${theme.cover === "frame" ? " promise-framed" : ""}">
<div class="promise-scene" aria-hidden="true"></div>
<div class="promise-petals" aria-hidden="true">${"<i></i>".repeat(6)}</div>
${photo ? `<div class="promise-portrait"><img src="${esc(content.imageUrl)}" alt="" fetchpriority="high" decoding="async"${e.image("imageUrl")}></div>` : e.enabled ? `<div class="promise-portrait"><span class="ie-image-placeholder"${e.image("imageUrl")}>Добавить фотографию пары</span></div>` : ""}
<div class="promise-cover-copy">
${content.title || e.enabled ? `<p class="promise-kicker"${e.text("title")}>${esc(content.title)}</p>` : ""}
<h1 class="promise-names"${e.text("names", { join: " и " })}>${namesMarkup(content.names)}</h1>
${content.subtitle || e.enabled ? `<p class="promise-subtitle pre"${e.text("subtitle", { multiline: true })}>${esc(content.subtitle)}</p>` : ""}
${dateText || e.enabled ? `<p class="promise-date"${e.text("dateText")}>${esc(dateText)}</p>` : ""}
${promiseSprig()}
</div></section>`;
}

function photos(content: BlockContentMap["PHOTOS"], e: EditAttrs): string {
  const editableItems = e.enabled && content.items.length < 4
    ? [...content.items, { imageUrl: "", caption: "" }]
    : content.items;
  const items = editableItems.map((item, index) => ({ item, index })).filter(({ item }) => e.enabled || item.imageUrl);
  if (!items.length) return "";
  return `<section class="promise-gallery"><div class="promise-gallery-heading">${content.title || e.enabled ? `<h2${e.text("title")}>${esc(content.title)}</h2>` : ""}</div>
<div class="promise-photos${items.length === 1 ? " promise-single" : ""}">${items.map(({ item, index }) => `<figure>
<div class="promise-photo-window">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" loading="lazy" decoding="async" width="600" height="750"${e.image(`items.${index}.imageUrl`)}>` : e.enabled ? `<span class="ie-image-placeholder"${e.image(`items.${index}.imageUrl`)}>Добавить фотографию</span>` : ""}</div>
${item.caption || e.enabled ? `<figcaption${e.text(`items.${index}.caption`)}>${esc(item.caption)}</figcaption>` : ""}</figure>`).join("")}</div></section>`;
}

/** Reuse the standard renderer for functional blocks (RSVP, maps, calendar, etc.). */
export function renderPromiseBlocks(
  blocks: InviteBlockView[],
  theme: InviteTheme,
  date: Date | undefined,
  timezone: string,
  standard: (block: InviteBlockView) => string,
  editable = false,
): string {
  return blocks.map((block, index) => {
    const e = editAttrs(block.id, editable);
    const own = block.type === "COVER" || block.type === "PHOTOS";
    let html = block.type === "COVER"
      ? cover(block.content as BlockContentMap["COVER"], theme, date, timezone, e)
      : block.type === "PHOTOS"
        ? photos(block.content as BlockContentMap["PHOTOS"], e)
        : standard(block);
    if (!html) return "";
    // Свои разделы получают признак и панель здесь; остальные — в общем рендерере.
    if (own && editable) html = html.replace(/<section([^>]*)>/, `<section$1${e.section()}>${e.tools()}`);
    const closing = index === blocks.length - 1 && block.type === "TEXT";
    html = html.replace("<section", `<section data-promise-block="${block.type}"${closing ? ' data-promise-closing="true"' : ""}`);
    if (closing) html = html.replace(/(<section[^>]*>)/, `$1${promiseSprig()}`);
    return html;
  }).join("");
}
