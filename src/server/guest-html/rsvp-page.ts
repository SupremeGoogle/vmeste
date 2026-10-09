/**
 * Отдельная страница ответа на приглашение — одна на два входа:
 *
 *   — именная ссылка `/i/{slug}/{token}/rsvp`: гость уже есть в списке,
 *     имя заполнено организатором, но его можно поправить;
 *   — общая ссылка `/i/{slug}/join`: гостя в списке ещё нет, он вписывает
 *     себя сам и после ответа появляется у организатора.
 *
 * Ни строчки клиентского кода. Гость открывает форму с телефона в дороге,
 * и она обязана работать до того, как догрузится любой скрипт.
 *
 * Отсюда же отказ прятать выбор блюда при «не сможем»: без JS этого не
 * сделать, поэтому блок подписан «если придёте», а сервер эти поля при
 * отказе игнорирует.
 */
import { listDrinkOptions, listMealOptions } from "@/server/repositories/guests";
import { formatDeadline } from "@/lib/format-datetime";
import { esc } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { getInviteTheme } from "@/server/repositories/invites";
import type { InviteTheme } from "@/lib/invite-theme";
import { RSVP_FIELDS_CSS, rsvpFieldsHtml } from "@/server/guest-html/rsvp-fields";
import { parseStoredAnswers, readAnswers, type RsvpQuestion } from "@/lib/rsvp-form";
import { gl, guestLang, themeInLang, withGuestLang } from "@/server/guest-html/guest-lang";

export const RSVP_ERRORS: Record<string, string> = {
  deadline: "Срок ответа истёк. Напишите организатору — он отметит вас вручную.",
  invalid: "Проверьте заполнение формы.",
  gone: "Приглашение больше не действует.",
  name: "Напишите, пожалуйста, своё имя — так пара поймёт, кто ответил.",
  limit: "Слишком много ответов подряд. Попробуйте через несколько минут.",
};

const RSVP_ERRORS_EN: Record<string, string> = {
  deadline: "The RSVP deadline has passed. Please contact the organizer, who can mark your reply for you.",
  invalid: "Please check the form.",
  gone: "This invitation is no longer active.",
  name: "Please enter your name so the couple knows who replied.",
  limit: "Too many replies in a row. Please try again in a few minutes.",
};

/** Текст ошибки анкеты по коду — на языке мероприятия; неизвестный код — «invalid». */
export function rsvpErrorText(code: string): string {
  const known = code in RSVP_ERRORS ? code : "invalid";
  return guestLang() === "en" ? RSVP_ERRORS_EN[known] : RSVP_ERRORS[known];
}

/** Докуда живёт гостевая сессия: месяц после свадьбы. Ответ может прийти
 *  и за полгода до неё, поэтому берём более поздний из двух сроков. */
export function rsvpSessionExpiry(eventDate: Date): Date {
  const afterEvent = new Date(eventDate);
  afterEvent.setDate(afterEvent.getDate() + 30);
  const month = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  return afterEvent > month ? afterEvent : month;
}

/** То, что гость уже ввёл, — чтобы после ошибки не заполнять всё заново. */
export type RsvpDraft = {
  /** `undefined` — в форме не было поля имени: имя не трогаем. */
  guestName: string | undefined;
  status: string;
  mealOptionId: string | null;
  drinkOptionIds: string[];
  plusOneName: string;
  plusOneMealOptionId: string | null;
  plusOneDrinkOptionIds: string[];
  comment: string;
  /** Песня для диджея; нет поля в форме — прежний ответ остаётся как был. */
  musicWish: string | undefined;
  answers: Record<string, string[]>;
};

export function readRsvpDraft(form: FormData, questions: RsvpQuestion[]): RsvpDraft {
  return {
    guestName: form.has("guestName") ? String(form.get("guestName")).trim() : undefined,
    status: String(form.get("status") ?? ""),
    mealOptionId: String(form.get("mealOptionId") ?? "") || null,
    drinkOptionIds: form.getAll("drinkOptionIds").map(String),
    plusOneName: String(form.get("plusOneName") ?? ""),
    plusOneMealOptionId: String(form.get("plusOneMealOptionId") ?? "") || null,
    plusOneDrinkOptionIds: form.getAll("plusOneDrinkOptionIds").map(String),
    comment: String(form.get("comment") ?? ""),
    musicWish: form.has("musicWish") ? String(form.get("musicWish")) : undefined,
    answers: readAnswers(form, questions),
  };
}

