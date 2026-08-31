/**
 * Форма настроек оформления → тема.
 *
 * Отдельно от страницы по той же причине, что и `invite-forms.ts`:
 * перевод формы в значения — чистая функция, её можно проверить тестом
 * без браузера и без базы.
 */
import { inviteThemeSchema, parseTheme, type InviteTheme } from "@/lib/invite-theme";

export type FormLike = { get(name: string): FormDataEntryValue | null };

const str = (form: FormLike, name: string) => String(form.get(name) ?? "").trim();

/**
 * Собирает тему из формы. Флажки приходят как `"on"` или отсутствуют —
 * поэтому проверяется наличие, а не значение.
 *
 * Поля, которых в форме нет, берутся из текущей темы: настройки разбиты
 * на две формы (палитра и типографика), и сохранение одной не должно
 * обнулять другую.
 */
export function themeFromForm(form: FormLike, current: InviteTheme): { ok: true; theme: InviteTheme } | { ok: false; message: string } {
  const pick = (name: string, fallback: string) => {
    const value = str(form, name);
    return value === "" ? fallback : value;
  };

  // Флажок присутствует в форме только когда его отправляли. Иначе
  // сохранение палитры выключало бы рамку, заданную в другой форме.
  const flag = (name: string, fallback: boolean) =>
    form.get(`${name}__sent`) === null ? fallback : form.get(name) !== null;

  return parseTheme({
    v: inviteThemeSchema.shape.v.parse(undefined),
    template: current.template,

    bg: pick("bg", current.bg),
    card: pick("card", current.card),
    ink: pick("ink", current.ink),
    muted: pick("muted", current.muted),
    accent: pick("accent", current.accent),
    line: pick("line", current.line),

    headingFont: pick("headingFont", current.headingFont),
    bodyFont: pick("bodyFont", current.bodyFont),
    corner: pick("corner", current.corner),
    divider: pick("divider", current.divider),
    cover: pick("cover", current.cover),
    align: pick("align", current.align),
    timeline: pick("timeline", current.timeline),
    sections: pick("sections", current.sections),
    dateStyle: pick("dateStyle", current.dateStyle),
    intro: pick("intro", current.intro),

    frame: flag("frame", current.frame),
    capsHeadings: flag("capsHeadings", current.capsHeadings),
  });
}
