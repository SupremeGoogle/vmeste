"use server";

/**
 * Серверные действия раздела «Гости».
 *
 * Каждое действие заново получает контекст мероприятия по eventId из
 * формы: действие — это публичная точка входа, и то, что форма пришла
 * со «своей» страницы, ничего не доказывает.
 *
 * Все формы работают и без JS: действие принимает FormData и в конце
 * перерисовывает страницу или переходит на неё с нужным параметром.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireEventContext } from "@/server/context";
import {
  archiveGuest, createGuest, createGuests, existingGuestNames, restoreGuest, setPlusOneAllowed, undoImport,
} from "@/server/repositories/guests";
import { peekImportDraft, replaceImportDraft, takeImportDraft } from "@/server/services/import-draft";
import { rebuildImport } from "@/server/import/analyze";
import { COLUMN_ROLES, type ColumnRole } from "@/server/import/structure";
import { IMPORT_LIMITS } from "@/server/import/limits";

const str = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const guestsPath = (eventId: string) => `/app/e/${eventId}/guests`;

// ─── Гость вручную ──────────────────────────────────────────────

export type AddGuestState = { ok: boolean; message: string; at: number } | null;

export async function addGuestAction(_prev: AddGuestState, form: FormData): Promise<AddGuestState> {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  const displayName = str(form, "displayName").replace(/\s+/g, " ").slice(0, 120);
  if (displayName.length < 2) return { ok: false, message: "Имя — хотя бы две буквы", at: Date.now() };
  const phone = str(form, "phone").slice(0, 40) || null;
  await createGuest(ctx, { displayName, phone, plusOneAllowed: form.get("plusOneAllowed") === "on" });
  revalidatePath(guestsPath(eventId));
  return { ok: true, message: `${displayName} в списке`, at: Date.now() };
}

export async function togglePlusOneAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  await setPlusOneAllowed(ctx, str(form, "guestId"), form.get("allowed") === "1");
  revalidatePath(guestsPath(eventId));
}

export async function archiveGuestAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  await archiveGuest(ctx, str(form, "guestId"));
  revalidatePath(guestsPath(eventId));
}

export async function restoreGuestAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  await restoreGuest(ctx, str(form, "guestId"));
  revalidatePath(guestsPath(eventId));
}

/** Массовые действия над выбранными гостями. */
export async function bulkGuestsAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  const ids = form.getAll("guestId").map(String).slice(0, 2000);
  const action = str(form, "bulk");
  for (const id of ids) {
    if (action === "plus-one-on") await setPlusOneAllowed(ctx, id, true);
    else if (action === "plus-one-off") await setPlusOneAllowed(ctx, id, false);
    else if (action === "archive") await archiveGuest(ctx, id);
  }
  revalidatePath(guestsPath(eventId));
}

// ─── Импорт ─────────────────────────────────────────────────────

/** Смена листа или ролей столбцов: пересобираем гостей без ИИ. */
export async function remapImportAction(form: FormData) {
  const eventId = str(form, "eventId");
  const draftId = str(form, "draftId");
  const ctx = await requireEventContext(eventId);
  const workspace = peekImportDraft(ctx, draftId);
  if (!workspace) redirect(`${guestsPath(eventId)}?importError=${encodeURIComponent("Черновик устарел — загрузите файл снова.")}`);

  const sheetRaw = form.get("sheetIndex");
  const sheetIndex = sheetRaw === null ? undefined : Number(sheetRaw);
  const sheetChanged = sheetIndex !== undefined && Number.isInteger(sheetIndex) && sheetIndex !== workspace.plan.sheetIndex;

  const columns = workspace.plan.columns.map((col) => {
    const role = str(form, `role.${col.index}`) as ColumnRole;
    return { ...col, role: COLUMN_ROLES.includes(role) ? role : col.role };
  });

  const next = rebuildImport(
    workspace,
    sheetChanged ? { sheetIndex } : { columns },
    await existingGuestNames(ctx),
  );
  replaceImportDraft(ctx, draftId, next);
  redirect(`${guestsPath(eventId)}?draft=${draftId}`);
}

const editSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).nullable(),
  email: z.string().trim().max(120).nullable(),
  note: z.string().trim().max(500).nullable(),
  plusOneAllowed: z.boolean(),
  plusOneName: z.string().trim().max(120).nullable(),
});

/**
 * Запись импорта.
 *
 * Браузер присылает правки, но не список людей: гости берутся из черновика
 * на сервере по ключам строк, и лишнего человека подсунуть нельзя.
 */
export async function confirmImportAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  const draftId = str(form, "draftId");
  const workspace = takeImportDraft(ctx, draftId);
  if (!workspace) {
    redirect(`${guestsPath(eventId)}?importError=${encodeURIComponent("Этот импорт уже выполнен или черновик устарел.")}`);
  }

  const orNull = (value: string) => value || null;
  const rows = [];
  for (const guest of workspace.guests) {
    const prefix = `g.${guest.key}.`;
    // Без поля строки в форме — оставляем решение по умолчанию.
    const present = form.has(`${prefix}name`);
    const include = present ? form.get(`${prefix}include`) === "on" : guest.include;
    if (!include) continue;
    const parsed = editSchema.safeParse({
      displayName: present ? str(form, `${prefix}name`) : guest.displayName,
      phone: present ? orNull(str(form, `${prefix}phone`)) : guest.phone,
      email: guest.email,
      note: present ? orNull(str(form, `${prefix}note`)) : guest.note,
      plusOneAllowed: present ? form.get(`${prefix}plusOne`) === "on" : guest.plusOneAllowed,
      plusOneName: present ? orNull(str(form, `${prefix}plusOneName`)) : guest.plusOneName,
    });
    if (!parsed.success) continue;
    rows.push({ ...parsed.data, plusOneAllowed: parsed.data.plusOneAllowed || Boolean(parsed.data.plusOneName) });
  }

  if (rows.length === 0) redirect(guestsPath(eventId));
  const batchId = randomUUID();
  await createGuests(ctx, rows.slice(0, IMPORT_LIMITS.guests), batchId);
  revalidatePath(guestsPath(eventId));
  redirect(`${guestsPath(eventId)}?imported=${batchId}`);
}

export async function cancelImportAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  takeImportDraft(ctx, str(form, "draftId"));
  redirect(guestsPath(eventId));
}

export async function undoImportAction(form: FormData) {
  const eventId = str(form, "eventId");
  const ctx = await requireEventContext(eventId);
  const result = await undoImport(ctx, str(form, "batchId"));
  revalidatePath(guestsPath(eventId));
  const message = result.expired
    ? "Отменить уже нельзя: прошло больше 15 минут."
    : result.kept > 0
      ? `Убрали ${result.archived}. ${result.kept} оставили — они уже открыли ссылку, ответили или сидят за столом.`
      : `Импорт отменён: убрали ${result.archived}.`;
  redirect(`${guestsPath(eventId)}?notice=${encodeURIComponent(message)}`);
}
