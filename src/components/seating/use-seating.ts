"use client";

/**
 * Состояние редактора рассадки.
 *
 * Модель работы: оптимистичный отклик + операции по одной.
 * Гость встаёт на место сразу, запрос уходит следом. Если сервер отказал —
 * состояние откатывается и показывается причина. Ждать ответ сервера перед
 * отрисовкой нельзя: рассадить сто человек, каждый раз ожидая круговорот
 * запроса, невозможно.
 *
 * Версия плана хранится тут же и уезжает с каждой операцией: так ловится
 * второй открытый редактор (PLAN.md §5.4).
 */
import { useCallback, useRef, useState } from "react";
import type { SeatingOp } from "@/server/services/seating-ops";

import type { GuestRole } from "@/generated/prisma/enums";

export type EditorSeat = {
  id: string;
  index: number;
  guest: { id: string; displayName: string; role?: GuestRole } | null;
};

export type EditorTable = {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  seats: EditorSeat[];
};

export type EditorGuest = { id: string; displayName: string; role?: GuestRole };

export type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict" };

type Snapshot = { tables: EditorTable[]; unseated: EditorGuest[] };

export function useSeating(
  eventId: string,
  initial: { tables: EditorTable[]; unseated: EditorGuest[]; version: number },
) {
  const [tables, setTables] = useState(initial.tables);
  const [unseated, setUnseated] = useState(initial.unseated);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const version = useRef(initial.version);
  const undoStack = useRef<SeatingOp[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  /** Операции отправляются строго по очереди: два параллельных запроса
   *  с одной версией гарантированно приводят ко второму 409. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  const send = useCallback(
    (op: SeatingOp, optimistic: (prev: Snapshot) => Snapshot, remember = true) => {
      const before: Snapshot = { tables, unseated };
      const next = optimistic(before);
      setTables(next.tables);
      setUnseated(next.unseated);
      setStatus({ kind: "saving" });

      queue.current = queue.current.then(async () => {
        try {
          const res = await fetch(`/api/app/events/${eventId}/seating/ops`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ version: version.current, op }),
          });
          const data = await res.json();

          if (res.status === 409) {
            setTables(before.tables);
            setUnseated(before.unseated);
            setStatus({ kind: "conflict" });
            return;
          }

          if (!res.ok || !data.ok) {
            setTables(before.tables);
            setUnseated(before.unseated);
            setStatus({ kind: "error", message: data.message ?? "Не удалось сохранить" });
            return;
          }

          version.current = data.version;
          if (remember && data.undo) {
            undoStack.current.push(data.undo);
            setCanUndo(true);
          }
          setStatus({ kind: "idle" });
        } catch {
          setTables(before.tables);
          setUnseated(before.unseated);
          setStatus({ kind: "error", message: "Нет связи с сервером" });
        }
      });
    },
    [eventId, tables, unseated],
  );

  const assign = useCallback(
    (seatId: string, guest: EditorGuest) => {
      send({ kind: "assign", seatId, guestId: guest.id }, (prev) => {
        // Если место занято, прежний гость встаёт — и должен появиться
        // в списке нерассаженных. Иначе он исчезает из интерфейса, хотя
        // на сервере честно снят с места: проверено в браузере, гость
        // «Алиса Щербакова» пропала с плана и из списка одновременно.
        const displaced = prev.tables
          .flatMap((table) => table.seats)
          .find((seat) => seat.id === seatId)?.guest;

        const tables = prev.tables.map((table) => ({
          ...table,
          seats: table.seats.map((seat) => {
            if (seat.id === seatId) return { ...seat, guest };
            // Гость мог сидеть где-то ещё — оттуда снимаем.
            if (seat.guest?.id === guest.id) return { ...seat, guest: null };
            return seat;
          }),
        }));

        let unseated = prev.unseated.filter((g) => g.id !== guest.id);
        if (displaced && displaced.id !== guest.id) {
          unseated = [...unseated, displaced].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, "ru"),
          );
        }

        return { tables, unseated };
      });
    },
    [send],
  );

  const clear = useCallback(
    (seatId: string) => {
      send({ kind: "clear", seatId }, (prev) => {
        const removed = prev.tables
          .flatMap((table) => table.seats)
          .find((seat) => seat.id === seatId)?.guest;

        return {
          tables: prev.tables.map((table) => ({
            ...table,
            seats: table.seats.map((seat) =>
              seat.id === seatId ? { ...seat, guest: null } : seat,
            ),
          })),
          unseated: removed
            ? [...prev.unseated, removed].sort((a, b) =>
                a.displayName.localeCompare(b.displayName, "ru"),
              )
            : prev.unseated,
        };
      });
    },
    [send],
  );

  const moveTable = useCallback(
    (tableId: string, x: number, y: number) => {
      send({ kind: "moveTable", tableId, x, y }, (prev) => ({
        ...prev,
        tables: prev.tables.map((table) =>
          table.id === tableId ? { ...table, x, y } : table,
        ),
      }));
    },
    [send],
  );

  /**
   * Отмена. Обратная операция приходит с сервера — считать её на клиенте
   * значило бы дублировать логику и разойтись с ней на первом же исключении.
   *
   * Здесь НЕ используется общий `send`: отмена ждёт ответ сервера и только
   * потом перечитывает страницу. Первая версия ставила запрос в очередь
   * и сразу планировала перезагрузку — в замерах версия плана прирастала
   * на три вместо одного, то есть операция уходила по несколько раз.
   * Одиночный запуск с флагом снимает этот класс ошибок целиком.
   */
  const undoing = useRef(false);

  const undo = useCallback(async () => {
    if (undoing.current) return;

    const op = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!op) return;

    undoing.current = true;
    setStatus({ kind: "saving" });

    try {
      const res = await fetch(`/api/app/events/${eventId}/seating/ops`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Отмена всегда идёт от актуальной версии: между действием и отменой
        // никто другой не правил план, иначе мы бы уже получили 409.
        body: JSON.stringify({ version: version.current, op }),
      });

      if (res.status === 409) {
        setStatus({ kind: "conflict" });
        return;
      }
      if (!res.ok) {
        setStatus({ kind: "error", message: "Не удалось отменить" });
        return;
      }

      // Состояние после отмены проще перечитать с сервера, чем выводить
      // обратное преобразование для каждого типа операции.
      window.location.reload();
    } catch {
      setStatus({ kind: "error", message: "Нет связи с сервером" });
    } finally {
      undoing.current = false;
    }
  }, [eventId]);

  return {
    tables, unseated, status, canUndo,
    assign, clear, moveTable, undo,
    setStatus,
  };
}
