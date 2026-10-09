"use server";

/**
 * Действия конструктора анкеты RSVP. Каждое возвращает свежее состояние
 * целиком — конструктор просто заменяет им своё, без ручной сверки.
 */
import { revalidatePath } from "next/cache";
import { requireEventContext } from "@/server/context";
import {
  addRsvpQuestion, deleteRsvpQuestion, listRsvpQuestions, reorderRsvpQuestions, updateRsvpQuestion,
  type QuestionPatch,
} from "@/server/repositories/rsvp-questions";
import { addDrinkOption, addMealOption, listDrinkOptions, listMealOptions, toggleDrinkOption, toggleMealOption } from "@/server/repositories/events";
import type { RsvpQuestion } from "@/lib/rsvp-form";
import { getT } from "@/server/i18n";

export type BuilderOption = { id: string; title: string; active: boolean; chosen: number };
export type BuilderState = { questions: RsvpQuestion[]; meals: BuilderOption[]; drinks: BuilderOption[]; error?: string };

export async function loadBuilder(eventId: string): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  const [questions, meals, drinks] = await Promise.all([
    listRsvpQuestions(ctx),
    listMealOptions(ctx, eventId),
    listDrinkOptions(ctx, eventId),
  ]);
  return {
    questions,
    meals: meals.map((meal) => ({ id: meal.id, title: meal.title, active: meal.active, chosen: meal._count.guests })),
    drinks: drinks.map((drink) => ({ id: drink.id, title: drink.title, active: drink.active, chosen: drink._count.choices })),
  };
}

async function done(eventId: string, error?: string): Promise<BuilderState> {
  // Анкету видят и на странице ответа, и в самом приглашении.
  revalidatePath(`/app/e/${eventId}/invite/form`);
  revalidatePath(`/app/e/${eventId}/guests`);
  return { ...(await loadBuilder(eventId)), ...(error ? { error } : {}) };
}

export async function addQuestionAction(eventId: string, type: string): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  const result = await addRsvpQuestion(ctx, type);
  if (result.ok) return done(eventId);
  // Сообщение репозитория — по-русски; для кабинета на английском — своё,
  // по тому же признаку: меню, бар и песня бывают в анкете по одному.
  const t = await getT();
  const en = type === "MEAL" ? "The menu question is already in the form"
    : type === "DRINKS" ? "The bar question is already in the form"
    : type === "MUSIC" ? "The song question is already in the form"
    : "Unknown field type";
  return done(eventId, t(result.message, en));
}

export async function updateQuestionAction(eventId: string, id: string, patch: QuestionPatch): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  await updateRsvpQuestion(ctx, id, patch);
  return done(eventId);
}

export async function deleteQuestionAction(eventId: string, id: string): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  await deleteRsvpQuestion(ctx, id);
  return done(eventId);
}

export async function reorderQuestionsAction(eventId: string, ids: string[]): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  await reorderRsvpQuestions(ctx, ids);
  return done(eventId);
}

export async function addChoiceAction(eventId: string, kind: "meal" | "drink", title: string): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  if (kind === "meal") await addMealOption(ctx, eventId, title);
  else await addDrinkOption(ctx, eventId, title);
  return done(eventId);
}

export async function toggleChoiceAction(eventId: string, kind: "meal" | "drink", id: string): Promise<BuilderState> {
  const ctx = await requireEventContext(eventId);
  if (kind === "meal") await toggleMealOption(ctx, eventId, id);
  else await toggleDrinkOption(ctx, eventId, id);
  return done(eventId);
}
