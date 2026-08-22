import Link from "next/link";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { notFound } from "next/navigation";

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

  const tabs = [
    { href: `/app/e/${eventId}`, label: "Обзор" },
    { href: `/app/e/${eventId}/guests`, label: "Гости" },
    { href: `/app/e/${eventId}/seating`, label: "Рассадка" },
    { href: `/app/e/${eventId}/invite`, label: "Приглашение" },
    { href: `/app/e/${eventId}/rsvp`, label: "Ответы" },
    { href: `/app/e/${eventId}/photos`, label: "Фото" },
    { href: `/app/e/${eventId}/wishes`, label: "Пожелания" },
    { href: `/app/e/${eventId}/raffle`, label: "Розыгрыш" },
    { href: `/app/e/${eventId}/screen`, label: "Экран" },
    { href: `/app/e/${eventId}/print`, label: "Печать и QR" },
    { href: `/app/e/${eventId}/settings`, label: "Настройки" },
  ];

  return (
    <div>
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 pt-5">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl">{event.title}</h1>
            <span className="font-mono text-sm tracking-widest text-stone-500">
              {event.shortCode}
            </span>
          </div>
          <nav className="mt-4 flex gap-5 text-sm">
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href} className="border-b-2 border-transparent pb-3 text-stone-600 hover:border-stone-900 hover:text-stone-900">
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
