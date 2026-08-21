import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/server/context";
import { listEvents } from "@/server/repositories/events";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "В архиве",
};

export default async function EventsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const events = await listEvents(ctx);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Мероприятия</h1>
        <Link
          href="/app/events/new"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          Новое мероприятие
        </Link>
      </div>

      {events.length === 0 && (
        <p className="mt-6 text-stone-600">Мероприятий пока нет.</p>
      )}

      <ul className="mt-6 space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className={`rounded-xl border border-stone-200 p-5 ${
              event.status === "ARCHIVED" ? "bg-stone-100 opacity-70" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/app/e/${event.id}`} className="text-lg font-medium hover:underline">
                  {event.title}
                </Link>
                <p className="mt-1 text-sm text-stone-600">
                  {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(event.eventDate)}
                  {event.venueName ? ` · ${event.venueName}` : ""}
                  {` · ${event._count.guests} гостей`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500">{STATUS[event.status]}</span>
                <p className="mt-1 font-mono text-lg tracking-widest">{event.shortCode}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-4 text-sm">
              <Link href={`/app/e/${event.id}/guests`} className="text-stone-700 hover:underline">Гости</Link>
              <Link href={`/app/e/${event.id}/seating`} className="text-stone-700 hover:underline">Рассадка</Link>
              <Link href={`/app/e/${event.id}/print`} className="text-stone-700 hover:underline">Печать и QR</Link>
              <a href={`/e/${event.shortCode}`} target="_blank" className="text-stone-500 hover:underline">
                Вход гостя ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
