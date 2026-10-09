/**
 * Поля анкеты RSVP из конструктора — строкой HTML для гостевых страниц.
 *
 * Семантические поля получают общую вёрстку и материалы своего шаблона
 * через invite-controls-css.ts. Классы field и choice также используются
 * на отдельной странице ответа.
 *
 * Без JavaScript: форму открывают с телефона в дороге. Поэтому
 * обязательность не ставится атрибутом `required` — отказавшегося гостя
 * браузер не должен заставлять выбирать горячее; проверяет сервер, и
 * только у тех, кто придёт.
 */
import { esc } from "@/server/guest-html/layout";
import { fieldName, type RsvpAnswer, type RsvpQuestion } from "@/lib/rsvp-form";
import { gl } from "@/server/guest-html/guest-lang";

export type RsvpFieldsContext = {
  meals: { id: string; title: string }[];
  drinks: { id: string; title: string }[];
  selectedMeal: string | null;
  selectedDrinks: string[];
  answers: RsvpAnswer[];
  /** Песня, которую гость уже предложил. */
  musicWish?: string;
  /** Меню, бар и песня: у встроенных анкет бар свой, а у «Тили-тесто»
   *  и поле о музыке, — их здесь не рисуем. */
  skip?: { meal?: boolean; drinks?: boolean; music?: boolean };
  /** Подпись для блюда и напитков, если анкета за двоих («если придёте»). */
  hint?: string;
};

const mark = (question: RsvpQuestion) => (question.required ? ' <span aria-hidden="true">*</span>' : "");
const note = (question: RsvpQuestion) => (question.description ? `<small>${esc(question.description)}</small>` : "");

function current(ctx: RsvpFieldsContext, id: string): string[] {
  const answer = ctx.answers.find((item) => item.questionId === id);
  if (!answer) return [];
  return Array.isArray(answer.value) ? answer.value : [answer.value];
}

function choice(type: "radio" | "checkbox", name: string, value: string, label: string, checked: boolean): string {
  return `<label class="choice"><input type="${type}" name="${esc(name)}" value="${esc(value)}"${checked ? " checked" : ""}><span>${esc(label)}</span></label>`;
}

function field(question: RsvpQuestion, ctx: RsvpFieldsContext): string {
  const name = fieldName(question.id);
  const values = current(ctx, question.id);
  // Пустое скрытое значение первым: по нему сервер понимает, что вопрос был
  // на странице, даже если гость снял все флажки, — и стирает прежний ответ.
  const present = `<input type="hidden" name="${esc(name)}" value="">`;
  const legend = `<legend>${esc(question.title)}${mark(question)}</legend>${note(question)}`;

  switch (question.type) {
    case "MEAL":
      if (ctx.skip?.meal || ctx.meals.length === 0) return "";
      return `<fieldset data-rsvp-field="meal"><legend>${esc(question.title)}${ctx.hint ? ` — ${esc(ctx.hint)}` : ""}${mark(question)}</legend>${note(question)}
${ctx.meals.map((meal) => choice("radio", "mealOptionId", meal.id, meal.title, ctx.selectedMeal === meal.id)).join("")}</fieldset>`;
    case "DRINKS":
      if (ctx.skip?.drinks || ctx.drinks.length === 0) return "";
      return `<fieldset data-rsvp-field="drinks"><legend>${esc(question.title)}${ctx.hint ? ` — ${esc(ctx.hint)}` : ""}${mark(question)}</legend>${note(question)}
${ctx.drinks.map((drink) => choice("checkbox", "drinkOptionIds", drink.id, drink.title, ctx.selectedDrinks.includes(drink.id))).join("")}</fieldset>`;
    case "MUSIC":
      if (ctx.skip?.music) return "";
      return `<label class="field" data-rsvp-field="music"><span>${esc(question.title)}${mark(question)}</span>${note(question)}<input name="musicWish" maxlength="200" value="${esc(ctx.musicWish ?? "")}" placeholder="${gl("Исполнитель — название", "Artist — song")}"></label>`;
    case "SHORT_TEXT":
      return `<label class="field"><span>${esc(question.title)}${mark(question)}</span>${note(question)}${present}<input name="${esc(name)}" maxlength="200" value="${esc(values[0] ?? "")}"></label>`;
    case "LONG_TEXT":
      return `<label class="field"><span>${esc(question.title)}${mark(question)}</span>${note(question)}${present}<textarea name="${esc(name)}" maxlength="1000" rows="3">${esc(values[0] ?? "")}</textarea></label>`;
    case "DATE":
      return `<label class="field"><span>${esc(question.title)}${mark(question)}</span>${note(question)}${present}<input type="date" name="${esc(name)}" value="${esc(values[0] ?? "")}"></label>`;
    case "DROPDOWN":
      return `<label class="field"><span>${esc(question.title)}${mark(question)}</span>${note(question)}${present}<select name="${esc(name)}"><option value="">${gl("— выберите —", "— choose —")}</option>${question.options
        .map((option) => `<option value="${esc(option)}"${values.includes(option) ? " selected" : ""}>${esc(option)}</option>`)
        .join("")}</select></label>`;
    case "SINGLE_CHOICE":
      return `<fieldset>${legend}${present}${question.options.map((option) => choice("radio", name, option, option, values.includes(option))).join("")}</fieldset>`;
    case "MULTIPLE_CHOICE":
      return `<fieldset>${legend}${present}${question.options.map((option) => choice("checkbox", name, option, option, values.includes(option))).join("")}</fieldset>`;
    case "RATING":
      return `<fieldset class="rsvp-rating">${legend}${present}${[1, 2, 3, 4, 5]
        .map((n) => choice("radio", name, String(n), `${n}`, values.includes(String(n))))
        .join("")}</fieldset>`;
    default:
      return "";
  }
}

