/**
 * Анкета RSVP «как в Google Формах»: типы полей, разбор ответов и проверка.
 *
 * Чистая логика без базы — её используют и страница ответа гостя, и
 * встроенные в приглашение анкеты, и конструктор в панели, и тесты.
 *
 * Три особых типа — MEAL, DRINKS и MUSIC: «кто что ест», «кто что пьёт»
 * и «какую песню поставить». Их ответы ложатся в свои поля гостя
 * (`Guest.mealOptionId`, `GuestDrink`, `Guest.musicWish`): по ним считает
 * кухня и бар и собирается список для диджея. Остальные ответы хранятся
 * снимком в `Guest.rsvpAnswers`.
 */
import type { Lang } from "@/lib/i18n";

export const RSVP_QUESTION_TYPES = [
  "SHORT_TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN", "RATING", "DATE", "MEAL", "DRINKS", "MUSIC",
] as const;

export type RsvpQuestionType = (typeof RSVP_QUESTION_TYPES)[number];

export const RSVP_TYPE_LABEL: Record<RsvpQuestionType, string> = {
  SHORT_TEXT: "Короткий ответ",
  LONG_TEXT: "Развёрнутый ответ",
  SINGLE_CHOICE: "Один из списка",
  MULTIPLE_CHOICE: "Несколько из списка",
  DROPDOWN: "Раскрывающийся список",
  RATING: "Оценка 1–5",
  DATE: "Дата",
  MEAL: "Что будете есть (меню)",
  DRINKS: "Что будете пить (бар)",
  MUSIC: "Песня для диджея",
};

/** Те же названия типов для кабинета на английском. */
export const RSVP_TYPE_LABEL_EN: Record<RsvpQuestionType, string> = {
  SHORT_TEXT: "Short answer",
  LONG_TEXT: "Long answer",
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  DROPDOWN: "Dropdown",
  RATING: "Rating 1–5",
  DATE: "Date",
  MEAL: "Meal choice (menu)",
  DRINKS: "Drinks (bar)",
  MUSIC: "Song for the DJ",
};

export function rsvpTypeLabel(type: RsvpQuestionType, lang: Lang): string {
  return lang === "en" ? RSVP_TYPE_LABEL_EN[type] : RSVP_TYPE_LABEL[type];
}

/** Поля, у которых организатор задаёт свои варианты ответа. */
export const WITH_OPTIONS: ReadonlySet<RsvpQuestionType> = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"]);

/** Меню, бар и песня — по одному на анкете: два «что будете есть» гость не поймёт. */
export const SINGLETON: ReadonlySet<RsvpQuestionType> = new Set(["MEAL", "DRINKS", "MUSIC"]);

export type RsvpQuestion = {
  id: string;
  type: RsvpQuestionType;
  title: string;
  description: string;
  required: boolean;
  options: string[];
};

/** Ответ снимком: вопрос вместе с текстом, как он выглядел в момент ответа. */
export type RsvpAnswer = {
  questionId: string;
  title: string;
  type: RsvpQuestionType;
  value: string | string[];
};

export const MAX_OPTIONS = 30;
export const MAX_TEXT = 1000;

/** Имя поля формы для вопроса: `q:<id>`. */
export const fieldName = (questionId: string) => `q:${questionId}`;

/** Встроенная анкета без конструктора: меню и бар, как было до него. */
export const DEFAULT_QUESTIONS: Omit<RsvpQuestion, "id">[] = [
  { type: "MEAL", title: "Что подать на ужин", description: "", required: false, options: [] },
  { type: "DRINKS", title: "Что будете пить — можно отметить несколько", description: "", required: false, options: [] },
];

/** Те же поля для мероприятия на английском: их видят гости, язык — `Event.language`. */
export const DEFAULT_QUESTIONS_EN: Omit<RsvpQuestion, "id">[] = [
  { type: "MEAL", title: "What would you like for dinner?", description: "", required: false, options: [] },
  { type: "DRINKS", title: "What would you like to drink? Pick as many as you like", description: "", required: false, options: [] },
];

export function defaultQuestions(lang: Lang): Omit<RsvpQuestion, "id">[] {
  return lang === "en" ? DEFAULT_QUESTIONS_EN : DEFAULT_QUESTIONS;
}

export function isRsvpQuestionType(value: string): value is RsvpQuestionType {
  return (RSVP_QUESTION_TYPES as readonly string[]).includes(value);
}

