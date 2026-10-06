/**
 * Журнал панели суперадмина. Пишется на каждое действие и каждую попытку
 * входа — удачную и нет. Из интерфейса не правится и не удаляется.
 */
import { db } from "@/server/db";
import { requestOrigin } from "@/server/auth/session";

export async function audit(entry: {
  actor: { id: string | null; email: string };
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const { ip } = await requestOrigin();
  await db.adminAudit.create({
    data: {
      actorId: entry.actor.id,
      actorEmail: entry.actor.email,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      detail: (entry.detail ?? {}) as object,
      ip,
    },
  });
}

/** Человеческие названия действий для журнала. */
export const AUDIT_LABELS: Record<string, string> = {
  "admin.login": "Вход в панель",
  "admin.login_failed": "Неверный код 2FA",
  "admin.locked": "Ввод кода заблокирован",
  "admin.2fa_setup": "Включена 2FA",
  "admin.2fa_reset": "Сброшена 2FA",
  "admin.backup_regenerated": "Новые резервные коды",
  "admin.logout": "Выход из панели",
  "user.block": "Заблокирован пользователь",
  "user.unblock": "Разблокирован пользователь",
  "user.sessions_revoked": "Сброшены сессии",
  "user.role": "Изменены права",
  "user.delete": "Удалён пользователь",
  "user.impersonate": "Вход под пользователем",
  "user.impersonate_end": "Возврат из-под пользователя",
  "event.status": "Изменён статус мероприятия",
};
