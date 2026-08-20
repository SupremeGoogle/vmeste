/**
 * Контекст доступа — единственный источник правды о том, к какому мероприятию
 * относится запрос. Репозитории принимают его первым аргументом и подмешивают
 * orgId/eventId в каждый запрос (PLAN.md §1.2, слой 2).
 */
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import type { OrgRole } from "@/generated/prisma/enums";

export type OrgContext = {
  kind: "org";
  userId: string;
  orgId: string;
  role: OrgRole;
};

export type EventContext = OrgContext & {
  eventId: string;
};

/** Контекст организации по текущей сессии. null, если не залогинен. */
export async function getOrgContext(): Promise<OrgContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  // MVP: у пользователя одна организация. Появится вторая — здесь будет
  // выбор активной из cookie.
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    orderBy: { id: "asc" },
  });
  if (!membership) return null;

  return { kind: "org", userId: user.id, orgId: membership.orgId, role: membership.role };
}

/**
 * Контекст мероприятия. Проверяет, что мероприятие принадлежит организации
 * пользователя. Чужой eventId в URL даёт 404, а не 403: существование чужого
 * мероприятия — тоже утечка.
 */
export async function requireEventContext(eventId: string): Promise<EventContext> {
  const org = await getOrgContext();
  if (!org) notFound();

  const event = await db.event.findFirst({
    where: { id: eventId, orgId: org.orgId },
    select: { id: true },
  });
  if (!event) notFound();

  return { ...org, eventId: event.id };
}
