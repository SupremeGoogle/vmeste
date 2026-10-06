/**
 * Действия панели суперадмина над пользователями и мероприятиями.
 *
 * Кто что может:
 *  — SUPPORT только смотрит;
 *  — ADMIN блокирует, сбрасывает сессии, входит под пользователем и
 *    меняет статус мероприятий — но только у обычных пользователей;
 *  — OWNER вдобавок выдаёт и снимает права, удаляет и сбрасывает 2FA.
 * Владельца не может тронуть никто, администраторов — только владелец.
 * Каждое действие — строка в журнале.
 */
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { cookieSecure } from "@/server/auth/cookies";
import { audit } from "@/server/admin/audit";
import { atLeast, platformRole, type AdminIdentity, type AdminRole } from "@/server/admin/access";
import { isOwnerEmail } from "@/server/admin/config";
import { notifyOwner } from "@/server/notify/telegram";

export type OpResult = { ok: true; message?: string } | { ok: false; message: string };

/** Cookie с сессией администратора на время «войти как». */
export const RETURN_COOKIE = "vmeste_admin_return";
const IMPERSONATION_MS = 60 * 60_000;

async function targetUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true, platformRole: true, blockedAt: true },
  });
}

/** Можно ли этому администратору трогать этого пользователя. */
async function canManage(admin: AdminIdentity, user: NonNullable<Awaited<ReturnType<typeof targetUser>>>): Promise<string | null> {
  if (user.id === admin.userId) return "С собственной учётной записью так нельзя.";
  if (isOwnerEmail(user.email)) return "Владельца платформы изменить нельзя.";
  const role = await platformRole(user);
  if ((role || user.platformRole) && admin.role !== "OWNER") return "Администраторов меняет только владелец.";
  return null;
}

async function guard(admin: AdminIdentity, min: AdminRole, userId: string) {
  if (!atLeast(admin.role, min)) return { error: "Недостаточно прав." } as const;
  const user = await targetUser(userId);
  if (!user) return { error: "Пользователь не найден." } as const;
  const problem = await canManage(admin, user);
  return problem ? ({ error: problem } as const) : ({ user } as const);
}

const actor = (admin: AdminIdentity) => ({ id: admin.userId, email: admin.email });

export async function blockUser(admin: AdminIdentity, userId: string, reason: string): Promise<OpResult> {
  const checked = await guard(admin, "ADMIN", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  const clean = reason.trim().slice(0, 300) || "Без причины";
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { blockedAt: new Date(), blockedReason: clean } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  await audit({ actor: actor(admin), action: "user.block", targetType: "user", targetId: userId, detail: { email: checked.user.email, reason: clean } });
  return { ok: true, message: "Пользователь заблокирован, все его сессии закрыты." };
}

export async function unblockUser(admin: AdminIdentity, userId: string): Promise<OpResult> {
  const checked = await guard(admin, "ADMIN", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  await db.user.update({ where: { id: userId }, data: { blockedAt: null, blockedReason: null } });
  await audit({ actor: actor(admin), action: "user.unblock", targetType: "user", targetId: userId, detail: { email: checked.user.email } });
  return { ok: true, message: "Пользователь разблокирован." };
}

export async function revokeSessions(admin: AdminIdentity, userId: string): Promise<OpResult> {
  const checked = await guard(admin, "ADMIN", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  const { count } = await db.session.deleteMany({ where: { userId } });
  await audit({ actor: actor(admin), action: "user.sessions_revoked", targetType: "user", targetId: userId, detail: { email: checked.user.email, count } });
  return { ok: true, message: `Закрыто сессий: ${count}.` };
}

export async function setPlatformRole(admin: AdminIdentity, userId: string, role: "ADMIN" | "SUPPORT" | null): Promise<OpResult> {
  const checked = await guard(admin, "OWNER", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  if (role) {
    const google = await db.oAuthAccount.findFirst({ where: { userId, provider: "GOOGLE" }, select: { id: true } });
    if (!google || !checked.user.emailVerified) return { ok: false, message: "Права выдаются только учётке, вошедшей через Google." };
  }
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { platformRole: role } }),
    // Снятые права — закрыть и открытую панель.
    ...(role ? [] : [db.session.updateMany({ where: { userId }, data: { adminUntil: null } })]),
  ]);
  await audit({ actor: actor(admin), action: "user.role", targetType: "user", targetId: userId, detail: { email: checked.user.email, role: role ?? "нет" } });
  void notifyOwner(`Права на платформе: ${checked.user.email} → ${role ?? "сняты"}`, "warning");
  return { ok: true, message: role ? `Выданы права ${role}.` : "Права сняты." };
}

