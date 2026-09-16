/**
 * Разметка шаблона «История» — то, чего нет в обычном рендерере.
 *
 * Остальные разделы собирает общий рендерер: тайминг, календарь,
 * дресс-код и форма ответа у образца устроены так же, как у нас, и
 * дублировать их значило бы завести вторую копию, которая разойдётся
 * с первой на первой же правке.
 */
import type { InviteBlockView } from "@/server/repositories/invites";
import { editAttrs } from "@/server/guest-html/inline-editor";

/** Гирлянда флажков над обложкой. Девять — как в образце. */
function bunting(): string {
  return `<div class="story-bunting" aria-hidden="true">${"<i></i>".repeat(9)}</div>`;
}

/**
 * Присказка над именами.
 *
 * Берётся из заголовка обложки: в образце это «тили ~ тили тесто», но
 * шаблон не должен диктовать чужую считалку — поле правится в редакторе
 * и, если его очистить, строки просто не будет.
 */
function rhyme(title: string, attrs = ""): string {
  const clean = title.trim();
  return clean || attrs ? `<p class="story-rhyme"${attrs}>${clean}</p>` : "";
}

export function renderStoryBlocks(
  blocks: InviteBlockView[],
  standard: (block: InviteBlockView) => string,
  editable = false,
): string {
  return blocks
    .map((block) => {
      const html = standard(block);
      if (!html) return "";
      // Гирлянда и присказка живут над обложкой, а не внутри неё:
      // так они не попадают под её выравнивание и отступы.
      if (block.type !== "COVER") return html;
      const title = String((block.content as { title?: unknown }).title ?? "");
      // Обычная обложка печатает заголовок как <h1>. Здесь этот же текст
      // уже стоит присказкой над гирляндой, и оставить оба значило бы
      // показать его дважды — вырезаем исходный заголовок.
      const withoutHeading = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>\n?/, "");
      return `${bunting()}${rhyme(title, editAttrs(block.id, editable).text("title"))}${withoutHeading}`;
    })
    .join("");
}
