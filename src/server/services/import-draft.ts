/**
 * Черновик импорта гостей — то, что показывается в предпросмотре.
 *
 * Живёт в памяти процесса, а не в базе: это данные на две минуты между
 * «выбрал файл» и «нажал импортировать». Таблица ради них — лишняя
 * миграция и лишняя уборка; потеря черновика при перезапуске означает
 * ровно одно — организатор выберет файл заново.
 *
 * Черновик привязан к мероприятию: чужой идентификатор ничего не откроет,
 * даже если его подсмотрели в адресной строке.
 */
import { randomUUID } from "node:crypto";
import type { EventContext } from "@/server/context";
import type { ParseResult } from "@/server/services/csv-import";

type Draft = ParseResult & { eventId: string; createdAt: number };

/** Пятнадцать минут: дольше живого предпросмотра не бывает. */
const TTL_MS = 15 * 60_000;
/** Потолок на процесс: защита от «загружу двести файлов и уйду». */
const MAX_DRAFTS = 50;

const globalForDrafts = globalThis as unknown as { importDrafts?: Map<string, Draft> };
const drafts: Map<string, Draft> = (globalForDrafts.importDrafts ??= new Map());

function sweep() {
  const now = Date.now();
  for (const [id, draft] of drafts) {
    if (now - draft.createdAt > TTL_MS) drafts.delete(id);
  }
  while (drafts.size > MAX_DRAFTS) {
    const oldest = drafts.keys().next().value;
    if (oldest === undefined) break;
    drafts.delete(oldest);
  }
}

export async function saveImportDraft(ctx: EventContext, parsed: ParseResult): Promise<string> {
  sweep();
  const id = randomUUID();
  drafts.set(id, { ...parsed, eventId: ctx.eventId, createdAt: Date.now() });
  return id;
}

/** Посмотреть, не расходуя: страница предпросмотра перерисовывается. */
export function peekImportDraft(ctx: EventContext, id: string): ParseResult | null {
  sweep();
  const draft = drafts.get(id);
  if (!draft || draft.eventId !== ctx.eventId) return null;
  return draft;
}

/** Забрать и удалить: импорт и отмена одинаково закрывают черновик. */
export function takeImportDraft(ctx: EventContext, id: string): ParseResult | null {
  const draft = peekImportDraft(ctx, id);
  if (draft) drafts.delete(id);
  return draft;
}
