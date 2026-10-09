/**
 * Регистрация по почте и паролю, подтверждение почты и сброс пароля.
 *
 * Правила, на которых всё держится:
 *   — без подтверждённой почты вход по паролю закрыт. Иначе любой мог бы
 *     занять чужой адрес раньше хозяина, а когда тот войдёт через Google,
 *     кабинеты склеятся и у постороннего останется рабочий пароль (на этот
 *     случай Google-вход ещё и стирает неподтверждённый пароль);
 *   — сайт никогда не говорит, есть ли кабинет с таким адресом: ответ всегда
 *     «письмо отправлено», а что именно в письме — решает сервер (код
 *     подтверждения, «кабинет уже есть» или сброс пароля);
 *   — почта подтверждается 6-значным кодом из письма: 15 минут и 5 попыток,
 *     потом код сгорает. В письме нет ни ссылок, ни кнопок — такие письма
 *     почтовики реже уносят в спам, а код удобно ввести с телефона;
 *   — коды и ссылки сброса одноразовые, в базе только их SHA-256, новый гасит
 *     прежние того же назначения.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { createAccount } from "@/server/services/signup";
import { sendEmail } from "@/server/email/send";
import { alreadyRegistered, resetPassword, verifyCode } from "@/server/email/templates";
import type { Lang } from "@/lib/i18n";

const HOUR = 60 * 60 * 1000;
export const CODE_TTL_MS = 15 * 60 * 1000;
export const CODE_ATTEMPTS = 5;
export const RESET_TTL_MS = HOUR;
export const PASSWORD_MIN = 8;

type Purpose = "VERIFY" | "RESET";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Коды ошибок форм: в адрес страницы уходит код, а не текст — его не подделать. */
export const AUTH_MESSAGES = {
  email: "Проверьте адрес почты.",
  password_short: `Пароль — не короче ${PASSWORD_MIN} символов.`,
  password_long: "Слишком длинный пароль.",
  password_weak: "Этот пароль слишком простой — его подбирают первым.",
  password_mismatch: "Пароли не совпадают.",
  link: "Ссылка устарела или уже использована — запросите новую.",
  rate: "Слишком много попыток — подождите несколько минут.",
  code_wrong: "Код не подходит — проверьте цифры из письма.",
  code_expired: "Код устарел — мы пришлём новый.",
  code_attempts: "Слишком много неверных попыток — запросите новый код.",
} as const;
export type AuthCode = keyof typeof AUTH_MESSAGES;

/** Те же коды по-английски — для страниц входа на английском. */
export const AUTH_MESSAGES_EN: Record<AuthCode, string> = {
  email: "Please check your email address.",
  password_short: `Your password must be at least ${PASSWORD_MIN} characters.`,
  password_long: "That password is too long.",
  password_weak: "This password is too common — it’s one of the first attackers try.",
  password_mismatch: "The passwords don’t match.",
  link: "This link has expired or was already used — please request a new one.",
  rate: "Too many attempts — please wait a few minutes.",
  code_wrong: "That code is incorrect — double-check the digits in the email.",
  code_expired: "The code has expired — we’ll send you a new one.",
  code_attempts: "Too many wrong attempts — please request a new code.",
};

/** Текст ошибки по коду на нужном языке. */
export function authMessage(code: string, lang: Lang): string | null {
  if (!(code in AUTH_MESSAGES)) return null;
  return lang === "en" ? AUTH_MESSAGES_EN[code as AuthCode] : AUTH_MESSAGES[code as AuthCode];
}

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

/** Имя в кабинете из адреса: anna.petrova@… → «Anna Petrova». Поменять можно в настройках. */
export function nameFromEmail(email: string, lang: Lang = "ru"): string {
  const local = email.split("@")[0] ?? "";
  const words = local.split(/[._+-]+/).filter((word) => /[a-zа-яё]/i.test(word)).slice(0, 3);
  const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ").slice(0, 80);
  return name.length >= 2 ? name : lang === "en" ? "Organizer" : "Организатор";
}

const codeHash = (id: string, code: string) => createHash("sha256").update(`${id}:${code}`).digest("hex");