/** Варианты из JSON базы — только непустые строки, без повторов. */
export function cleanOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const text = typeof item === "string" ? item.trim().slice(0, 200) : "";
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

/** Сырые ответы формы: `q:<id>` → все значения поля (у флажков их несколько). */
export function readAnswers(form: FormData, questions: RsvpQuestion[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const question of questions) {
    if (SINGLETON.has(question.type)) continue;
    const name = fieldName(question.id);
    if (!form.has(name)) continue;
    out[question.id] = form.getAll(name).map((value) => String(value));
  }
  return out;
}

export type AnswerCheck =
  | { ok: true; answers: RsvpAnswer[] }
  | { ok: false; message: string };

/**
 * Проверить ответы и собрать снимок. Обязательность действует только для
 * тех, кто придёт: отказавшегося не заставляют выбирать горячее.
 * На вопросы, которых в форме не было, прежний ответ сохраняется
 * (`previous`) — как и ответы на вопросы, которые организатор уже удалил:
 * снимок — это история, повторный ответ гостя её не стирает.
 */
export function checkAnswers(
  questions: RsvpQuestion[],
  raw: Record<string, string[]>,
  status: "PENDING" | "ACCEPTED" | "DECLINED",
  previous: RsvpAnswer[] = [],
): AnswerCheck {
  const answers: RsvpAnswer[] = [];
  const attending = status === "ACCEPTED";

  for (const question of questions) {
    if (SINGLETON.has(question.type)) continue;
    const values = raw[question.id];
    if (values === undefined) {
      const kept = previous.find((answer) => answer.questionId === question.id);
      if (kept) answers.push({ ...kept, title: question.title, type: question.type });
      continue;
    }
    const cleaned = values.map((value) => value.trim()).filter(Boolean);
    const label = `«${question.title}»`;

    if (cleaned.length === 0) {
      if (question.required && attending) return { ok: false, message: `Ответьте на вопрос ${label}` };
      continue;
    }

    let value: string | string[];
    switch (question.type) {
      case "SHORT_TEXT":
      case "LONG_TEXT":
        value = cleaned[0].slice(0, question.type === "SHORT_TEXT" ? 200 : MAX_TEXT);
        break;
      case "SINGLE_CHOICE":
      case "DROPDOWN":
        if (!question.options.includes(cleaned[0])) return { ok: false, message: `Такого варианта нет в вопросе ${label}` };
        value = cleaned[0];
        break;
      case "MULTIPLE_CHOICE": {
        const unique = [...new Set(cleaned)];
        if (unique.some((item) => !question.options.includes(item))) return { ok: false, message: `Такого варианта нет в вопросе ${label}` };
        value = question.options.filter((option) => unique.includes(option));
        break;
      }
      case "RATING": {
        const n = Number(cleaned[0]);
        if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, message: `Оценка в вопросе ${label} — от 1 до 5` };
        value = String(n);
        break;
      }
      case "DATE":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned[0])) return { ok: false, message: `Проверьте дату в вопросе ${label}` };
        value = cleaned[0];
        break;
      default:
        continue;
    }
    answers.push({ questionId: question.id, title: question.title, type: question.type, value });
  }
  const current = new Set(questions.map((question) => question.id));
  answers.push(...previous.filter((answer) => !current.has(answer.questionId)));
  return { ok: true, answers };
}

/** Снимок ответов из JSON базы — всё, что не похоже на ответ, отбрасывается. */
export function parseStoredAnswers(raw: unknown): RsvpAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is RsvpAnswer =>
      !!item && typeof item === "object" &&
      typeof (item as RsvpAnswer).questionId === "string" &&
      typeof (item as RsvpAnswer).title === "string" &&
      (typeof (item as RsvpAnswer).value === "string" || Array.isArray((item as RsvpAnswer).value)),
  );
}

/** Ответ для таблицы: списки через запятую, дата по-русски, оценка звёздами. */
export function formatAnswer(answer: RsvpAnswer): string {
  if (Array.isArray(answer.value)) return answer.value.join(", ");
  if (answer.type === "DATE") {
    const [y, m, d] = answer.value.split("-");
    return y && m && d ? `${d}.${m}.${y}` : answer.value;
  }
  if (answer.type === "RATING") return `${"★".repeat(Number(answer.value))}${"☆".repeat(5 - Number(answer.value))}`;
  return answer.value;
}
