/**
 * Надписи самого шаблона — то, что раньше было вписано прямо в разметку:
 * монограмма на заставке, «Нажмите, чтобы открыть», «Здесь живёт любовь»,
 * подписи на печатях и записках, единицы отсчёта.
 *
 * По стандарту (docs/template-standard.md, §4–6) любой текст, который
 * видит гость, правится в редакторе. Свои слова хранятся в теме
 * мероприятия (`theme.labels`), а шаблон пишет вместо строки
 * `L("ключ", "текст образца")`: в редакторе надпись становится полем, у
 * гостя — текстом пары. Стёрли целиком — надпись пропадает.
 *
 * Рендер шаблонов синхронный, поэтому подписи и режим редактора лежат в
 * модульной переменной на время одного рендера (`withTemplateLabels`), а
 * не протягиваются параметром через два десятка функций каждого шаблона.
 */
import { esc } from "@/server/guest-html/layout";
import type { InviteTheme } from "@/lib/invite-theme";

/** «Раздел»-владелец надписей шаблона — так их узнаёт сохранение. */
export const TEMPLATE_LABEL_OWNER = "__template";

let current: { labels: Record<string, string>; editable: boolean } = { labels: {}, editable: false };

export function withTemplateLabels<T>(theme: InviteTheme, editable: boolean, render: () => T): T {
  const previous = current;
  current = { labels: theme.labels ?? {}, editable };
  try {
    return render();
  } finally {
    current = previous;
  }
}

/** Текст надписи без разметки — для мест, где нужен только текст. */
export function labelText(key: string, fallback: string): string {
  return current.labels[key] ?? fallback;
}

/**
 * Надпись шаблона элементом: в редакторе — редактируемое поле, у гостя —
 * текст пары или образца. Пустая у гостя не рисуется вовсе.
 */
export function L(
  key: string,
  fallback: string,
  opts: { tag?: string; className?: string; multiline?: boolean; attrs?: string } = {},
): string {
  const text = labelText(key, fallback);
  if (!text && !current.editable) return "";
  const tag = opts.tag ?? "span";
  const edit = current.editable
    ? ` data-inline-edit data-block-id="${TEMPLATE_LABEL_OWNER}" data-path="label:${esc(key)}"${opts.multiline ? ' data-multiline="true"' : ""}`
    : "";
  const content = opts.multiline ? esc(text).replace(/\n/g, "<br>") : esc(text);
  return `<${tag}${opts.className ? ` class="${opts.className}"` : ""}${opts.attrs ?? ""}${edit} data-component-key="label:${esc(key)}">${content}</${tag}>`;
}

/** Первые буквы имён пары: «Валерия и Давид» → ["В", "Д"]. */
export function initialsOf(names: string): [string, string] {
  const parts = names.trim().split(/\s+(?:и|&|and|\+)\s+/i);
  const first = Array.from(parts[0]?.trim() ?? "")[0] ?? "";
  const second = Array.from(parts[1]?.trim() ?? "")[0] ?? "";
  return [first.toUpperCase(), second.toUpperCase()];
}