/**
 * Кто отвечает. Для именной ссылки — гость из базы (подходит запись
 * `findGuestByLinkToken` как есть), для общей — пустой «будущий гость».
 */
export type RsvpSubject = {
  eventId: string;
  /** `language` — язык мероприятия ("ru" | "en"); нет — русский. */
  event: { timezone: string; rsvpDeadline: Date | null; allowPlusOne: boolean; language?: string | null };
  displayName: string;
  rsvpStatus: string;
  mealOptionId: string | null;
  drinks: { drinkOptionId: string }[];
  plusOnes: { mealOptionId: string | null; drinks: { drinkOptionId: string }[] }[];
  plusOneAllowed: boolean;
  parentGuestId: string | null;
  plusOneName: string | null;
  comment: string | null;
  musicWish: string | null;
  rsvpAnswers: unknown;
};

const hidden = (name: string, value: string | null) =>
  value ? `<input type="hidden" name="${name}" value="${esc(value)}">` : "";

type RsvpPageOptions = {
  /** Куда отправлять форму. */
  action: string;
  /** Ссылка «вернуться к приглашению». */
  back: string;
  pageTitle: string;
  error?: string | null;
  message?: string | null;
  draft?: RsvpDraft;
};

export async function renderRsvpPage(
  subject: RsvpSubject,
  questions: RsvpQuestion[],
  opts: RsvpPageOptions,
): Promise<string> {
  const [theme, meals, drinks] = await Promise.all([
    getInviteTheme(subject.eventId),
    listMealOptions(subject.eventId),
    listDrinkOptions(subject.eventId),
  ]);
  // Сама страница — синхронно и на языке мероприятия.
  const language = subject.event.language;
  return withGuestLang(language, () => rsvpPageHtml(subject, questions, opts, themeInLang(theme, language), meals, drinks));
}

