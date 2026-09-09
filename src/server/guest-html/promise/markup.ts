import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";

const BACKDROP = "/media/invite-promise/garden.webp";

/** A small ornament in the existing vector idiom, coloured by the editor theme. */
export function promiseSprig(): string {
  return `<svg class="promise-sprig" viewBox="0 0 120 70" fill="none" aria-hidden="true"><path d="M18 59Q57 36 101 12M52 40Q40 24 31 18M70 29Q74 42 86 48" stroke="currentColor" stroke-width="1"/><g fill="currentColor" opacity=".7"><path d="M34 51Q17 45 21 35Q35 35 34 51M46 43Q42 26 52 23Q61 34 46 43M59 35Q55 19 65 16Q73 26 59 35M75 26Q75 10 86 9Q91 20 75 26M88 20Q93 5 105 7Q103 18 88 20M64 34Q78 31 81 38Q74 47 64 34M43 27Q27 29 26 17Q37 14 43 27M78 42Q94 37 97 46Q90 54 78 42"/></g><g fill="var(--line)" stroke="var(--accent)" stroke-width=".5"><circle cx="44" cy="18" r="4"/><circle cx="49" cy="13" r="3"/><circle cx="39" cy="13" r="3"/></g></svg>`;
}

function namesMarkup(names: string): string {
  const parts = names.trim().split(/\s+(?:и|&|and)\s+/i);
  if (parts.length !== 2) return esc(names);
  return `<span>${esc(parts[0])}</span><span class="promise-amp" aria-label="и">&amp;</span><span>${esc(parts[1])}</span>`;
}

function cover(content: BlockContentMap["COVER"], theme: InviteTheme, date?: Date, timezone = "UTC"): string {
  const dateText = content.dateText || (date ? new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric", timeZone: timezone,
  }).format(date).replace(/\s*г\.$/, "") : "");
  const photo = content.imageUrl && theme.cover !== "plain";
  return `<section class="cover promise-cover${photo ? " promise-with-photo" : ""}${theme.cover === "frame" ? " promise-framed" : ""}">
<div class="promise-scene" aria-hidden="true"></div>
<div class="promise-petals" aria-hidden="true">${"<i></i>".repeat(6)}</div>
${photo ? `<div class="promise-portrait"><img src="${esc(content.imageUrl)}" alt="" fetchpriority="high" decoding="async"></div>` : ""}
<div class="promise-cover-copy">
${content.title ? `<p class="promise-kicker">${esc(content.title)}</p>` : ""}
<h1 class="promise-names">${namesMarkup(content.names)}</h1>
${content.subtitle ? `<p class="promise-subtitle pre">${esc(content.subtitle)}</p>` : ""}
${dateText ? `<p class="promise-date">${esc(dateText)}</p>` : ""}
${promiseSprig()}
</div></section>`;
}

function photos(content: BlockContentMap["PHOTOS"]): string {
  const items = content.items.filter(item => item.imageUrl || item.caption);
  if (!items.length) return "";
  return `<section class="promise-gallery"><div class="promise-gallery-heading">${content.title ? `<h2>${esc(content.title)}</h2>` : ""}</div>
<div class="promise-photos${items.length === 1 ? " promise-single" : ""}">${items.map(item => `<figure>
<div class="promise-photo-window"><img src="${esc(item.imageUrl || BACKDROP)}" alt="" loading="lazy" decoding="async" width="600" height="750"></div>
${item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : ""}</figure>`).join("")}</div></section>`;
}

/** Reuse the standard renderer for functional blocks (RSVP, maps, calendar, etc.). */
export function renderPromiseBlocks(
  blocks: InviteBlockView[],
  theme: InviteTheme,
  date: Date | undefined,
  timezone: string,
  standard: (block: InviteBlockView) => string,
): string {
  return blocks.map((block, index) => {
    let html = block.type === "COVER"
      ? cover(block.content as BlockContentMap["COVER"], theme, date, timezone)
      : block.type === "PHOTOS"
        ? photos(block.content as BlockContentMap["PHOTOS"])
        : standard(block);
    if (!html) return "";
    const closing = index === blocks.length - 1 && block.type === "TEXT";
    html = html.replace("<section", `<section data-promise-block="${block.type}"${closing ? ' data-promise-closing="true"' : ""}`);
    if (closing) html = html.replace(/(<section[^>]*>)/, `$1${promiseSprig()}`);
    return html;
  }).join("");
}
