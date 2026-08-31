/**
 * Организация и её участники.
 *
 * Регистрации в MVP нет намеренно: продукт делается для одного агентства,
 * пользователей заводит сид. Но три вещи всё равно нужны в интерфейсе,
 * иначе за ними придётся лезть в базу: переименовать организацию, увидеть
 * состав и сменить себе пароль.
 *
 * Роли (`OWNER`/`PLANNER`/`STAFF`) в схеме есть, но пока ничего не
 * ограничивают: разграничение прав внутри агентства — отдельная история,
 * и придумывать её до первого запроса «дайте помощнице только рассадку»
 * означает угадывать.
 */
import { db } from "@/server/db";
import type { OrgContext } from "@/server/context";
import { hashPassword, verifyPassword } from "@/server/auth/password";

export async function getOrganization(ctx: OrgContext) {
  return db.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      id: true, name: true, slug: true,
      _count: { select: { events: true } },
    },
  });
}

export async function listMembers(ctx: OrgContext) {
  return db.membership.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { id: "asc" },
    select: {
      id: true, role: true,
      user: {
        select: {
          id: true, name: true, email: true, createdAt: true,
          _count: { select: { sessions: true } },
        },
      },
    },
  });
}

export async function renameOrganization(ctx: OrgContext, name: string) {
  const clean = name.trim().slice(0, 120);
  if (clean.length < 2) return false;

  await db.organization.update({ where: { id: ctx.orgId }, data: { name: clean } });
  return true;
}

export type PasswordChange = "ok" | "wrong" | "weak" | "gone";

/**
 * Смена собственного пароля.
 *
 * Старый пароль спрашивается обязательно: сессия может остаться открытой
 * на чужом ноутбуке в зале, и «сменить пароль одним кликом» превратило бы
 * забытую вкладку в потерю доступа.
 *
 * Все прочие сессии при этом закрываются — ровно затем, ради чего пароль
 * и меняют.
 */
export async function changeOwnPassword(
  ctx: OrgContext,
  currentPassword: string,
  nextPassword: string,
  keepSessionId: string | null,
): Promise<PasswordChange> {
  if (nextPassword.length < 10) return "weak";

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) return "gone";

  // У пришедшего через Google пароля нет, и требовать текущий не с чего.
  // Тогда это не смена, а первое назначение: человек добавляет себе второй
  // способ войти — на случай, если доступ к почте Google потеряется.
  if (user.passwordHash !== null && !(await verifyPassword(currentPassword, user.passwordHash))) {
    return "wrong";
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(nextPassword) },
  });

  await db.session.deleteMany({
    where: { userId: user.id, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
  });

  return "ok";
}

/** Закрыть все сессии, кроме текущей: «я забыл выйти на чужом ноутбуке». */
export async function closeOtherSessions(ctx: OrgContext, keepSessionId: string | null) {
  const deleted = await db.session.deleteMany({
    where: { userId: ctx.userId, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
  });
  return deleted.count;
}
