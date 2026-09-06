"use client";

/**
 * Карточка мероприятия в списке. Живёт на клиенте только ради двух вещей,
 * которые неудобно делать формой с перезагрузкой страницы: переключение
 * в режим переименования по месту и двухшажное подтверждение удаления
 * (без нативного confirm() — он не красится и не всегда доступен во всех
 * средах предпросмотра).
 *
 * Сами действия — обычные Server Actions, переданные из page.tsx: клик
 * ничем не отличается от отправки формы, экран целиком обновляется
 * сервером через revalidatePath.
 */
import { useState, useTransition } from "react";
import Link from "next/link";

export type EventCardData = {
  id: string;
  title: string;
  shortCode: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  eventDateLabel: string;
  venueName: string | null;
  guestCount: number;
};

const STATUS_STYLE: Record<EventCardData["status"], string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  PUBLISHED: "bg-amber-100 text-amber-900",
  ARCHIVED: "bg-stone-100 text-stone-400",
};

const STATUS_LABEL: Record<EventCardData["status"], string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "В архиве",
};

export function EventCard({
  event,
  onRename,
  onDelete,
}: {
  event: EventCardData;
  onRename: (eventId: string, title: string) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saveTitle() {
    const clean = title.trim();
    if (!clean || clean === event.title) {
      setTitle(event.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await onRename(event.id, clean);
      setEditing(false);
    });
  }

  return (
    <li
      className={`rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7 ${
        event.status === "ARCHIVED"
          ? "border-stone-200 bg-stone-100/60 opacity-70"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitle(event.title);
                    setEditing(false);
                  }
                }}
                maxLength={120}
                className="w-full max-w-sm rounded-lg border border-stone-300 px-3 py-1.5 text-lg font-medium sm:text-xl"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={saveTitle}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Сохраняю…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(event.title);
                  setEditing(false);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900"
              >
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/app/e/${event.id}`}
                className="truncate text-lg font-medium hover:underline sm:text-xl"
              >
                {event.title}
              </Link>
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Переименовать"
                aria-label="Переименовать"
                className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                ✎
              </button>
            </div>
          )}

          <p className="mt-1.5 text-sm text-stone-600">
            {event.eventDateLabel}
            {event.venueName ? ` · ${event.venueName}` : ""}
            {` · ${event.guestCount} гостей`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[event.status]}`}>
            {STATUS_LABEL[event.status]}
          </span>
          <p className="font-mono text-lg tracking-widest text-stone-600">{event.shortCode}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link
          href={`/app/e/${event.id}/guests`}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-400 hover:bg-stone-50"
        >
          Гости
        </Link>
        <Link
          href={`/app/e/${event.id}/seating`}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-400 hover:bg-stone-50"
        >
          Рассадка
        </Link>
        <Link
          href={`/app/e/${event.id}/print`}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-400 hover:bg-stone-50"
        >
          Печать и QR
        </Link>
        <Link
          href={`/app/e/${event.id}/settings`}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:border-stone-400 hover:bg-stone-50"
        >
          Настройки
        </Link>
        <a
          href={`/e/${event.shortCode}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-900"
        >
          Вход гостя ↗
        </a>

        <div className="ml-auto">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-800">Удалить безвозвратно?</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await onDelete(event.id);
                  })
                }
                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Удаляю…" : "Да, удалить"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:text-stone-900"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
