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

export type SessionUser = {
  id: string;
  name: string;
  email: string;
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
    include: { user: { select: { id: true, name: true, email: true, blockedAt: true } } },
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
  return { id: session.user.id, name: session.user.name, email: session.user.email, impersonatedBy };
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