function rsvpPageHtml(
  subject: RsvpSubject,
  questions: RsvpQuestion[],
  opts: RsvpPageOptions,
  theme: InviteTheme,
  meals: { id: string; title: string }[],
  drinks: { id: string; title: string }[],
): string {
  // Поле показывается, только если в анкете есть вопрос и есть из чего выбрать.
  const mealShown = questions.some((question) => question.type === "MEAL") && meals.length > 0;
  const drinksShown = questions.some((question) => question.type === "DRINKS") && drinks.length > 0;
  const plusOne = subject.plusOnes[0] ?? null;
  const plusOneAllowed =
    subject.event.allowPlusOne && subject.plusOneAllowed && subject.parentGuestId === null;
  const answered = subject.rsvpStatus !== "PENDING";
  const deadline = subject.event.rsvpDeadline;
  const draft = opts.draft;

  const status = draft?.status ?? subject.rsvpStatus;
  const meal = draft ? draft.mealOptionId : subject.mealOptionId;
  const chosenDrinks = draft ? draft.drinkOptionIds : subject.drinks.map((row) => row.drinkOptionId);
  const plusOneMeal = draft ? draft.plusOneMealOptionId : plusOne?.mealOptionId ?? null;
  const plusOneDrinks = draft ? draft.plusOneDrinkOptionIds : plusOne?.drinks.map((row) => row.drinkOptionId) ?? [];
  // Черновик ответов — в том же виде, что и сохранённый снимок.
  const answers = draft
    ? Object.entries(draft.answers).map(([questionId, value]) => ({
        questionId, title: "", type: "SHORT_TEXT" as const, value: value.filter(Boolean),
      }))
    : parseStoredAnswers(subject.rsvpAnswers);
  const name = draft?.guestName ?? subject.displayName;

  const choice = (
    fieldName: string,
    value: string,
    label: string,
    checked: boolean,
    required = false,
  ) =>
    `<label class="choice"><input type="radio" name="${fieldName}" value="${esc(value)}"${
      checked ? " checked" : ""
    }${required ? " required" : ""}><span>${esc(label)}</span></label>`;

  const mealFieldset = (fieldName: string, legend: string, selected: string | null) =>
    `<fieldset><legend>${esc(legend)}</legend>
${meals.map((option) => choice(fieldName, option.id, option.title, selected === option.id)).join("")}
</fieldset>`;

  // Напитков можно отметить несколько, поэтому флажки, а не переключатель.
  const drinkFieldset = (fieldName: string, legend: string, selected: string[]) =>
    `<fieldset><legend>${esc(legend)}</legend>
${drinks
  .map(
    (drink) =>
      `<label class="choice"><input type="checkbox" name="${fieldName}" value="${esc(drink.id)}"${
        selected.includes(drink.id) ? " checked" : ""
      }><span>${esc(drink.title)}</span></label>`,
  )
  .join("")}
</fieldset>`;

  // Меню или бар убрали из анкеты — прежний выбор уходит скрытыми полями,
  // иначе новый ответ молча стёр бы его (так же делают встроенные анкеты).
  const kept = [
    mealShown ? "" : hidden("mealOptionId", meal),
    drinksShown ? "" : chosenDrinks.map((id) => hidden("drinkOptionIds", id)).join(""),
    plusOneAllowed && !mealShown ? hidden("plusOneMealOptionId", plusOneMeal) : "",
    plusOneAllowed && !drinksShown ? plusOneDrinks.map((id) => hidden("plusOneDrinkOptionIds", id)).join("") : "",
  ].join("");

  // Срок прошёл — говорим сразу, а не после того, как гость всё заполнит.
  const closed = Boolean(subject.event.rsvpDeadline && Date.now() > subject.event.rsvpDeadline.getTime());
  const errorText = opts.error
    ? opts.message || rsvpErrorText(opts.error)
    : closed ? rsvpErrorText("deadline") : null;
  const timezone = subject.event.timezone;

  const body = `${subject.displayName ? `<p class="who">${esc(subject.displayName)}</p>` : ""}
<section style="padding-bottom:0">
<h1 class="center" style="font-size:1.5rem">${answered ? gl("Можно изменить ответ", "You can update your reply") : gl("Подтвердите присутствие", "Please RSVP")}</h1>
${deadline ? `<p class="center small muted">${esc(gl(`до ${formatDeadline(deadline, timezone)}`, formatDeadline(deadline, timezone, "en")))}</p>` : ""}
</section>
${errorText ? `<p class="error">${esc(errorText)}</p>` : ""}
<form method="post" action="${esc(opts.action)}">${kept}
  <label class="field"><span>${gl("Ваше имя и фамилия", "Your full name")}</span>
  <input name="guestName" maxlength="120" required autocomplete="name" value="${esc(name)}" placeholder="${gl("Имя и фамилия", "Full name")}">
  </label>

  <fieldset>
    <legend>${gl("Придёте?", "Will you attend?")}</legend>
    ${choice("status", "ACCEPTED", gl("Да, будем", "Yes, we’ll be there"), status === "ACCEPTED", true)}
    ${choice("status", "DECLINED", gl("К сожалению, не сможем", "Sorry, we can’t make it"), status === "DECLINED")}
  </fieldset>

  ${
    plusOneAllowed
      ? `<label class="field"><span>${gl("Имя спутника, если придёте вдвоём", "Your plus-one’s name, if you’re bringing one")}</span>
<input name="plusOneName" maxlength="120" value="${esc(draft?.plusOneName ?? subject.plusOneName ?? "")}" placeholder="${gl("Имя и фамилия", "Full name")}">
</label>`
      : ""
  }

  ${rsvpFieldsHtml(questions, {
    meals, drinks,
    selectedMeal: meal,
    selectedDrinks: chosenDrinks,
    answers,
    musicWish: draft?.musicWish ?? subject.musicWish ?? "",
    hint: gl("если придёте", "if attending"),
  })}
  ${
    plusOneAllowed && mealShown
      ? mealFieldset("plusOneMealOptionId", gl("Что подать спутнику — если придёте вдвоём", "Meal for your plus-one, if you’re bringing one"), plusOneMeal)
      : ""
  }

  ${
    plusOneAllowed && drinksShown
      ? drinkFieldset("plusOneDrinkOptionIds", gl("Что будет пить спутник — если придёте вдвоём", "Drinks for your plus-one, if you’re bringing one"), plusOneDrinks)
      : ""
  }

  <label class="field"><span>${gl("Что-то ещё для организатора", "Anything else the organizer should know")}</span>
  <textarea name="comment" maxlength="500" rows="3">${esc(draft?.comment ?? subject.comment ?? "")}</textarea></label>

  <button class="submit" type="submit">${answered ? gl("Сохранить ответ", "Save reply") : gl("Отправить", "Send")}</button>
</form>
<p class="foot"><a href="${esc(opts.back)}">${gl("Вернуться к приглашению", "Back to the invitation")}</a></p>`;

  return invitePage({ title: opts.pageTitle, theme, body, noindex: true, extraCss: RSVP_FIELDS_CSS });
}
