/**
 * Кто может войти в панель суперадмина и как.
 *
 * Три замка подряд:
 *  1. **Учётка Google с подтверждённой почтой.** Владелец — почта из
 *     SUPERADMIN_EMAILS, но только если она пришла от Google: пароль к
 *     любому адресу у нас может завести кто угодно. Выданные роли
 *     (ADMIN, SUPPORT) — тоже только для учёток, привязанных к Google.
 *  2. **Второй фактор** — код из приложения (TOTP) или резервный код.
 *     Пять ошибок — ввод закрыт на 15 минут, владельцу уходит уведомление.
 *  3. **Вход в панель живёт 8 часов** и привязан к сессии: выход, сброс
 *     сессий или блокировка закрывают и панель.
 *
 * Для всех, кто не администратор, панели не существует — 404, а не
 * «доступ запрещён»: незачем подсказывать, что за адресом что-то есть.
 */
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { SESSION_COOKIE } from "@/server/auth/session";
import { notifyOwner } from "@/server/notify/telegram";
import { audit } from "@/server/admin/audit";
import {
  ADMIN_ELEVATION_HOURS, ADMIN_LOCK_MINUTES, ADMIN_MAX_FAILURES, adminKey, isOwnerEmail,
} from "@/server/admin/config";
import {
  hashBackupCode, newBackupCodes, newTotpSecret, openSecret, otpauthUrl, sealSecret, verifyTotp,
} from "@/server/admin/totp";

export type AdminRole = "OWNER" | "ADMIN" | "SUPPORT";

const RANK: Record<AdminRole, number> = { SUPPORT: 1, ADMIN: 2, OWNER: 3 };

export function atLeast(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min];
}

export type AdminIdentity = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  sessionId: string;
  /** Код 2FA введён, панель открыта до `elevatedUntil`. */
  elevated: boolean;
  elevatedUntil: Date | null;
  /** 2FA уже настроена (иначе — сначала настройка). */
  secondFactorReady: boolean;
};

/** Роль на платформе. Без привязанного Google — никакой. */
export async function platformRole(user: {
  id: string; email: string; emailVerified: boolean; platformRole: "ADMIN" | "SUPPORT" | null; blockedAt: Date | null;
}): Promise<AdminRole | null> {
  if (user.blockedAt || !user.emailVerified) return null;
  const google = await db.oAuthAccount.findFirst({ where: { userId: user.id, provider: "GOOGLE" }, select: { email: true } });
  if (!google) return null;
  if (isOwnerEmail(user.email) && isOwnerEmail(google.email)) return "OWNER";
  return user.platformRole ?? null;
}

/** Текущий администратор или null. Сессия «войти как» администратором не считается. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await db.session.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, email: true, name: true, emailVerified: true, platformRole: true, blockedAt: true,
          adminSecret: { select: { confirmedAt: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt.getTime() < Date.now() || session.impersonatorId) return null;
  const role = await platformRole(session.user);
  if (!role) return null;
  const elevated = Boolean(session.adminUntil && session.adminUntil.getTime() > Date.now());
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role,
    sessionId: session.id,
    elevated,
    elevatedUntil: elevated ? session.adminUntil : null,
    secondFactorReady: Boolean(session.user.adminSecret?.confirmedAt),
  };
}

/**
 * Страница или действие панели. Не администратор — 404; не ввёл код —
 * на страницу кода; роль ниже нужной — 404.
 */
export async function requireAdmin(min: AdminRole = "SUPPORT"): Promise<AdminIdentity> {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  if (!adminKey()) redirect("/admin/verify");
  if (!admin.elevated) redirect("/admin/verify");
  if (!atLeast(admin.role, min)) notFound();
  return admin;
}

async function elevate(admin: AdminIdentity): Promise<void> {
  await db.session.update({
    where: { id: admin.sessionId },
    data: { adminUntil: new Date(Date.now() + ADMIN_ELEVATION_HOURS * 3600_000) },
  });
}

export type SetupInfo = { secret: string; url: string };

/** Начать настройку 2FA: новый секрет (старый неподтверждённый заменяется). */
export async function beginSetup(admin: AdminIdentity): Promise<SetupInfo | { error: string }> {
  const key = adminKey();
  if (!key) return { error: "На сервере не задан ADMIN_SECRET — без него 2FA не включить." };
  const existing = await db.adminSecret.findUnique({ where: { userId: admin.userId } });
  if (existing?.confirmedAt) return { error: "2FA уже включена." };
  // Неподтверждённый секрет переживает перезагрузку страницы, а не
  // меняется на каждый показ — иначе отсканированный QR тут же устаревал бы.
  const opened = existing ? openSecret(existing.totpSecret, key) : null;
  const secret = opened ?? newTotpSecret();
  if (!opened) {
    await db.adminSecret.upsert({
      where: { userId: admin.userId },
      create: { userId: admin.userId, totpSecret: sealSecret(secret, key) },
      update: { totpSecret: sealSecret(secret, key), lastStep: 0, failedCount: 0, lockedUntil: null },
    });
  }
  return { secret, url: otpauthUrl(secret, admin.email) };
}

