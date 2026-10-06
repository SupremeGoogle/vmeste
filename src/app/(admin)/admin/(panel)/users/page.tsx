import Link from "next/link";
import { requireAdmin } from "@/server/admin/access";
import { isOwnerEmail } from "@/server/admin/config";
import { listUsers } from "@/server/admin/stats";

export const dynamic = "force-dynamic";

const PAGE = 50;
const ROLE = { ADMIN: "Админ", SUPPORT: "Поддержка" } as const;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const { q = "", page = "1" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const users = await listUsers(q, PAGE + 1, (current - 1) * PAGE);
  const more = users.length > PAGE;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Пользователи</h1>
          <p className="mt-1 text-sm text-stone-500">Организаторы и все, кто заводил кабинет.</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Почта или имя" className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Найти</button>
        </form>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
            <tr>
              <th className="px-4 py-3 font-normal">Пользователь</th>
              <th className="px-4 py-3 font-normal">Вход</th>
              <th className="px-4 py-3 font-normal">Мероприятия</th>
              <th className="px-4 py-3 font-normal">Гости</th>
              <th className="px-4 py-3 font-normal">Был</th>
              <th className="px-4 py-3 font-normal">Создан</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.slice(0, PAGE).map((user) => (
              <tr key={user.id} className={user.blockedAt ? "bg-rose-50/60" : ""}>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">{user.name}</Link>
                  <div className="text-xs text-stone-500">{user.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {isOwnerEmail(user.email) && <Badge tone="amber">Владелец</Badge>}
                    {user.platformRole && <Badge tone="amber">{ROLE[user.platformRole]}</Badge>}
                    {user.blockedAt && <Badge tone="rose">Заблокирован</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">{user.google ? "Google" : "Пароль"}{user.emailVerified ? "" : " · почта не подтверждена"}</td>
                <td className="px-4 py-3">{user.events}</td>
                <td className="px-4 py-3">{user.guests}</td>
                <td className="px-4 py-3 text-xs text-stone-600">{user.lastSeen ? user.lastSeen.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }) : "—"}</td>
                <td className="px-4 py-3 text-xs text-stone-600">{user.createdAt.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">Никого не нашли</td></tr>}
          </tbody>
        </table>
      </div>

      <Pager page={current} more={more} q={q} />
    </div>
  );
}

function Badge({ tone, children }: { tone: "amber" | "rose"; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone === "amber" ? "bg-amber-50 text-amber-900" : "bg-rose-100 text-rose-800"}`}>{children}</span>;
}

function Pager({ page, more, q }: { page: number; more: boolean; q: string }) {
  const href = (target: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(target) })}`;
  return (
    <div className="flex justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="underline underline-offset-2">← Назад</Link> : <span />}
      {more && <Link href={href(page + 1)} className="underline underline-offset-2">Дальше →</Link>}
    </div>
  );
}
