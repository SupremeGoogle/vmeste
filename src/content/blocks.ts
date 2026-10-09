/**
 * Короткие конструкторы блоков статьи — чтобы файл статьи читался как
 * текст, а не как JSON.
 */
import type { Article, Block } from "./types";

export const h2 = (id: string, text: string): Block => ({ type: "h2", id, text });
export const h3 = (text: string): Block => ({ type: "h3", text });
export const p = (text: string): Block => ({ type: "p", text });
export const ul = (...items: string[]): Block => ({ type: "ul", items });
export const ol = (...items: string[]): Block => ({ type: "ol", items });
export const examples = (...items: [label: string, text: string][]): Block => ({
  type: "examples",
  items: items.map(([label, text]) => ({ label, text })),
});
export const table = (head: string[], rows: string[][], caption?: string): Block => ({ type: "table", head, rows, caption });
export const tip = (title: string, text: string): Block => ({ type: "tip", title, text });
export const cta = (title: string, text: string, href: string, button: string): Block => ({ type: "cta", title, text, href, button });

/** Текст без разметки: `**жирный**` → «жирный», `[текст](/адрес)` → «текст». */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

function blockText(block: Block): string[] {
  switch (block.type) {
    case "h2":
    case "h3":
    case "p":
      return [block.text];
    case "ul":
    case "ol":
      return block.items;
    case "examples":
      return block.items.flatMap((item) => [item.label, item.text]);
    case "table":
      return [...block.head, ...block.rows.flat(), block.caption ?? ""];
    case "tip":
    case "cta":
      return [block.title, block.text];
  }
}

/** Слов в статье: ответ, текст, вопросы и ответы. */
export function wordCount(article: Article): number {
  const parts = [article.answer, ...article.blocks.flatMap(blockText), ...article.faq.flatMap((item) => [item.q, item.a])];
  return parts.map(plain).join(" ").split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Минут чтения: русский текст читают медленнее английского. */
export function readingMinutes(article: Article): number {
  return Math.max(3, Math.round(wordCount(article) / (article.lang === "en" ? 220 : 170)));
}
