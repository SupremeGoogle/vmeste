/** Своя безопасность: 2FA, резервные коды, открытые панели, выход. */
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { backupCodesLeft, leaveAdmin, regenerateBackupCodes, requireAdmin } from "@/server/admin/access";
import { ADMIN_ELEVATION_HOURS, ADMIN_LOCK_MINUTES, ADMIN_MAX_FAILURES, ownerEmails } from "@/server/admin/config";
import { telegramConfigured } from "@/server/notify/telegram";
import { BackupCodes } from "./backup-codes";

export const dynamic = "force-dynamic";

export default async function AdminSecurity() {
  const admin = await requireAdmin();
  const [left, sessions, admins] = await Promise.all([
    backupCodesLeft(admin.userId),
    db.session.findMany({ where: { userId: admin.userId, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, ip: true, userAgent: true, adminUntil: true } }),
    db.user.findMany({ where: { OR: [{ platformRole: { not: null } }, { email: { in: ownerEmails() } }] }, select: { id: true, email: true, platformRole: true, adminSecret: { select: { confirmedAt: true } } } }),
  ]);

  async function regenerate(): Promise<string[]> {
    "use server";
    const current = await requireAdmin();
    return regenerateBackupCodes(current);
  }

  async function leave() {
    "use server";
    const current = await requireAdmin();
    await leaveAdmin(current);
    redirect("/app");
  }

  async function closeOthers() {
    "use server";
    const current = await requireAdmin();
    await db.session.deleteMany({ where: { userId: current.userId, id: { not: current.sessionId } } });
    redirect("/admin/security");
  }

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Безопасность</h1>
        <p className="mt-1 text-sm text-stone-500">Как защищена панель и что можно сделать, если что-то пошло не так.</p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-700">
        <h2 className="font-medium text-stone-900">Защита входа</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Только учётка Google с подтверждённой почтой; владелец — {ownerEmails().join(", ")}.</li>
          <li>Второй фактор — код из приложения или одноразовый резервный код.</li>
          <li>{ADMIN_MAX_FAILURES} неверных кодов подряд — ввод закрыт на {ADMIN_LOCK_MINUTES} минут{telegramConfigured() ? ", вам приходит уведомление" : ""}.</li>
          <li>Панель открывается на {ADMIN_ELEVATION_HOURS} часов и только в этой сессии; для всех остальных её адреса не существует (404).</li>
          <li>Каждое действие и каждая попытка входа — в журнале.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Резервные коды</h2>
        <p className="mt-1 text-sm text-stone-600">Осталось: {left} из 10. {left <= 3 ? "Пора выпустить новые." : ""}</p>
        <BackupCodes regenerate={regenerate} />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Мои сессии</h2>
          <form action={closeOthers}><button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs">Закрыть все, кроме этой</button></form>
        </div>
        <ul className="mt-3 divide-y divide-stone-100 text-xs">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="min-w-0 truncate">{session.id === admin.sessionId ? "Эта сессия · " : ""}{session.userAgent ?? "неизвестный браузер"}</span>
              <span className="text-stone-500">{session.ip ?? "—"} · {session.createdAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}{session.adminUntil && session.adminUntil > new Date() ? " · панель открыта" : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Кто имеет доступ к панели</h2>
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {admins.map((user) => (
            <li key={user.id} className="flex justify-between gap-2 py-2">
              <span>{user.email}</span>
              <span className="text-xs text-stone-500">{user.platformRole ?? "владелец"} · 2FA {user.adminSecret?.confirmedAt ? "включена" : "не настроена"}</span>
            </li>
          ))}
        </ul>
      </section>

      <form action={leave}><button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Закрыть панель</button></form>
    </div>
  );
}
