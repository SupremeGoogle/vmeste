import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/context";
import { listEvents, renameEvent, deleteEvent } from "@/server/repositories/events";
import { EventCard } from "./event-card";
import { getUiLang } from "@/server/i18n";
import { makeT, localeOf } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const events = await listEvents(ctx);
  // Первый вход после регистрации: пустой список с подсказкой «начните с
  // кнопки выше» — лишний шаг между «Создать свадьбу» на главной и самой
  // свадьбой. Сразу ведём в форму.
  if (events.length === 0) redirect("/app/events/new?first=1");
  const lang = await getUiLang();
  const t = makeT(lang);

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
        <h1 className="text-3xl font-semibold">{t("Мероприятия", "Events")}</h1>
        {/* На телефоне кнопка занимала всю ширину и висела приклеенной
            к заголовку. Прижимаем её вправо: так она читается как
            действие, а не как второй заголовок. */}
        <Link
          href="/app/events/new"
          className="ml-auto flex min-h-11 items-center rounded-lg bg-stone-900 px-5 text-base font-medium text-white transition-[opacity,transform] duration-200 ease-[var(--ease-soft)] hover:opacity-90 active:scale-[0.97]"
        >
          {t("+ Новое мероприятие", "+ New event")}
        </Link>
      </div>

      <ul className="rise-stagger mt-8 space-y-4">
        {events.map((event, i) => (
          <EventCard
            key={event.id}
            index={i}
            event={{
              id: event.id,
              title: event.title,
              shortCode: event.shortCode,
              status: event.status,
              eventDateLabel: new Intl.DateTimeFormat(localeOf(lang), { dateStyle: "long" }).format(
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
