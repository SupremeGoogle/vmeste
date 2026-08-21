/**
 * Сессия организатора: строка в БД + идентификатор в HttpOnly-cookie.
 *
 * Почему не JWT: сессию нужно уметь погасить (увольнение помощника, чужой
 * ноутбук), а в MVP запрос к БД всё равно происходит на каждой странице панели.
 */
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { cookieSecure } from "@/server/auth/cookies";

const COOKIE = "vmeste_session";
const TTL_DAYS = 30;

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  const session = await db.session.create({
    data: { id: randomBytes(24).toString("base64url"), userId, expiresAt },
  });

  const jar = await cookies();
  jar.set(COOKIE, session.id, {
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
};

/** Текущий пользователь или null. Никогда не бросает — вызывается в layout. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const session = await db.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.delete({ where: { id } }).catch(() => {});
  jar.delete(COOKIE);
}
