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
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="truncate text-xl sm:text-2xl">{event.title}</h1>
            <span className="shrink-0 font-mono text-sm tracking-widest text-stone-500">
              {event.shortCode}
            </span>
          </div>
          {/* Одиннадцать разделов не помещаются в ряд даже на планшете, а
              переносить их в три строки значит отодвинуть содержимое
              страницы вниз на треть экрана. Поэтому лента прокручивается
              вбок — как в приложениях, откуда координатор сюда и приходит.
              Поля вытянуты отрицательными отступами, чтобы крайние вкладки
              не обрезались об край экрана. */}
          <nav className="-mx-4 mt-4 flex gap-5 overflow-x-auto px-4 text-sm whitespace-nowrap sm:mx-0 sm:px-0">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 border-b-2 border-transparent pb-3 text-stone-600 hover:border-stone-900 hover:text-stone-900"
              >
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
