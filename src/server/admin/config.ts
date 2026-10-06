/**
 * Настройки панели суперадмина.
 *
 * Владелец платформы — почта из SUPERADMIN_EMAILS (через запятую). Почта
 * в коде, а не в базе, нарочно: права владельца нельзя выдать себе, даже
 * получив доступ к базе или к чужой учётке с ролью ADMIN.
 *
 * ADMIN_SECRET — ключ, которым шифруется секрет второго фактора. Без него
 * панель не открывается: хранить секреты TOTP открытым текстом нельзя.
 */
import { createHash } from "node:crypto";

const DEFAULT_OWNERS = "akbarchik0071@gmail.com";

export function ownerEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? DEFAULT_OWNERS)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  return ownerEmails().includes(email.trim().toLowerCase());
}

/**
 * Чьи свадьбы не попадают под сроки хранения (архив через 10 дней, фото —
 * через 15): владельцы платформы и учётки из RETENTION_EXEMPT_EMAILS
 * (через запятую; пока это рабочая учётка суперадмина 1@1). Свадьба
 * считается «его», если он владелец (OWNER) её организации.
 */
export function retentionExemptEmails(): string[] {
  const extra = (process.env.RETENTION_EXEMPT_EMAILS ?? "1@1").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...ownerEmails(), ...extra])];
}

/** Ключ шифрования секретов 2FA. `null` — панель не настроена. */
export function adminKey(): Buffer | null {
  const secret = process.env.ADMIN_SECRET ?? "";
  if (secret.length < 32) return null;
  return createHash("sha256").update(`vmeste-admin\n${secret}`).digest();
}

/** Сколько живёт вход в панель после кода из приложения. */
export const ADMIN_ELEVATION_HOURS = 8;

/** Сколько неверных кодов подряд до временной блокировки. */
export const ADMIN_MAX_FAILURES = 5;

/** На сколько блокируется ввод кода после стольких ошибок. */
export const ADMIN_LOCK_MINUTES = 15;
