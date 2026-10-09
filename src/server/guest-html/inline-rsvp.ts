/**
 * Анкета прямо на странице приглашения — у шаблонов, где она часть дизайна.
 *
 * Собирается одинаково для именной ссылки (гость известен, ответы
 * заполнены) и для общей (гость впишет себя сам, имя может прийти
 * заранее в `?name=`). Раньше сборка жила только в именном маршруте,
 * и на общей ссылке такие шаблоны показывали анкету-муляж.
 */
import { listDrinkOptions, listMealOptions } from "@/server/repositories/guests";
import { effectiveRsvpQuestions } from "@/server/repositories/rsvp-questions";
import { rsvpFieldsHtml } from "@/server/guest-html/rsvp-fields";
import { esc } from "@/server/guest-html/layout";
import type { TiliRsvp } from "@/server/guest-html/tili/markup";
import { flashText, type Flash } from "@/server/guest-html/flash";
import type { RsvpAnswer } from "@/lib/rsvp-form";
import { withGuestLang } from "@/server/guest-html/guest-lang";

export function hasInlineRsvp(template: string | undefined): boolean {
  const id = template ?? "";
  // По стандарту (docs/template-standard.md, §2) анкета в приглашении у всех
  // шаблонов: у одних своя, у остальных общая (`inline-rsvp-form.ts`).
  return id !== "";
}

export type InlineRsvpGuest = {
  name: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  mealOptionId: string | null;
  drinkIds: string[];
  answers: RsvpAnswer[];
  musicWish: string;
  plusOneAllowed: boolean;
  comment: string;
  plusOneName: string;
  plusOneMealOptionId: string | null;
  plusOneDrinkOptionIds: string[];
};

export async function buildInlineRsvp(
  eventId: string,
  template: string,
  guest: InlineRsvpGuest,
  opts: {
    action: string;
    saved: boolean;
    flash: Flash;
    /** Срок ответа прошёл: анкета сразу говорит об этом, а не после отправки. */
    closed?: boolean;
    /** Язык мероприятия: на нём тексты ошибок и полей анкеты. */
    language?: string | null;
  },
): Promise<TiliRsvp & { plusOneAllowed: boolean }> {
  const [drinks, meals, questions] = await Promise.all([
    listDrinkOptions(eventId),
    listMealOptions(eventId),
    effectiveRsvpQuestions(eventId),
  ]);
  // Поля конструктора — перед кнопкой отправки, в стиле шаблона. Бар у
  // этих анкет свой, поэтому здесь его не рисуем, а только прячем, если
  // организатор убрал его из анкеты.
  const showMeal = questions.some((question) => question.type === "MEAL") && meals.length > 0;
  // Какой вопрос не заполнен — прямо над вопросами: у самих шаблонов
  // сообщение об ошибке общее, «проверьте анкету».
  const flash: Flash = opts.flash.error || !opts.closed || opts.saved ? opts.flash : { error: "deadline", message: null };
  const errorText = withGuestLang(opts.language, () => flashText(flash));
  const questionFields = withGuestLang(opts.language, () => rsvpFieldsHtml(questions, {
    meals, drinks,
    selectedMeal: guest.mealOptionId,
    selectedDrinks: guest.drinkIds,
    answers: guest.answers,
    musicWish: guest.musicWish,
    // У «Тили-тесто» поле о музыке своё, в вёрстке образца.
    skip: { drinks: true, music: template === "tili" },
  }));
  const extraFields = (errorText ? `<p class="rsvp-error" role="alert">${esc(errorText)}</p>` : "") + questionFields;
  return {
    action: opts.action,
    guestName: guest.name,
    status: guest.status,
    drinks,
    chosenDrinks: guest.drinkIds,
    extraFields,
    questionFields,
    errorText: errorText ?? undefined,
    drinksHidden: !questions.some((question) => question.type === "DRINKS"),
    plusOneAllowed: guest.plusOneAllowed,
    musicWish: guest.musicWish,
    keep: {
      // Блюдо в анкете видно — скрытое поле с прежним выбором перебило бы новый.
      mealOptionId: showMeal ? null : guest.mealOptionId,
      comment: guest.comment,
      plusOneName: guest.plusOneName,
      plusOneMealOptionId: guest.plusOneMealOptionId,
      plusOneDrinkOptionIds: guest.plusOneDrinkOptionIds,
    },
    saved: opts.saved,
    error: flash.error,
  };
}
