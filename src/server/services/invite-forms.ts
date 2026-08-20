/**
 * Перевод полей формы конструктора в содержимое блока.
 *
 * Вынесено из страницы отдельным модулем по двум причинам: это чистая
 * функция, которую можно проверить тестами без браузера и без базы, и это
 * единственное место, где решается, как текст из textarea превращается
 * в структуру.
 *
 * Тайминг вводится текстом, строка на пункт: `16:00 | Сбор гостей | у входа`.
 * Альтернатива — набор полей с кнопками «добавить строку», то есть
 * клиентский компонент и состояние. Организатор набивает тайминг один раз
 * и обычно копирует его из переписки с площадкой готовым списком; текст
 * вставляется целиком, а форма с кнопками заставила бы вводить по пункту.
 */
import type { BlockType } from "@/generated/prisma/enums";
import { parseBlockContent } from "@/lib/invite-blocks";
import type { AnyBlockContent } from "@/lib/invite-blocks";

/** Разделитель полей в строке тайминга: `|`, но терпим и табуляцию. */
const FIELD_SPLIT = /\s*[|\t]\s*/;

export function parseTimelineText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => {
      const [time = "", title = "", note = ""] = line.split(FIELD_SPLIT);
      // Строка без разделителя — это пункт без времени, а не время без пункта:
      // «Первый танец» осмысленнее, чем время в поле названия.
      return title || note
        ? { time: time.slice(0, 10), title: title.slice(0, 120), note: note.slice(0, 120) }
        : { time: "", title: time.slice(0, 120), note: "" };
    });
}

export function timelineToText(items: { time: string; title: string; note: string }[]): string {
  return items
    .map((item) => [item.time, item.title, item.note].filter(Boolean).join(" | "))
    .join("\n");
}

/** Палитра дресс-кода вводится через запятую: `#c8b7a6, #6b705c`. */
export function parsePalette(text: string): string[] {
  return text
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith("#") ? value : `#${value}`))
    .slice(0, 8);
}

type FormLike = { get(name: string): FormDataEntryValue | null };

const str = (form: FormLike, name: string) => String(form.get(name) ?? "");

/**
 * Собрать содержимое блока из формы и проверить строгой схемой.
 * Кривое содержимое возвращается ошибкой и до базы не доходит.
 */
export function blockContentFromForm(
  type: BlockType,
  form: FormLike,
): { ok: true; content: AnyBlockContent } | { ok: false; message: string } {
  switch (type) {
    case "COVER":
      return parseBlockContent("COVER", {
        title: str(form, "title"),
        names: str(form, "names"),
        dateText: str(form, "dateText"),
        subtitle: str(form, "subtitle"),
        imageUrl: str(form, "imageUrl"),
      });
    case "TIMELINE":
      return parseBlockContent("TIMELINE", {
        title: str(form, "title"),
        items: parseTimelineText(str(form, "items")),
      });
    case "VENUE":
      return parseBlockContent("VENUE", {
        title: str(form, "title"),
        name: str(form, "name"),
        address: str(form, "address"),
        note: str(form, "note"),
      });
    case "DRESSCODE":
      return parseBlockContent("DRESSCODE", {
        title: str(form, "title"),
        text: str(form, "text"),
        palette: parsePalette(str(form, "palette")),
      });
    case "MAP":
      return parseBlockContent("MAP", {
        title: str(form, "title"),
        yandexUrl: str(form, "yandexUrl"),
        googleUrl: str(form, "googleUrl"),
        note: str(form, "note"),
      });
    case "TEXT":
      return parseBlockContent("TEXT", {
        title: str(form, "title"),
        text: str(form, "text"),
      });
    case "RSVP_FORM":
      return parseBlockContent("RSVP_FORM", {
        title: str(form, "title"),
        text: str(form, "text"),
        buttonLabel: str(form, "buttonLabel"),
      });
  }
}
