/**
 * Подписка, выданная вручную: пока действует, свадьбы пользователя
 * открываются без оплаты. Это прямые деньги, поэтому замков больше, чем
 * у остальных действий панели:
 *
 *  1. Только владелец платформы (OWNER): почта из SUPERADMIN_EMAILS,
 *     пришедшая от Google, и открытая панель (2FA). Выданные роли ADMIN
 *     и SUPPORT подписку не выдают, даже самим себе.
 *  2. Свежий код 2FA на каждую выдачу и отмену — украденной cookie
 *     открытой панели мало. Код проверяется тем же механизмом с
 *     блокировкой после пяти ошибок (admin/access.ts).
 *  3. Нельзя себе, владельцу, администраторам, заблокированным, кабинетам
 *     без регистрации и с неподтверждённой почтой — правило `guard`
 *     из admin/operations.ts плюс проверки здесь.
 *  4. Не дольше 12 месяцев за раз; продление — новой выдачей с новым кодом.
 *  5. Каждая выдача и отмена — запись в журнале и сразу сообщение
 *     владельцу в Telegram: если это сделал не он, он узнает сразу.
 *  6. ADMIN_GRANTS_DISABLED=1 на сервере выключает выдачу совсем.
 */
import { db } from "@/server/db";
import { audit } from "@/server/admin/audit";
import { isOwnerEmail } from "@/server/admin/config";
import { platformRole, verifySecondFactor, type AdminIdentity } from "@/server/admin/access";
import { notifyOwner } from "@/server/notify/telegram";
import { requestOrigin } from "@/server/auth/session";
import { unlockEventsBySubscription } from "@/server/billing";

export type GrantResult = { ok: true; message: string } | { ok: false; message: string };

export const GRANT_MONTHS = [1, 3, 6, 12] as const;

async function checkTarget(admin: AdminIdentity, userId: string): Promise<string | null> {
  if (process.env.ADMIN_GRANTS_DISABLED === "1") return "Выдача подписок выключена на сервере.";
  if (admin.role !== "OWNER" || !isOwnerEmail(admin.email)) return "Подписку выдаёт только владелец платформы.";
  if (userId === admin.userId) return "Себе подписку выдать нельзя.";
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true, isAnonymous: true, blockedAt: true, platformRole: true },
  });
  if (!user) return "Пользователь не найден.";
  if (user.isAnonymous) return "Кабинет без регистрации — подписку выдают только зарегистрированным.";
  if (!user.emailVerified) return "Почта пользователя не подтверждена.";
  if (user.blockedAt) return "Пользователь заблокирован.";
  if (isOwnerEmail(user.email) || user.platformRole || (await platformRole(user))) {
    return "Администраторам подписка не выдаётся.";
  }
  return null;
}

async function freshCode(admin: AdminIdentity, code: string): Promise<string | null> {
  if (!/^[0-9A-Za-z-]{6,20}$/.test(code.trim())) return "Введите код из приложения 2FA.";
  const checked = await verifySecondFactor(admin, code);
  return checked.ok ? null : checked.message;
}

export async function grantSubscription(admin: AdminIdentity, userId: string, months: number, code: string, reason: string): Promise<GrantResult> {
  if (!GRANT_MONTHS.includes(months as (typeof GRANT_MONTHS)[number])) return { ok: false, message: "Неверный срок." };
  const problem = await checkTarget(admin, userId);
  if (problem) return { ok: false, message: problem };
  const codeProblem = await freshCode(admin, code);
  if (codeProblem) return { ok: false, message: codeProblem };

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, subscriptionUntil: true } });
  // Продление — от конца текущей подписки, но не дальше 12 месяцев от сегодня.
  const now = new Date();
  const from = user.subscriptionUntil && user.subscriptionUntil > now ? user.subscriptionUntil : now;
  const until = new Date(from);
  until.setMonth(until.getMonth() + months);
  const cap = new Date(now);
  cap.setMonth(cap.getMonth() + 12);
  const finalUntil = until > cap ? cap : until;

  await db.user.update({ where: { id: userId }, data: { subscriptionUntil: finalUntil } });
  const unlocked = await unlockEventsBySubscription(userId);
  const clean = reason.trim().slice(0, 200);
  const day = finalUntil.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
  await audit({
    actor: { id: admin.userId, email: admin.email }, action: "user.subscription_grant", targetType: "user", targetId: userId,
    detail: { email: user.email, months, until: finalUntil.toISOString(), reason: clean, unlocked },
  });
  const { ip } = await requestOrigin();
  void notifyOwner(`Выдана подписка до ${day}: ${user.email} (${months} мес.)${clean ? ` — «${clean}»` : ""}. Выдал ${admin.email}, IP ${ip ?? "?"}. Если это не вы — сразу смените пароль Google и сбросьте сессии.`, "alert").catch(() => false);
  return { ok: true, message: `Подписка до ${day}.${unlocked ? ` Открыто свадеб: ${unlocked}.` : ""}` };
}

export async function revokeSubscription(admin: AdminIdentity, userId: string, code: string): Promise<GrantResult> {
  const problem = await checkTarget(admin, userId);
  if (problem) return { ok: false, message: problem };
  const codeProblem = await freshCode(admin, code);
  if (codeProblem) return { ok: false, message: codeProblem };
  const user = await db.user.update({ where: { id: userId }, data: { subscriptionUntil: null }, select: { email: true } });
  await audit({ actor: { id: admin.userId, email: admin.email }, action: "user.subscription_revoke", targetType: "user", targetId: userId, detail: { email: user.email } });
  void notifyOwner(`Подписка снята: ${user.email}. Снял ${admin.email}.`, "info").catch(() => false);
  // Уже открытые свадьбы остаются открытыми: гости по ним уже получили ссылки.
  return { ok: true, message: "Подписка снята. Уже открытые свадьбы продолжают работать." };
}
