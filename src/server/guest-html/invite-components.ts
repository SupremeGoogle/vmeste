/**
 * Общий слой самостоятельных элементов для всех приглашений.
 * Разбираем HTML, но меняем исходные диапазоны: не переписываем разметку,
 * стили или скрипты шаблона. Удаление работает и без JavaScript у гостя.
 */
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import { createHash } from "node:crypto";
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";

type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;
type Change = { start: number; end: number; value: string };
const element = (node: Node): node is Element => "tagName" in node;
const attr = (node: Element, name: string) => node.attrs.find(a => a.name === name)?.value;
const insertAt = (html: string, end: number) => html[end - 2] === "/" ? end - 2 : end - 1;
const textOf = (node: Node): string => "value" in node ? node.value : "childNodes" in node ? node.childNodes.map(textOf).join(" ") : "";
const CONTENT_TAGS = new Set(["h1", "h2", "h3", "h4", "p", "blockquote", "figcaption", "a", "button", "img", "svg", "iframe", "video", "hr", "label", "fieldset", "form"]);
const SKIP_TAGS = new Set(["script", "style", "template", "audio", "source", "head"]);
const FIELD_NAMES: Record<string, string> = { title: "Заголовок", names: "Имена", dateText: "Дата", subtitle: "Подзаголовок", tag: "Подпись раздела", name: "Название места", address: "Адрес", note: "Описание", text: "Текст", footer: "Прощание", mapLabel: "Текст кнопки", imageUrl: "Фотография", buttonLabel: "Текст кнопки" };

function itemIndex(node: Element): string | undefined {
  const path = attr(node, "data-component-key")?.match(/^field:items\.(\d+)\./)?.[1];
  if (path) return path;
  for (const child of node.childNodes) {
    if (element(child)) { const index = itemIndex(child); if (index !== undefined) return index; }
  }
}

function kindOf(node: Element, key: string): string {
  if (key.startsWith("row:items.")) return "Пункт программы";
  if (key === "widget:countdown" || attr(node, "data-until") !== undefined) return "Обратный отсчёт";
  if (key.startsWith("link:") || node.tagName === "a" || node.tagName === "button") return "Кнопка";
  if (node.tagName === "iframe") return "Карта";
  if (node.tagName === "svg" || node.tagName === "hr") return "Украшение";
  if (node.tagName === "img" || key.endsWith("imageUrl") || key.endsWith("icon")) return "Фотография";
  if (key.includes("palette.")) return "Цвет палитры";
  if (key.endsWith(".time")) return "Время";
  if (key.endsWith(".caption")) return "Подпись фотографии";
  if (key.endsWith(".note")) return "Описание";
  if (key.endsWith(".title")) return "Заголовок";
  if (node.tagName === "label") return "Поле анкеты";
  if (node.tagName === "fieldset") return "Вопрос анкеты";
  if (node.tagName === "form") return "Анкета";
  if (attr(node, "aria-hidden") === "true") return "Украшение";
  if (/calendar|countdown|timer|palette/.test(attr(node, "class") ?? "")) return /calendar/.test(attr(node, "class") ?? "") ? "Календарь" : /palette/.test(attr(node, "class") ?? "") ? "Палитра" : "Обратный отсчёт";
  return FIELD_NAMES[key.replace(/^field:/, "")] ?? (/^h[1-4]$/.test(node.tagName) ? "Заголовок" : "Текст");
}

