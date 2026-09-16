/**
 * Черновик импорта гостей — то, что показывается в предпросмотре.
 *
 * Живёт в памяти процесса, а не в базе: это данные на несколько минут
 * между «выбрал файл» и «добавить гостей». Таблица ради них — лишняя
 * миграция и лишняя уборка; потеря черновика при перезапуске означает
 * ровно одно — организатор выберет файл заново.
 *
 * Черновик привязан к мероприятию: чужой идентификатор ничего не откроет,
 * даже если его подсмотрели в адресной строке.
 */
import { randomUUID } from "node:crypto";
import type { EventContext } from "@/server/context";
import type { ImportWorkspace } from "@/server/import/analyze";

type Draft = { workspace: ImportWorkspace; eventId: string; createdAt: number };

/** Полчаса: предпросмотр большого списка правят не спеша. */
const TTL_MS = 30 * 60_000;
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

export function saveImportDraft(ctx: EventContext, workspace: ImportWorkspace): string {
  sweep();
  const id = randomUUID();
  drafts.set(id, { workspace, eventId: ctx.eventId, createdAt: Date.now() });
  return id;
}

/** Посмотреть, не расходуя: страница предпросмотра перерисовывается. */
export function peekImportDraft(ctx: EventContext, id: string): ImportWorkspace | null {
  sweep();
  const draft = drafts.get(id);
  if (!draft || draft.eventId !== ctx.eventId) return null;
  return draft.workspace;
}

/** Заменить разбор после смены ролей столбцов; срок жизни продлевается. */
export function replaceImportDraft(ctx: EventContext, id: string, workspace: ImportWorkspace): boolean {
  const draft = drafts.get(id);
  if (!draft || draft.eventId !== ctx.eventId) return false;
  drafts.set(id, { ...draft, workspace, createdAt: Date.now() });
  return true;
}

/** Забрать и удалить: импорт и отмена одинаково закрывают черновик.
 *  Повторное нажатие «Добавить» получит null и ничего не создаст. */
export function takeImportDraft(ctx: EventContext, id: string): ImportWorkspace | null {
  const draft = peekImportDraft(ctx, id);
  if (draft) drafts.delete(id);
  return draft;
}
