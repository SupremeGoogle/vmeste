/**
 * Поля анкеты RSVP мероприятия (конструктор «как в Google Формах»).
 *
 * Пока организатор конструктор не открывал, строк нет — и анкета ведёт
 * себя как раньше: меню и бар (`DEFAULT_QUESTIONS`). При первом открытии
 * конструктора эти поля появляются настоящими строками, и дальше их можно
 * переименовать, переставить или убрать.
 */
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import {
  DEFAULT_QUESTIONS, MAX_OPTIONS, SINGLETON, WITH_OPTIONS, cleanOptions, isRsvpQuestionType,
  type RsvpQuestion, type RsvpQuestionType,
} from "@/lib/rsvp-form";

const select = { id: true, type: true, title: true, description: true, required: true, options: true } as const;

type Row = { id: string; type: string; title: string; description: string; required: boolean; options: unknown };

const view = (row: Row): RsvpQuestion => ({
  id: row.id,
  type: row.type as RsvpQuestionType,
  title: row.title,
  description: row.description,
  required: row.required,
  options: cleanOptions(row.options),
});

/** Поля анкеты для гостя. Нет своих — меню и бар, как до конструктора. */
export async function effectiveRsvpQuestions(eventId: string): Promise<RsvpQuestion[]> {
  const rows = await db.rsvpQuestion.findMany({ where: { eventId }, orderBy: { order: "asc" }, select });
  if (rows.length > 0) return rows.map(view);
  return DEFAULT_QUESTIONS.map((question) => ({ ...question, id: `default-${question.type.toLowerCase()}` }));
}

/**
 * Поля для конструктора: при первом открытии заводим меню и бар строками.
 * Два одновременных первых открытия не задвоят их: меню и бар уникальны
 * на мероприятие частичным индексом в базе, вторая вставка пропускается.
 */
export async function listRsvpQuestions(ctx: EventContext): Promise<RsvpQuestion[]> {
  const rows = await db.rsvpQuestion.findMany({ where: { eventId: ctx.eventId }, orderBy: { order: "asc" }, select });
  if (rows.length > 0) return rows.map(view);
  await db.rsvpQuestion.createMany({
    data: DEFAULT_QUESTIONS.map((question, order) => ({
      orgId: ctx.orgId, eventId: ctx.eventId, order,
      type: question.type, title: question.title, description: question.description, required: question.required, options: question.options,
    })),
    skipDuplicates: true,
  });
  return (await db.rsvpQuestion.findMany({ where: { eventId: ctx.eventId }, orderBy: { order: "asc" }, select })).map(view);
}

const DEFAULT_TITLE: Record<RsvpQuestionType, string> = {
  SHORT_TEXT: "Новый вопрос",
  LONG_TEXT: "Новый вопрос",
  SINGLE_CHOICE: "Выберите вариант",
  MULTIPLE_CHOICE: "Отметьте подходящее",
  DROPDOWN: "Выберите из списка",
  RATING: "Оцените от 1 до 5",
  DATE: "Укажите дату",
  MEAL: "Что подать на ужин",
  DRINKS: "Что будете пить — можно отметить несколько",
  MUSIC: "Какую песню поставить для вас?",
};

const singletonTaken = (type: RsvpQuestionType) =>
  `${type === "MEAL" ? "Меню" : type === "DRINKS" ? "Бар" : "Вопрос о песне"} в анкете уже есть`;

export type AddResult = { ok: true; question: RsvpQuestion } | { ok: false; message: string };

export async function addRsvpQuestion(ctx: EventContext, type: string): Promise<AddResult> {
  if (!isRsvpQuestionType(type)) return { ok: false, message: "Неизвестный тип поля" };
  if (SINGLETON.has(type) && (await db.rsvpQuestion.count({ where: { eventId: ctx.eventId, type } })) > 0) {
    return { ok: false, message: singletonTaken(type) };
  }
  const last = await db.rsvpQuestion.findFirst({ where: { eventId: ctx.eventId }, orderBy: { order: "desc" }, select: { order: true } });
  try {
    const row = await db.rsvpQuestion.create({
      data: {
        orgId: ctx.orgId, eventId: ctx.eventId, order: (last?.order ?? -1) + 1, type,
        title: DEFAULT_TITLE[type],
        options: WITH_OPTIONS.has(type) ? ["Вариант 1", "Вариант 2"] : [],
      },
      select,
    });
    return { ok: true, question: view(row) };
  } catch (error) {
    // P2002: между проверкой и вставкой меню, бар или песню успели добавить с
    // другой вкладки — держит уникальный индекс, а мы говорим по-человечески.
    if ((error as { code?: string }).code === "P2002") {
      return { ok: false, message: singletonTaken(type) };
    }
    throw error;
  }
}

export type QuestionPatch = Partial<Pick<RsvpQuestion, "title" | "description" | "required" | "options" | "type">>;

export async function updateRsvpQuestion(ctx: EventContext, id: string, patch: QuestionPatch): Promise<RsvpQuestion | null> {
  const current = await db.rsvpQuestion.findFirst({ where: { id, eventId: ctx.eventId }, select });
  if (!current) return null;
  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title.trim().slice(0, 200) || "Без названия";
  if (patch.description !== undefined) data.description = patch.description.trim().slice(0, 500);
  if (patch.required !== undefined) data.required = patch.required;
  if (patch.options !== undefined) data.options = cleanOptions(patch.options).slice(0, MAX_OPTIONS);
  // Меню и бар в обычный вопрос не превращаются и наоборот: у них другие
  // варианты и другое место хранения ответов.
  if (patch.type !== undefined && isRsvpQuestionType(patch.type) && !SINGLETON.has(patch.type) && !SINGLETON.has(current.type as RsvpQuestionType)) {
    data.type = patch.type;
    if (WITH_OPTIONS.has(patch.type) && cleanOptions(current.options).length === 0 && patch.options === undefined) data.options = ["Вариант 1", "Вариант 2"];
  }
  const row = await db.rsvpQuestion.update({ where: { eventId_id: { eventId: ctx.eventId, id } }, data, select });
  return view(row);
}

export async function deleteRsvpQuestion(ctx: EventContext, id: string): Promise<void> {
  await db.rsvpQuestion.deleteMany({ where: { id, eventId: ctx.eventId } });
}

/** Новый порядок полей целиком — так перетаскивание не зависит от старых номеров. */
export async function reorderRsvpQuestions(ctx: EventContext, ids: string[]): Promise<void> {
  const rows = await db.rsvpQuestion.findMany({ where: { eventId: ctx.eventId }, select: { id: true } });
  const known = new Set(rows.map((row) => row.id));
  const ordered = [...ids.filter((id) => known.has(id)), ...rows.map((row) => row.id).filter((id) => !ids.includes(id))];
  await db.$transaction(
    ordered.map((id, order) => db.rsvpQuestion.update({ where: { eventId_id: { eventId: ctx.eventId, id } }, data: { order } })),
  );
}
