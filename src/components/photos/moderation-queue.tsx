"use client";

/**
 * Очередь модерации.
 *
 * Требование к скорости жёсткое: пятьдесят фотографий должны разбираться
 * меньше чем за две минуты, то есть меньше двух с половиной секунд на кадр.
 * Отсюда всё устройство экрана:
 *
 *   — одно фото на весь экран, а не сетка: глазу не надо искать, куда жать;
 *   — решение принимается клавишей и применяется сразу, не дожидаясь
 *     ответа сервера; запрос уходит следом. Ошибка сети возвращает фото
 *     в очередь и говорит об этом вслух;
 *   — следующее фото подгружается заранее, иначе каждое решение упирается
 *     в ожидание картинки.
 *
 * Клавиши читаются по `event.code`, а не по `event.key`. У организатора
 * в русской раскладке `KeyA` даёт «ф», и привязка к букве развалилась бы
 * ровно в тот момент, когда человек печатает имена гостей по-русски.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type QueuePhoto = {
  id: string;
  previewOk: boolean;
  guestName: string | null;
  createdAt: string;
};

type Decision = { photoId: string; status: "APPROVED" | "REJECTED" };

export type PhotoCounts = { pending: number; approved: number; rejected: number };

export function ModerationQueue({
  eventId,
  photos,
  counts: initialCounts,
}: {
  eventId: string;
  photos: QueuePhoto[];
  counts: PhotoCounts;
}) {
  const [queue, setQueue] = useState(photos);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Decision[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  // Счётчики живут здесь, а не на сервере: они стояли над очередью и
  // показывали «на модерации 14», когда в очереди оставалось 11.
  // Модератор верит цифре, которая крупнее.
  const [counts, setCounts] = useState(initialCounts);
  const containerRef = useRef<HTMLDivElement>(null);

  // Указатель приводится к границам прямо в рендере, а не эффектом:
  // очередь укорачивается на каждом решении, и «поправить состояние
  // после того, как отрисовали» — лишний проход и лишний источник мигания.
  const cursor = Math.min(index, Math.max(0, queue.length - 1));
  const current = queue[cursor];
  const next = queue[cursor + 1];

  const send = useCallback(
    async (photoId: string, status: Decision["status"] | "PENDING") => {
      const response = await fetch(`/api/app/events/${eventId}/photos/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId, status }),
      });
      if (!response.ok) throw new Error("Не сохранилось");
    },
    [eventId],
  );

  const decide = useCallback(
    (status: Decision["status"]) => {
      const photo = queue[cursor];
      if (!photo) return;

      setQueue((prev) => prev.filter((item) => item.id !== photo.id));
      setHistory((prev) => [...prev, { photoId: photo.id, status }]);
      setDone((prev) => prev + 1);
      setCounts((prev) => shift(prev, status, 1));
      setError(null);

      void send(photo.id, status).catch(() => {
        // Вернуть на место — иначе организатор будет уверен, что разобрал
        // очередь, а фото останется висеть.
        setQueue((prev) => [photo, ...prev]);
        setHistory((prev) => prev.filter((item) => item.photoId !== photo.id));
        setDone((prev) => Math.max(0, prev - 1));
        setCounts((prev) => shift(prev, status, -1));
        setError("Решение не сохранилось — проверьте связь");
      });
    },
    [cursor, queue, send],
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((prev) => prev.slice(0, -1));
    setDone((prev) => Math.max(0, prev - 1));
    void send(last.photoId, "PENDING")
      .then(() => window.location.reload())
      .catch(() => setError("Отмена не сохранилась"));
  }, [history, send]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.code) {
        case "Space":
        case "Enter":
          event.preventDefault();
          decide("APPROVED");
          break;
        case "Backspace":
        case "KeyX":
          event.preventDefault();
          decide("REJECTED");
          break;
        case "KeyZ":
          event.preventDefault();
          undo();
          break;
        case "ArrowRight":
          event.preventDefault();
          setIndex((prev) => Math.min(prev + 1, Math.max(0, queue.length - 1)));
          break;
        case "ArrowLeft":
          event.preventDefault();
          setIndex((prev) => Math.max(0, prev - 1));
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, queue.length]);

  const tiles = (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { label: "На модерации", value: counts.pending },
        { label: "Опубликовано", value: counts.approved },
        { label: "Отклонено", value: counts.rejected },
      ].map((tile) => (
        <div key={tile.label} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="tile-value text-2xl">{tile.value}</p>
          <p className="text-sm text-stone-500">{tile.label}</p>
        </div>
      ))}
    </div>
  );

  if (!current) {
    return (
      <div>
        {tiles}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-10 text-center">
        <p className="text-lg">Очередь разобрана</p>
        <p className="mt-1 text-sm text-stone-500">
          Разобрано за этот заход: {done}
          {history.length > 0 ? " · Z — вернуть последнее в очередь" : ""}
        </p>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {tiles}
      <div className="mt-6 flex items-baseline justify-between text-sm text-stone-500">
        <span>
          Осталось {queue.length} · разобрано {done}
        </span>
        <span className="hidden sm:block">
          пробел — одобрить · X — отклонить · Z — отменить · ← → листать
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-stone-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={`/api/media/${eventId}/${current.id}?size=full`}
          alt=""
          className="mx-auto max-h-[60vh] w-auto object-contain"
        />
      </div>

      {/* Следующее фото грузится заранее и не показывается. */}
      {next ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/media/${eventId}/${next.id}?size=full`} alt="" className="hidden" aria-hidden />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          {current.guestName ?? "Гость не определён"}
          {!current.previewOk ? (
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
              превью не получилось
            </span>
          ) : null}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => decide("REJECTED")}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
          >
            Отклонить (X)
          </button>
          <button
            onClick={() => decide("APPROVED")}
            className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white"
          >
            Одобрить (пробел)
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

/** Сдвиг счётчиков: решение всегда забирает одно из «на модерации». */
function shift(counts: PhotoCounts, status: Decision["status"], sign: 1 | -1): PhotoCounts {
  return {
    pending: Math.max(0, counts.pending - sign),
    approved: counts.approved + (status === "APPROVED" ? sign : 0),
    rejected: counts.rejected + (status === "REJECTED" ? sign : 0),
  };
}
