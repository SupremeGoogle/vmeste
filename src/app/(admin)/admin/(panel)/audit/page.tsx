import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin/access";
import { AUDIT_LABELS } from "@/server/admin/audit";

export const dynamic = "force-dynamic";

const PAGE = 100;
const ALARM = new Set(["admin.login_failed", "admin.locked", "user.delete", "user.role", "admin.2fa_reset"]);

export default async function AdminAuditLog({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const { page = "1" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const rows = await db.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: PAGE + 1, skip: (current - 1) * PAGE });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Журнал</h1>
        <p className="mt-1 text-sm text-stone-500">Каждое действие в панели и каждая попытка входа. Записи не правятся и не удаляются.</p>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
            <tr>
              <th className="px-4 py-3 font-normal">Когда (МСК)</th>
              <th className="px-4 py-3 font-normal">Кто</th>
              <th className="px-4 py-3 font-normal">Что</th>
              <th className="px-4 py-3 font-normal">Подробности</th>
              <th className="px-4 py-3 font-normal">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.slice(0, PAGE).map((row) => (
              <tr key={row.id} className={ALARM.has(row.action) ? "bg-rose-50/60" : ""}>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-stone-600">{row.createdAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</td>
                <td className="px-4 py-2.5 text-xs">{row.actorEmail}</td>
                <td className="px-4 py-2.5">
                  {AUDIT_LABELS[row.action] ?? row.action}
                  {row.targetType === "user" && row.targetId && <> · <Link href={`/admin/users/${row.targetId}`} className="text-xs underline underline-offset-2">пользователь</Link></>}
                </td>
                <td className="max-w-80 truncate px-4 py-2.5 text-xs text-stone-600" title={JSON.stringify(row.detail)}>{Object.entries((row.detail ?? {}) as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</td>
                <td className="px-4 py-2.5 text-xs text-stone-500">{row.ip ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-stone-500">Журнал пуст</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm">
        {current > 1 ? <Link href={`?page=${current - 1}`} className="underline underline-offset-2">← Новее</Link> : <span />}
        {rows.length > PAGE && <Link href={`?page=${current + 1}`} className="underline underline-offset-2">Старее →</Link>}
      </div>
    </div>
  );
}