export function rsvpFieldsHtml(questions: RsvpQuestion[], ctx: RsvpFieldsContext): string {
  const html = questions.map((question) => field(question, ctx)).filter(Boolean).join("\n");
  return html ? `<div class="rsvp-fields">${html}</div>` : "";
}

/** Scoped so native attendance/drink controls keep their own design. */
export const RSVP_FIELDS_CSS = `
.rsvp-fields{display:grid;gap:var(--vm-space,1.5rem);min-width:0;font-family:var(--vm-font,inherit);color:var(--vm-ink,inherit);text-align:left}
.rsvp-fields.rsvp-fields fieldset{display:block;min-width:0;margin:0;padding:0;border:0}
.rsvp-fields.rsvp-fields legend,.rsvp-fields.rsvp-fields .field>span{display:block;width:100%;margin:0 0 .65rem;padding:0;font-family:var(--vm-font,inherit);font-size:var(--vm-label-size,1rem);font-weight:500;line-height:1.5;letter-spacing:var(--vm-label-spacing,normal);text-transform:var(--vm-label-case,none);color:var(--vm-label-color,inherit)}
.rsvp-fields.rsvp-fields small{display:block;margin:0 0 .6rem;font:400 .85rem/1.5 var(--vm-font,inherit);color:inherit;opacity:.72}
.rsvp-fields.rsvp-fields .choice{display:flex;align-items:center;gap:.75rem;min-height:44px;margin:.3rem 0;padding:.4rem 0;border:0;border-radius:0;background:transparent;font-family:var(--vm-choice-font,var(--vm-font,inherit));font-size:var(--vm-choice-size,1rem);font-weight:400;line-height:1.5;color:inherit;cursor:pointer;text-transform:none;letter-spacing:normal}
.rsvp-fields .choice>span{min-width:0;overflow-wrap:anywhere}
.rsvp-fields.rsvp-fields .choice input{position:static;flex:none;appearance:none;opacity:1;pointer-events:auto;width:20px;height:20px;margin:0;padding:0;border:1.5px solid color-mix(in srgb,currentColor 50%,transparent);border-radius:50%;background:transparent;color:inherit;cursor:pointer}
.rsvp-fields.rsvp-fields .choice input[type=checkbox]{border-radius:4px}
.rsvp-fields.rsvp-fields .choice input:checked{border-color:var(--vm-accent,currentColor);background:var(--vm-accent,currentColor);box-shadow:inset 0 0 0 4px var(--vm-check-center,#fff)}
.rsvp-fields.rsvp-fields .field{display:block;min-width:0;margin:0;font:inherit;color:inherit}
.rsvp-fields.rsvp-fields .field :is(input:not([type=hidden]),textarea,select){display:block;box-sizing:border-box;width:100%;max-width:100%;min-width:0;min-height:44px;margin:0;padding:.75rem .85rem;border:var(--vm-input-border,1px) solid color-mix(in srgb,currentColor 25%,transparent);border-bottom:1px solid color-mix(in srgb,currentColor 35%,transparent);border-radius:var(--vm-radius,.7rem);background:var(--vm-input-bg,color-mix(in srgb,currentColor 3%,transparent));color:inherit;font:400 1rem/1.5 var(--vm-choice-font,var(--vm-font,inherit));text-align:left;letter-spacing:normal}
.rsvp-fields .field textarea{resize:vertical}
.rsvp-fields .field select option{background:Canvas;color:CanvasText}
.rsvp-fields :is(input,textarea,select):focus-visible{outline:2px solid var(--vm-accent,currentColor);outline-offset:4px}
.rsvp-fields.rsvp-fields .rsvp-rating{display:flex;flex-wrap:wrap;gap:.5rem}
.rsvp-fields .rsvp-rating legend,.rsvp-fields .rsvp-rating small{flex-basis:100%}
.rsvp-fields.rsvp-fields .rsvp-rating .choice{flex:0 0 auto;justify-content:center;gap:.4rem;min-width:44px}
.rsvp-error{margin:.25rem 0;padding:.6rem .8rem;border-radius:.6rem;background:rgba(138,43,43,.08);color:#8a2b2b;font-size:.95em}
`.replace(/\n/g, "");
