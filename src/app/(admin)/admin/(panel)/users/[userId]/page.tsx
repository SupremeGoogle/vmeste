/** Карточка пользователя: кто он, что у него есть и что с ним можно сделать. */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { atLeast, platformRole, requireAdmin } from "@/server/admin/access";
import { isOwnerEmail } from "@/server/admin/config";
import { listEvents } from "@/server/admin/stats";
import { blockUser, deleteUser, impersonate, openEventAsOrganizer, resetSecondFactor, revokeSessions, setPlatformRole, unblockUser, type OpResult } from "@/server/admin/operations";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function AdminUser({ params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();
  const { userId } = await params;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, createdAt: true, emailVerified: true, platformRole: true, blockedAt: true, blockedReason: true,
      accounts: { select: { provider: true, email: true, lastLogin: true } },
      sessions: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, createdAt: true, expiresAt: true, ip: true, userAgent: true, impersonatorId: true, adminUntil: true } },
      memberships: { select: { role: true, organization: { select: { id: true, name: true } } } },
      adminSecret: { select: { confirmedAt: true } },
    },
  });
  if (!user) notFound();
  const [events, role, audit] = await Promise.all([
    listEvents("", 50, 0, user.id),
    platformRole(user),
    db.adminAudit.findMany({ where: { OR: [{ targetId: user.id }, { actorId: user.id }] }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const owner = isOwnerEmail(user.email) && role === "OWNER";
  const self = user.id === admin.userId;
  const isAdmin = Boolean(role || user.platformRole);
  // Кого этот администратор может трогать (то же правило — на сервере).
  const manageable = !self && !owner && (!isAdmin || admin.role === "OWNER");

  // Действия — серверные; права проверяются заново внутри каждого.
  async function act(input: { action: string; reason?: string; role?: string; confirm?: string }): Promise<OpResult> {
    "use server";
    const current = await requireAdmin();
    switch (input.action) {
      case "block": return blockUser(current, userId, input.reason ?? "");
      case "unblock": return unblockUser(current, userId);
      case "revoke": return revokeSessions(current, userId);
      case "role": return setPlatformRole(current, userId, input.role === "ADMIN" || input.role === "SUPPORT" ? input.role : null);
      case "reset2fa": return resetSecondFactor(current, userId);
      case "delete": {
        const result = await deleteUser(current, userId, input.confirm ?? "");
        if (result.ok) redirect("/admin/users");
        return result;
      }
      case "impersonate": {
        const result = await impersonate(current, userId);
        if (result.ok) redirect("/app");
        return result;
      }
      default: return { ok: false, message: "Неизвестное действие." };
    }
  }

  async function open(form: FormData) {
    "use server";
    const current = await requireAdmin("ADMIN");
    const result = await openEventAsOrganizer(current, String(form.get("eventId")));
    if (result.ok && result.href) redirect(result.href);
  }
  const canOpen = atLeast(admin.role, "ADMIN") && !user.blockedAt;

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-900">← Все пользователи</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{user.name}</h1>
          <p className="mt-1 text-sm text-stone-600">{user.email}</p>
          <p className="mt-1 text-xs text-stone-500">
            С {user.createdAt.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })} ·{" "}
            {user.accounts.some((account) => account.provider === "GOOGLE") ? "вход через Google" : "вход по паролю"} ·{" "}
            {user.emailVerified ? "почта подтверждена" : "почта не подтверждена"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {owner && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900">Владелец платформы</span>}
          {user.platformRole && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900">{user.platformRole === "ADMIN" ? "Администратор" : "Поддержка"}</span>}
          {isAdmin && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">2FA {user.adminSecret?.confirmedAt ? "включена" : "не настроена"}</span>}
          {user.blockedAt && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs text-rose-800">Заблокирован: {user.blockedReason}</span>}
        </div>
      </header>

      {manageable && atLeast(admin.role, "ADMIN") ? (
        <UserActions
          act={act}
          email={user.email}
          blocked={Boolean(user.blockedAt)}
          role={user.platformRole}
          isOwnerViewer={admin.role === "OWNER"}
          hasSecondFactor={Boolean(user.adminSecret?.confirmedAt)}
        />
      ) : (
        <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
          {self ? "Это ваша учётная запись — её настройки в разделе «Безопасность»." : owner ? "Владельца платформы изменить нельзя." : isAdmin ? "Администраторов меняет только владелец." : "Режим просмотра: действия недоступны."}
        </p>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Мероприятия ({events.length})</h2>
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{event.title} <span className="text-stone-500">· /i/{event.slug} · {event.status === "PUBLISHED" ? "опубликовано" : event.status === "DRAFT" ? "черновик" : "в архиве"}</span></span>
              <span className="flex items-center gap-3 text-xs text-stone-500">
                {event.guests} гостей · {event.accepted} придут · {event.photos} фото
                {canOpen ? (
                  <form action={open}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <button className="rounded-lg bg-stone-900 px-2.5 py-1 text-white">Открыть</button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
          {events.length === 0 && <li className="py-2 text-stone-500">Мероприятий нет</li>}
        </ul>
        <p className="mt-3 text-xs text-stone-500">Организации: {user.memberships.map((member) => `${member.organization.name} (${member.role})`).join(", ") || "—"}</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Сессии</h2>
        <ul className="mt-3 divide-y divide-stone-100 text-xs">
          {user.sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="min-w-0 truncate text-stone-700">{session.userAgent ?? "неизвестный браузер"}</span>
              <span className="text-stone-500">
                {session.ip ?? "—"} · с {session.createdAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
                {session.impersonatorId ? " · вход администратора" : ""}{session.adminUntil && session.adminUntil > new Date() ? " · панель открыта" : ""}
              </span>
            </li>
          ))}
          {user.sessions.length === 0 && <li className="py-2 text-stone-500">Активных сессий нет</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Журнал по пользователю</h2>
        <ul className="mt-3 divide-y divide-stone-100 text-xs">
          {audit.map((row) => (
            <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{row.action} · {row.actorEmail}</span>
              <span className="text-stone-500">{row.createdAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</span>
            </li>
          ))}
          {audit.length === 0 && <li className="py-2 text-stone-500">Записей нет</li>}
        </ul>
      </section>
    </div>
  );
}
