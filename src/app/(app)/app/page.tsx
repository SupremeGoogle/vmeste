import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/context";
import { listEvents, renameEvent, deleteEvent } from "@/server/repositories/events";
import { EventCard } from "./event-card";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const events = await listEvents(ctx);

  async function rename(eventId: string, title: string) {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) return;
    await renameEvent(ctx, eventId, title);
    revalidatePath("/app");
  }

  async function remove(eventId: string) {
    "use server";
    const ctx = await getOrgContext();
    if (!ctx) return;
    await deleteEvent(ctx, eventId);
    revalidatePath("/app");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold">Мероприятия</h1>
        <Link
          href="/app/events/new"
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-base font-medium text-white hover:opacity-90"
        >
          + Новое мероприятие
        </Link>
      </div>

      {events.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-600">
          Мероприятий пока нет — начните с кнопки выше.
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={{
              id: event.id,
              title: event.title,
              shortCode: event.shortCode,
              status: event.status,
              eventDateLabel: new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(
                event.eventDate,
              ),
              venueName: event.venueName,
              guestCount: event._count.guests,
            }}
            onRename={rename}
            onDelete={remove}
          />
        ))}
      </ul>
    </main>
  );
}