export type VerifyResult =
  | { ok: true; backupCodes?: string[] }
  | { ok: false; message: string };

/**
 * Проверить код: при настройке — подтвердить её, иначе — войти в панель.
 * Принимает и резервный код (каждый — один раз).
 */
export async function verifySecondFactor(admin: AdminIdentity, code: string): Promise<VerifyResult> {
  const key = adminKey();
  if (!key) return { ok: false, message: "На сервере не задан ADMIN_SECRET." };
  const record = await db.adminSecret.findUnique({ where: { userId: admin.userId } });
  if (!record) return { ok: false, message: "Сначала настройте 2FA." };
  if (record.lockedUntil && record.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60_000);
    return { ok: false, message: `Слишком много ошибок. Попробуйте через ${minutes} мин.` };
  }
  const secret = openSecret(record.totpSecret, key);
  if (!secret) return { ok: false, message: "Секрет 2FA не читается — ADMIN_SECRET сменился? Нужен сброс 2FA." };

  const clean = code.trim();
  const step = verifyTotp(secret, clean, record.lastStep);
  const backupHash = !step && record.confirmedAt ? hashBackupCode(clean) : null;
  const backupIndex = backupHash ? record.backupCodes.indexOf(backupHash) : -1;

  if (!step && backupIndex < 0) {
    const failed = record.failedCount + 1;
    const lock = failed >= ADMIN_MAX_FAILURES;
    await db.adminSecret.update({
      where: { userId: admin.userId },
      data: lock
        ? { failedCount: 0, lockedUntil: new Date(Date.now() + ADMIN_LOCK_MINUTES * 60_000) }
        : { failedCount: failed },
    });
    await audit({ actor: { id: admin.userId, email: admin.email }, action: lock ? "admin.locked" : "admin.login_failed", detail: { attempt: failed } });
    if (lock) void notifyOwner(`Панель суперадмина: ${ADMIN_MAX_FAILURES} неверных кодов подряд для ${admin.email}. Ввод закрыт на ${ADMIN_LOCK_MINUTES} мин.`, "alert");
    return { ok: false, message: lock ? `Неверный код. Ввод закрыт на ${ADMIN_LOCK_MINUTES} минут.` : "Неверный код." };
  }

  const confirming = !record.confirmedAt;
  const fresh = confirming ? newBackupCodes() : undefined;
  await db.adminSecret.update({
    where: { userId: admin.userId },
    data: {
      failedCount: 0,
      lockedUntil: null,
      ...(step ? { lastStep: step } : {}),
      ...(backupIndex >= 0 ? { backupCodes: record.backupCodes.filter((_, index) => index !== backupIndex) } : {}),
      ...(confirming ? { confirmedAt: new Date(), backupCodes: fresh!.map(hashBackupCode) } : {}),
    },
  });
  await elevate(admin);
  await audit({
    actor: { id: admin.userId, email: admin.email },
    action: confirming ? "admin.2fa_setup" : "admin.login",
    detail: backupIndex >= 0 ? { via: "backup", left: record.backupCodes.length - 1 } : { via: "totp" },
  });
  void notifyOwner(`Вход в панель суперадмина: ${admin.email}${backupIndex >= 0 ? " (резервным кодом)" : ""}`, backupIndex >= 0 ? "warning" : "info");
  return { ok: true, backupCodes: fresh };
}

/** Новые резервные коды взамен старых (нужен открытый вход в панель). */
export async function regenerateBackupCodes(admin: AdminIdentity): Promise<string[]> {
  const codes = newBackupCodes();
  await db.adminSecret.update({ where: { userId: admin.userId }, data: { backupCodes: codes.map(hashBackupCode) } });
  await audit({ actor: { id: admin.userId, email: admin.email }, action: "admin.backup_regenerated" });
  return codes;
}

/** Закрыть панель в этой сессии (сама сессия в кабинете остаётся). */
export async function leaveAdmin(admin: AdminIdentity): Promise<void> {
  await db.session.update({ where: { id: admin.sessionId }, data: { adminUntil: null } });
  await audit({ actor: { id: admin.userId, email: admin.email }, action: "admin.logout" });
}

/** Сколько осталось резервных кодов. */
export async function backupCodesLeft(userId: string): Promise<number> {
  const record = await db.adminSecret.findUnique({ where: { userId }, select: { backupCodes: true } });
  return record?.backupCodes.length ?? 0;
}
