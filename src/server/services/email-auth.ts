/**
 * Регистрация по почте и паролю, подтверждение почты и сброс пароля.
 *
 * Правила, на которых всё держится:
 *   — без подтверждённой почты вход по паролю закрыт. Иначе любой мог бы
 *     занять чужой адрес раньше хозяина, а когда тот войдёт через Google,
 *     кабинеты склеятся и у постороннего останется рабочий пароль (на этот
 *     случай Google-вход ещё и стирает неподтверждённый пароль);
 *   — сайт никогда не говорит, есть ли кабинет с таким адресом: ответ всегда
 *     «письмо отправлено», а что именно в письме — решает сервер (ссылка
 *     подтверждения, «кабинет уже есть» или сброс пароля);
 *   — ссылки из писем одноразовые, в базе хранится только их SHA-256, новая
 *     ссылка гасит прежние того же назначения.
 */
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { createAccount } from "@/server/services/signup";
import { sendEmail } from "@/server/email/send";
import { alreadyRegistered, resetPassword, verifyEmail } from "@/server/email/templates";

const HOUR = 60 * 60 * 1000;
export const VERIFY_TTL_MS = 24 * HOUR;
export const RESET_TTL_MS = HOUR;
export const PASSWORD_MIN = 8;

type Purpose = "VERIFY" | "RESET";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Коды ошибок форм: в адрес страницы уходит код, а не текст — его не подделать. */
export const AUTH_MESSAGES = {
  name: "Напишите, как к вам обращаться.",
  email: "Проверьте адрес почты.",
  password_short: `Пароль — не короче ${PASSWORD_MIN} символов.`,
  password_long: "Слишком длинный пароль.",
  password_weak: "Этот пароль слишком простой — его подбирают первым.",
  password_mismatch: "Пароли не совпадают.",
  link: "Ссылка устарела или уже использована — запросите новую.",
  rate: "Слишком много попыток — подождите несколько минут.",
} as const;
export type AuthCode = keyof typeof AUTH_MESSAGES;

export function emailProblem(email: string): AuthCode | null {
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "email";
  return null;
}

export function passwordProblem(password: string): AuthCode | null {
  if (password.length < PASSWORD_MIN) return "password_short";
  if (password.length > 200) return "password_long";
  if (/^(.)\1+$/.test(password) || /^(12345678|123456789|1234567890|password|qwertyui|qwerty123|йцукенгш)$/i.test(password)) return "password_weak";
  return null;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function link(path: string, token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

/** Новая ссылка; прежние неиспользованные того же назначения гаснут. */
export async function issueToken(userId: string, email: string, purpose: Purpose, ttlMs: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.emailToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    db.emailToken.create({ data: { userId, email, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) } }),
  ]);
  return token;
}

/**
 * Погасить ссылку. Возвращает пользователя, если ссылка живая, не
 * использована и выдана на его нынешний адрес. Гашение атомарное: два
 * одновременных нажатия не пройдут оба.
 */
export async function consumeToken(token: string, purpose: Purpose): Promise<{ id: string; email: string } | null> {
  if (!token || token.length > 200) return null;
  const row = await db.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, purpose: true, email: true, expiresAt: true, usedAt: true, user: { select: { id: true, email: true, blockedAt: true } } },
  });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) return null;
  if (row.user.blockedAt || row.user.email.toLowerCase() !== row.email.toLowerCase()) return null;
  const { count } = await db.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return count === 1 ? { id: row.user.id, email: row.user.email } : null;
}

export type RegisterResult = { ok: true } | { ok: false; code: AuthCode };

export async function registerWithEmail(input: { name: string; email: string; password: string }): Promise<RegisterResult> {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  const email = normalizeEmail(input.email);
  if (name.length < 2) return { ok: false, code: "name" };
  const problem = emailProblem(email) ?? passwordProblem(input.password);
  if (problem) return { ok: false, code: problem };

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, blockedAt: true, accounts: { select: { id: true }, take: 1 } },
  });

  if (existing) {
    if (existing.blockedAt) return { ok: true };
    // Кабинет уже настоящий (почта подтверждена или есть вход через Google):
    // пароль не трогаем, хозяину — письмо «вы уже с нами» со ссылкой сброса.
    if (existing.emailVerified || existing.accounts.length) {
      const reset = await issueToken(existing.id, email, "RESET", RESET_TTL_MS);
      await sendEmail(alreadyRegistered(email, `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")}/login`, link("/reset", reset)));
      return { ok: true };
    }
    // Неподтверждённая регистрация — недействительна, её можно перезаписать:
    // войти ею всё равно нельзя, а хозяин почты подтвердит уже свою.
    await db.user.update({ where: { id: existing.id }, data: { name, passwordHash: await hashPassword(input.password) } });
    await db.session.deleteMany({ where: { userId: existing.id } });
    const token = await issueToken(existing.id, email, "VERIFY", VERIFY_TTL_MS);
    await sendEmail(verifyEmail(email, name, link("/verify-email", token)));
    return { ok: true };
  }

  let userId: string;
  try {
    userId = await createAccount({ name, email, passwordHash: await hashPassword(input.password), emailVerified: false });
  } catch (error) {
    // Две регистрации одного адреса одновременно — вторая просто опоздала.
    if ((error as { code?: string }).code === "P2002") return { ok: true };
    throw error;
  }
  const token = await issueToken(userId, email, "VERIFY", VERIFY_TTL_MS);
  await sendEmail(verifyEmail(email, name, link("/verify-email", token)));
  return { ok: true };
}

/** Прислать письмо подтверждения ещё раз — только неподтверждённым. */
export async function resendVerification(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerified: true, passwordHash: true, blockedAt: true } });
  if (!user || user.emailVerified || !user.passwordHash || user.blockedAt) return;
  const token = await issueToken(user.id, email, "VERIFY", VERIFY_TTL_MS);
  await sendEmail(verifyEmail(email, user.name, link("/verify-email", token)));
}

/** Ссылка из письма подтверждения. Возвращает id пользователя для входа. */
export async function confirmEmail(token: string): Promise<string | null> {
  const user = await consumeToken(token, "VERIFY");
  if (!user) return null;
  const before = await db.user.update({ where: { id: user.id }, data: { emailVerified: true }, select: { name: true, email: true } });
  const { notifySignup } = await import("@/server/notify/events");
  notifySignup(before.email, `${before.name} (по почте)`);
  return user.id;
}

/** «Забыли пароль?» — письмо со ссылкой, если кабинет есть. Ответ сайта всегда одинаковый. */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (emailProblem(email)) return;
  const user = await db.user.findUnique({ where: { email }, select: { id: true, blockedAt: true } });
  if (!user || user.blockedAt) return;
  const token = await issueToken(user.id, email, "RESET", RESET_TTL_MS);
  await sendEmail(resetPassword(email, link("/reset", token)));
}

export type ResetResult = { ok: true; userId: string } | { ok: false; code: AuthCode };

/**
 * Новый пароль по ссылке. Ссылка пришла на почту — значит, почта
 * подтверждена; все прежние сессии гаснут (вдруг пароль меняют потому,
 * что кабинет увели).
 */
export async function resetPasswordWithToken(token: string, password: string): Promise<ResetResult> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, code: problem };
  const user = await consumeToken(token, "RESET");
  if (!user) return { ok: false, code: "link" };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), emailVerified: true } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.emailToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
  return { ok: true, userId: user.id };
}
