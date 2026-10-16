/**
 * Сессия организатора: строка в БД + идентификатор в HttpOnly-cookie.
 *
 * Почему не JWT: сессию нужно уметь погасить (увольнение помощника, чужой
 * ноутбук, блокировка из панели суперадмина), а в MVP запрос к БД всё
 * равно происходит на каждой странице панели.
 */
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import { cookieSecure } from "@/server/auth/cookies";

export const SESSION_COOKIE = "vmeste_session";
const TTL_DAYS = 30;

/** Откуда пришёл запрос — для списка сессий и журнала. */
export async function requestOrigin(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const list = await headers();
    const ip = list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip")?.trim() || null;
    return { ip, userAgent: list.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function createSession(
  userId: string,
  opts: { ttlMs?: number; impersonatorId?: string } = {},
): Promise<string> {
  const expiresAt = new Date(Date.now() + (opts.ttlMs ?? TTL_DAYS * 86_400_000));
  const origin = await requestOrigin();
  // Вход поверх кабинета без регистрации: свадьба, сделанная до входа,
  // переезжает в настоящий кабинет. Сбой переноса вход не ломает —
  // человек войдёт, а черновик останется в анонимной строке до уборки.
  if (!opts.impersonatorId) await adoptCurrentGuestWorkspace(userId);
  const session = await db.session.create({
    data: {
      id: randomBytes(24).toString("base64url"), userId, expiresAt,
      ip: origin.ip, userAgent: origin.userAgent, impersonatorId: opts.impersonatorId ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });

  return session.id;
}

/** Кабинет без регистрации, открытый в этом браузере, — в кабинет `userId`. */
async function adoptCurrentGuestWorkspace(userId: string): Promise<void> {
  const current = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!current) return;
  const session = await db.session.findUnique({
    where: { id: current },
    select: { userId: true, expiresAt: true, user: { select: { isAnonymous: true } } },
  });
  if (!session?.user.isAnonymous || session.userId === userId || session.expiresAt.getTime() < Date.now()) return;
  try {
    const { adoptGuestWorkspace } = await import("@/server/services/guest-workspace");
    await adoptGuestWorkspace(session.userId, userId);
  } catch (error) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error);
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  /** Кабинет без регистрации (services/guest-workspace.ts). */
  isAnonymous: boolean;
  /** Сессия «войти как»: кто из администраторов смотрит глазами пользователя. */
  impersonatedBy?: { id: string; email: string } | null;
};

/** Текущий пользователь или null. Никогда не бросает — вызывается в layout. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const session = await db.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, blockedAt: true, isAnonymous: true } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  // Заблокирован из панели суперадмина — сессия больше не действует.
  if (session.user.blockedAt) {
    await db.session.deleteMany({ where: { userId: session.user.id } }).catch(() => {});
    return null;
  }

  const impersonatedBy = session.impersonatorId
    ? await db.user.findUnique({ where: { id: session.impersonatorId }, select: { id: true, email: true } })
    : null;
  return { id: session.user.id, name: session.user.name, email: session.user.email, isAnonymous: session.user.isAnonymous, impersonatedBy };
}

/** Идентификатор текущей сессии — чтобы не закрыть самому себе дверь,
 *  выходя из всех остальных. */
export async function currentSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await db.session.delete({ where: { id } }).catch(() => {});
  jar.delete(SESSION_COOKIE);
}

/**
 * Куда вернуть человека после входа или регистрации. Ставится, когда
 * кабинет без регистрации упёрся в публикацию: зарегистрировался — и
 * сразу на оплату той же свадьбы. Только адреса кабинета: чужой адрес
 * из cookie превратил бы вход в открытый редирект.
 */
const NEXT_COOKIE = "vm_after_auth";

export function safeAppPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 200) return null;
  if (!/^\/app(\/[A-Za-z0-9_\-/]*)?(\?[A-Za-z0-9_\-=&]*)?$/.test(raw) || raw.includes("//")) return null;
  return raw;
}

/** Только в server action или route handler. */
export async function rememberAfterAuth(path: string): Promise<void> {
  const safe = safeAppPath(path);
  if (!safe) return;
  (await cookies()).set(NEXT_COOKIE, safe, {
    httpOnly: true, sameSite: "lax", secure: cookieSecure(), path: "/", maxAge: 3600,
  });
}

/** Адрес после входа (и забыть его). По умолчанию — кабинет. */
export async function takeAfterAuth(): Promise<string> {
  const jar = await cookies();
  const saved = safeAppPath(jar.get(NEXT_COOKIE)?.value);
  if (jar.has(NEXT_COOKIE)) jar.delete(NEXT_COOKIE);
  return saved ?? "/app";
}
