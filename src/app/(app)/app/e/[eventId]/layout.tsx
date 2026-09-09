import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { notFound } from "next/navigation";
import { EventTabs } from "./event-tabs";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  return (
    <div>
      {/* Липкая шапка: в списке гостей на 40 человек переключиться на
          «Рассадку» иначе можно только домотав до самого верха. На печать
          она не идёт — position:sticky повторил бы её на каждом листе. */}
      <div className="no-print sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="truncate text-xl sm:text-2xl">{event.title}</h1>
            <span className="shrink-0 font-mono text-sm tracking-widest text-stone-500">
              {event.shortCode}
            </span>
          </div>
          <EventTabs eventId={eventId} />
        </div>
      </div>
      {children}
    </div>
  );
}