/** Новый код подтверждения; прежние неиспользованные гаснут. */
export async function issueCode(userId: string, email: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Хеш привязан к id записи: одинаковые коды у разных людей дают разные хеши.
  const id = randomBytes(16).toString("base64url");
  await db.$transaction([
    db.emailToken.updateMany({ where: { userId, purpose: "VERIFY", usedAt: null }, data: { usedAt: new Date() } }),
    db.emailToken.create({ data: { id, userId, email, purpose: "VERIFY", tokenHash: codeHash(id, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } }),
  ]);
  return code;
}

export type CodeResult = { ok: true; userId: string } | { ok: false; code: "code_wrong" | "code_expired" | "code_attempts"; left?: number };

/**
 * Код из письма. Неверный ввод тратит попытку (атомарно — параллельный
 * перебор не получит лишних); после пятой код сгорает.
 */
export async function confirmEmailCode(rawEmail: string, rawCode: string): Promise<CodeResult> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true, blockedAt: true } });
  if (!user || user.blockedAt || user.emailVerified) return { ok: false, code: "code_wrong" };
  const row = await db.emailToken.findFirst({
    where: { userId: user.id, purpose: "VERIFY", usedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, tokenHash: true, expiresAt: true, attempts: true },
  });
  if (!row || row.email.toLowerCase() !== email) return { ok: false, code: "code_expired" };
  if (row.expiresAt < new Date()) return { ok: false, code: "code_expired" };
  if (row.attempts >= CODE_ATTEMPTS) return { ok: false, code: "code_attempts" };

  const expected = Buffer.from(row.tokenHash, "hex");
  const actual = Buffer.from(codeHash(row.id, code), "hex");
  if (code.length !== 6 || !timingSafeEqual(expected, actual)) {
    const { count } = await db.emailToken.updateMany({
      where: { id: row.id, usedAt: null, attempts: { lt: CODE_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    const left = CODE_ATTEMPTS - row.attempts - 1;
    if (!count || left <= 0) return { ok: false, code: "code_attempts" };
    return { ok: false, code: "code_wrong", left };
  }

  const { count } = await db.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (count !== 1) return { ok: false, code: "code_expired" };
  const confirmed = await db.user.update({ where: { id: user.id }, data: { emailVerified: true }, select: { email: true } });
  const { notifySignup } = await import("@/server/notify/events");
  notifySignup(confirmed.email, "регистрация по почте");
  return { ok: true, userId: user.id };
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

export async function registerWithEmail(input: { email: string; password: string; lang?: Lang }): Promise<RegisterResult> {
  const lang = input.lang ?? "ru";
  const email = normalizeEmail(input.email);
  const name = nameFromEmail(email, lang);
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
      await sendEmail(alreadyRegistered(email, `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")}/login${lang === "en" ? "?lang=en" : ""}`, link("/reset", reset), lang));
      return { ok: true };
    }
    // Неподтверждённая регистрация — недействительна, её можно перезаписать:
    // войти ею всё равно нельзя, а хозяин почты подтвердит уже свою.
    await db.user.update({ where: { id: existing.id }, data: { name, passwordHash: await hashPassword(input.password) } });
    await db.session.deleteMany({ where: { userId: existing.id } });
    await sendEmail(verifyCode(email, await issueCode(existing.id, email), lang));
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
  await sendEmail(verifyCode(email, await issueCode(userId, email), lang));
  return { ok: true };
}

/** Прислать код ещё раз — только неподтверждённым. */
export async function resendVerification(rawEmail: string, lang: Lang = "ru"): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true, passwordHash: true, blockedAt: true } });
  if (!user || user.emailVerified || !user.passwordHash || user.blockedAt) return;
  await sendEmail(verifyCode(email, await issueCode(user.id, email), lang));
}

/** «Забыли пароль?» — письмо со ссылкой, если кабинет есть. Ответ сайта всегда одинаковый. */
export async function requestPasswordReset(rawEmail: string, lang: Lang = "ru"): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (emailProblem(email)) return;
  const user = await db.user.findUnique({ where: { email }, select: { id: true, blockedAt: true } });
  if (!user || user.blockedAt) return;
  const token = await issueToken(user.id, email, "RESET", RESET_TTL_MS);
  await sendEmail(resetPassword(email, link("/reset", token) + (lang === "en" ? "&lang=en" : ""), lang));
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