/** Сбросить 2FA администратору, потерявшему телефон и резервные коды. */
export async function resetSecondFactor(admin: AdminIdentity, userId: string): Promise<OpResult> {
  const checked = await guard(admin, "OWNER", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  await db.$transaction([
    db.adminSecret.deleteMany({ where: { userId } }),
    db.session.updateMany({ where: { userId }, data: { adminUntil: null } }),
  ]);
  await audit({ actor: actor(admin), action: "admin.2fa_reset", targetType: "user", targetId: userId, detail: { email: checked.user.email } });
  return { ok: true, message: "2FA сброшена — при следующем входе её настроят заново." };
}

/**
 * Удалить пользователя насовсем. Его организации, где он один, уходят
 * вместе со всеми мероприятиями. Подтверждение — точная почта.
 */
export async function deleteUser(admin: AdminIdentity, userId: string, confirmEmail: string): Promise<OpResult> {
  const checked = await guard(admin, "OWNER", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  if (confirmEmail.trim().toLowerCase() !== checked.user.email.toLowerCase()) {
    return { ok: false, message: "Почта для подтверждения не совпала." };
  }
  const memberships = await db.membership.findMany({ where: { userId }, select: { orgId: true } });
  const solo: string[] = [];
  for (const { orgId } of memberships) {
    if ((await db.membership.count({ where: { orgId } })) === 1) solo.push(orgId);
  }
  const events = solo.length ? await db.event.count({ where: { orgId: { in: solo } } }) : 0;
  await db.$transaction([
    db.organization.deleteMany({ where: { id: { in: solo } } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  await audit({ actor: actor(admin), action: "user.delete", targetType: "user", targetId: userId, detail: { email: checked.user.email, organizations: solo.length, events } });
  void notifyOwner(`Удалён пользователь ${checked.user.email} (мероприятий: ${events})`, "warning");
  return { ok: true, message: `Удалён. Вместе с ним — организаций: ${solo.length}, мероприятий: ${events}.` };
}

/**
 * «Войти как пользователь» — посмотреть кабинет его глазами (поддержка).
 * Своя сессия администратора откладывается в отдельную cookie, новая
 * сессия живёт час и помечена, кто в ней сидит; панель в ней закрыта.
 */
export async function impersonate(admin: AdminIdentity, userId: string): Promise<OpResult> {
  const checked = await guard(admin, "ADMIN", userId);
  if ("error" in checked) return { ok: false, message: checked.error! };
  if (checked.user.blockedAt) return { ok: false, message: "Пользователь заблокирован." };
  const jar = await cookies();
  jar.set(RETURN_COOKIE, admin.sessionId, {
    httpOnly: true, sameSite: "lax", secure: cookieSecure(), path: "/", maxAge: IMPERSONATION_MS / 1000,
  });
  await createSession(userId, { ttlMs: IMPERSONATION_MS, impersonatorId: admin.userId });
  await audit({ actor: actor(admin), action: "user.impersonate", targetType: "user", targetId: userId, detail: { email: checked.user.email } });
  return { ok: true };
}

/** Вернуться из «войти как» в свою сессию. */
export async function endImpersonation(): Promise<boolean> {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  const back = jar.get(RETURN_COOKIE)?.value;
  const session = current ? await db.session.findUnique({ where: { id: current }, select: { impersonatorId: true, userId: true } }) : null;
  if (!session?.impersonatorId) return false;
  await db.session.delete({ where: { id: current! } }).catch(() => {});
  jar.delete(RETURN_COOKIE);
  const own = back ? await db.session.findUnique({ where: { id: back }, select: { userId: true, expiresAt: true } }) : null;
  const admin = await db.user.findUnique({ where: { id: session.impersonatorId }, select: { email: true } });
  await audit({ actor: { id: session.impersonatorId, email: admin?.email ?? "?" }, action: "user.impersonate_end", targetType: "user", targetId: session.userId });
  if (own && own.userId === session.impersonatorId && own.expiresAt.getTime() > Date.now()) {
    jar.set(SESSION_COOKIE, back!, { httpOnly: true, sameSite: "lax", secure: cookieSecure(), path: "/", expires: own.expiresAt });
    return true;
  }
  jar.delete(SESSION_COOKIE);
  return false;
}

export async function setEventStatusAsAdmin(admin: AdminIdentity, eventId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): Promise<OpResult> {
  if (!atLeast(admin.role, "ADMIN")) return { ok: false, message: "Недостаточно прав." };
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true } });
  if (!event) return { ok: false, message: "Мероприятие не найдено." };
  await db.event.update({ where: { id: eventId }, data: { status } });
  await audit({ actor: actor(admin), action: "event.status", targetType: "event", targetId: eventId, detail: { title: event.title, from: event.status, to: status } });
  return { ok: true, message: "Статус изменён." };
}