/** Ключи не зависят от текста, URL, количества дней в месяце и соседних разделов. */
export function composeInviteComponents(html: string, blocks: InviteBlockView[], theme: InviteTheme, editable = false): string {
  if (!editable && !Object.values(theme.removedComponents ?? {}).some(keys => keys.length)) return html.replace(/\s+data-component-(?:key|owner)="[^"]*"/g, "");
  const tree = parseFragment(html, { sourceCodeLocationInfo: true });
  const changes: Change[] = [];
  const removedRanges: { start: number; end: number }[] = [];
  const occurrences = new Map<string, number>();
  const byId = new Map(blocks.map(block => [block.id, block]));

  function walk(node: Node, owner = "__template", ancestry = "", removedParent = false, widgetParent = false, scope?: string) {
    if (!element(node)) {
      if ("childNodes" in node) node.childNodes.forEach(child => walk(child, owner, ancestry, removedParent, widgetParent));
      return;
    }
    const section = attr(node, "data-content-block");
    owner = section ?? owner;
    if (SKIP_TAGS.has(node.tagName) || ["data-editor-ui", "data-block-action", "data-link-edit", "data-editor-nav"].some(name => attr(node, name) !== undefined)) return;
    const location = node.sourceCodeLocation;
    const classes = attr(node, "class") ?? "";
    const signature = `${node.tagName}.${classes}#${attr(node, "id") ?? ""}`;
    const widget = !section && (attr(node, "data-until") !== undefined || /(?:^|[ _-])(calendar|countdown|timer|palette)(?:$|[ _-])/.test(classes)) && !widgetParent;
    const explicit = attr(node, "data-component-key");
    if (node.tagName === "li" && byId.get(owner)?.type === "TIMELINE") scope = itemIndex(node);
    const row = node.tagName === "li" && scope !== undefined && byId.get(owner)?.type === "TIMELINE";
    // Открывающая кнопка заставки управляется настройкой самой заставки.
    const introControl = /(?:^|[ _-])(open|intro|envelope)(?:$|[ _-])/.test(classes) && node.tagName === "button";
    const hasOwnText = node.childNodes.some(child => "value" in child && child.value.trim());
    const decorative = attr(node, "aria-hidden") === "true" && classes && !/progress|cursor/.test(classes);
    const candidate = !section && !introControl && (explicit || row || widget || decorative || CONTENT_TAGS.has(node.tagName) || (!widgetParent && hasOwnText && ["span", "div", "small", "time", "strong", "em"].includes(node.tagName)));
    let key = explicit ?? (row ? `row:items.${scope}` : undefined);
    if (candidate && location?.startTag) {
      if (explicit && attr(node, "data-component-owner")) owner = attr(node, "data-component-owner")!;
      if (node.tagName === "a") {
        const content = byId.get(owner)?.content;
        const href = attr(node, "href");
        const linkField = href && content && Object.entries(content).find(([name, value]) => /^(mapUrl|yandexUrl|googleUrl)$/.test(name) && value === href)?.[0];
        if (linkField) key = `link:${linkField}`;
      }
      if (!key) {
        const hash = createHash("sha256").update(`${ancestry}/${signature}`).digest("hex").slice(0, 12);
        const prefix = scope === undefined ? `node:${theme.template || "base"}:${hash}` : `decor:items.${scope}:${theme.template || "base"}:${hash}`;
        const counterKey = `${owner}/${prefix}`;
        const count = occurrences.get(counterKey) ?? 0;
        occurrences.set(counterKey, count + 1);
        key = `${prefix}:${count}`;
      }
      const removed = removedParent || (theme.removedComponents?.[owner]?.includes(key) ?? false);
      // Фото/карта исчезают вместе с пустой рамкой, подпись — самостоятельна.
      let shell = node;
      if (removed && ["img", "iframe", "video"].includes(node.tagName)) {
        while (shell.parentNode && element(shell.parentNode)) {
          const parent = shell.parentNode;
          if (!["div", "figure", "picture"].includes(parent.tagName) || attr(parent, "data-content-block") || attr(parent, "data-invite-component") || attr(parent, "data-component-key")) break;
          const meaningful = parent.childNodes.filter(child => element(child) ? !SKIP_TAGS.has(child.tagName) : "value" in child && child.value.trim());
          if (meaningful.length !== 1 || meaningful[0] !== shell) break;
          shell = parent;
        }
      }
      if (removed && !editable) {
        const range = shell.sourceCodeLocation ?? location;
        removedRanges.push({ start: range.startOffset, end: range.endOffset });
        return;
      }
      if (removed && editable && shell !== node && shell.sourceCodeLocation?.startTag) {
        const at = insertAt(html, shell.sourceCodeLocation.startTag.endOffset);
        changes.push({ start: at, end: at, value: ' data-component-shell-removed="true"' });
      }
      if (editable) {
        const kind = kindOf(node, key);
        const snippet = textOf(node).replace(/\s+/g, " ").trim().slice(0, 70);
        const label = `${kind}${snippet && !["Фотография", "Карта", "Украшение", "Календарь", "Обратный отсчёт", "Палитра"].includes(kind) ? ` · ${snippet}` : ""}`;
        // Заменяем исходные метки единым описанием, которое читает редактор.
        for (const name of ["data-component-key", "data-component-owner"]) {
          const range = location.attrs?.[name];
          if (range) changes.push({ start: range.startOffset, end: range.endOffset, value: "" });
        }
        const at = insertAt(html, location.startTag.endOffset);
        changes.push({ start: at, end: at,
          value: ` data-invite-component="${esc(key)}" data-component-owner="${esc(owner)}" data-component-label="${esc(label)}"${removed ? ' data-component-removed="true"' : ""}` });
      }
      removedParent = removed;
    }
    if (!editable) {
      for (const name of ["data-component-key", "data-component-owner"]) {
        const range = location?.attrs?.[name];
        if (range) changes.push({ start: range.startOffset - 1, end: range.endOffset, value: "" });
      }
    }
    // SVG — самостоятельное украшение, не десятки отдельных контуров.
    if (node.tagName === "svg") return;
    node.childNodes.forEach(child => walk(child, owner, section ? "" : `${ancestry}/${signature}`, removedParent, widgetParent || widget, section ? undefined : scope));
  }
  walk(tree);
  // Удаляем и панель ссылки, если организатор убрал саму кнопку.
  if (editable) {
    const visit = (node: Node) => {
      if (element(node) && attr(node, "data-link-edit") !== undefined) {
        const owner = attr(node, "data-block-id") ?? "";
        const key = `link:${attr(node, "data-path")}`;
        if (theme.removedComponents?.[owner]?.includes(key) && node.sourceCodeLocation) removedRanges.push({ start: node.sourceCodeLocation.startOffset, end: node.sourceCodeLocation.endOffset });
      }
      if ("childNodes" in node) node.childNodes.forEach(visit);
    };
    visit(tree);
  }
  const all = [...changes.filter(change => !removedRanges.some(range => change.start >= range.start && change.end <= range.end)),
    ...removedRanges.filter((range, index) => !removedRanges.some((parent, i) => i !== index && parent.start <= range.start && parent.end >= range.end)).map(range => ({ ...range, value: "" }))];
  all.sort((a, b) => b.start - a.start || b.end - a.end);
  for (const change of all) html = html.slice(0, change.start) + change.value + html.slice(change.end);
  return html;
}
