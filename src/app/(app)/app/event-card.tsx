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
  index = 0,
  onRename,
  onDelete,
}: {
  event: EventCardData;
  /** Место в списке — только чтобы карточки появлялись лесенкой. */
  index?: number;
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
      style={{ "--i": index } as React.CSSProperties}
      className={`rounded-2xl border p-5 shadow-sm transition-[box-shadow,border-color] duration-200 ease-[var(--ease-soft)] hover:border-stone-300 hover:shadow-md sm:p-7 ${
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
            <div className="flex items-start gap-1">
              {/*
                Раньше здесь стоял `truncate`, и «Аня и Миша — Свадьба»
                на телефоне превращалось в «Аня и Миша …», хотя справа
                пустовала половина карточки. Двух строк хватает любому
                разумному названию, а всё сверх того обрезается честно.
              */}
              <Link
                href={`/app/e/${event.id}`}
                className="line-clamp-2 text-lg leading-snug font-medium underline-offset-4 hover:underline sm:text-xl"
              >
                {event.title}
              </Link>
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Переименовать"
                aria-label="Переименовать"
                className="-mt-1 shrink-0 rounded-md p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-700"
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

        {/*
          На телефоне статус и код встают в строку под названием, а не
          колонкой справа: колонка отжимала заголовок в узкую щель ради
          двух коротких значений.
        */}
        <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto sm:flex-col sm:items-end sm:gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[event.status]}`}>
            {STATUS_LABEL[event.status]}
          </span>
          <p className="font-mono text-lg tracking-widest text-stone-600">{event.shortCode}</p>
        </div>
      </div>

      {/*
        Сетка вместо переноса по строке. `flex-wrap` раскладывал пять
        кнопок разной ширины в рваную лесенку — на каждом экране свою.
        Две ровные колонки на телефоне читаются как список разделов,
        а не как рассыпанные ярлыки.
      */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        {[
          { href: `/app/e/${event.id}/guests`, label: "Гости" },
          { href: `/app/e/${event.id}/seating`, label: "Рассадка" },
          { href: `/app/e/${event.id}/print`, label: "Печать и QR" },
          { href: `/app/e/${event.id}/settings`, label: "Настройки" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 text-sm font-medium transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-soft)] hover:border-stone-400 hover:bg-stone-50 active:scale-[0.97]"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/*
        Отдельная полоса под чертой — и «Удалить» уехало от остальных
        кнопок. Прежде оно стояло вплотную к «Входу гостя»: безобидная
        ссылка и безвозвратное удаление в паре сантиметров друг от
        друга — это промах пальцем ценой всего мероприятия.
      */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200/80 pt-3">
        <a
          href={`/e/${event.shortCode}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center text-sm font-medium text-stone-500 transition-colors duration-200 hover:text-stone-900"
        >
          Вход гостя ↗
        </a>

        {confirmingDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden text-sm text-red-800 sm:inline">Удалить безвозвратно?</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await onDelete(event.id);
                })
              }
              className="min-h-11 rounded-lg bg-red-700 px-3 text-sm font-medium text-white transition-opacity duration-200 disabled:opacity-50"
            >
              {isPending ? "Удаляю…" : "Да, удалить"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="min-h-11 rounded-lg px-3 text-sm text-stone-500 transition-colors duration-200 hover:text-stone-900"
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-800 transition-colors duration-200 hover:bg-red-50"
          >
            Удалить
          </button>
        )}
      </div>
    </li>
  );
}
