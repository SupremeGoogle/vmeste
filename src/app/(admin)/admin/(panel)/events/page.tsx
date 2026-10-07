import Link from "next/link";
import { revalidatePath } from "next/cache";
import { atLeast, requireAdmin } from "@/server/admin/access";
import { listEvents } from "@/server/admin/stats";
import { openEventAsOrganizer, setEventStatusAsAdmin } from "@/server/admin/operations";
import { redirect } from "next/navigation";
import { findTemplate } from "@/lib/invite-templates";

export const dynamic = "force-dynamic";

const PAGE = 50;
const STATUS = { DRAFT: "Черновик", PUBLISHED: "Опубликовано", ARCHIVED: "В архиве" } as const;

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const admin = await requireAdmin();
  const { q = "", page = "1" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const events = await listEvents(q, PAGE + 1, (current - 1) * PAGE);
  const canAct = atLeast(admin.role, "ADMIN");

  async function setStatus(form: FormData) {
    "use server";
    const actor = await requireAdmin("ADMIN");
    const status = String(form.get("status"));
    if (status !== "DRAFT" && status !== "PUBLISHED" && status !== "ARCHIVED") return;
    await setEventStatusAsAdmin(actor, String(form.get("eventId")), status);
    revalidatePath("/admin/events");
  }

  // «Открыть» — свадьба глазами организатора, черновики тоже.
  async function open(form: FormData) {
    "use server";
    const actor = await requireAdmin("ADMIN");
    const result = await openEventAsOrganizer(actor, String(form.get("eventId")));
    if (result.ok && result.href) redirect(result.href);
  }

  const href = (target: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(target) })}`;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Мероприятия</h1>
          <p className="mt-1 text-sm text-stone-500">Все свадьбы платформы. «Открыть как организатор» — свадьба его глазами, черновики тоже. Снять с публикации — если приглашение нарушает правила.</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Название, адрес или студия" className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Найти</button>
        </form>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
            <tr>
              <th className="px-4 py-3 font-normal">Мероприятие</th>
              <th className="px-4 py-3 font-normal">Дата</th>
              <th className="px-4 py-3 font-normal">Шаблон</th>
              <th className="px-4 py-3 font-normal">Гости</th>
              <th className="px-4 py-3 font-normal">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {events.slice(0, PAGE).map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-stone-500">{event.orgName}{event.ownerEmail ? ` · ${event.ownerEmail}` : ""}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {canAct ? (
                      <form action={open}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs text-white">Открыть как организатор</button>
                      </form>
                    ) : null}
                    {event.status === "PUBLISHED" && <a href={`/i/${event.slug}`} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">/i/{event.slug}</a>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">{event.eventDate.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}</td>
                <td className="px-4 py-3 text-xs text-stone-600">{event.template ? findTemplate(event.template)?.name ?? event.template : "—"}</td>
                <td className="px-4 py-3 text-xs">{event.guests} · придут {event.accepted} · фото {event.photos}</td>
                <td className="px-4 py-3">
                  {canAct ? (
                    <form action={setStatus} className="flex items-center gap-2">
                      <input type="hidden" name="eventId" value={event.id} />
                      <select name="status" defaultValue={event.status} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs">
                        {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs">ОК</button>
                    </form>
                  ) : (
                    <span className="text-xs">{STATUS[event.status]}</span>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-stone-500">Ничего не нашли</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-sm">
        {current > 1 ? <Link href={href(current - 1)} className="underline underline-offset-2">← Назад</Link> : <span />}
        {events.length > PAGE && <Link href={href(current + 1)} className="underline underline-offset-2">Дальше →</Link>}
      </div>
    </div>
  );
}
