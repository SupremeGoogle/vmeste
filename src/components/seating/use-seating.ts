"use client";

/**
 * Состояние редактора рассадки.
 *
 * Модель работы: оптимистичный отклик + операции по одной.
 * Гость встаёт на место сразу, запрос уходит следом. Ждать ответ сервера
 * перед отрисовкой нельзя: рассадить сто человек, каждый раз ожидая
 * круговорот запроса, невозможно.
 *
 * Сервер с каждым ответом присылает снимок плана из базы. Когда очередь
 * запросов опустела, редактор подменяет им своё состояние. Отсюда три
 * свойства сразу:
 *   — создание стола, смена вместимости и отмена больше не перезагружают
 *     страницу (раньше перезагрузка сбрасывала выбранный стол и поля);
 *   — после отказа план возвращается к тому, что действительно сохранено;
 *   — правки из другого окна приходят вместе с отказом по версии, и
 *     «обновите страницу» больше не нужно.
 *
 * Пока в очереди есть запросы, снимок не применяется: он старше
 * оптимистичных правок, которые уже на экране, и откатил бы их на миг.
 */
import { useCallback, useRef, useState } from "react";
import type { SeatingOp } from "@/server/services/seating-ops";
import { tableSize, type Hall } from "@/lib/seating-geometry";

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
  isCouple: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  seats: EditorSeat[];
};

export type EditorGuest = { id: string; displayName: string; role?: GuestRole };

export type EditorPlanState = { tables: EditorTable[]; unseated: EditorGuest[]; hall: Hall };

export type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

export type OpOutcome = { ok: true } | { ok: false; message: string };

type Plan = EditorPlanState & { version: number };

const byName = (a: EditorGuest, b: EditorGuest) => a.displayName.localeCompare(b.displayName, "ru");

const mapTables = (prev: EditorPlanState, fn: (table: EditorTable) => EditorTable) => ({
  ...prev,
  tables: prev.tables.map(fn),
});

export function useSeating(eventId: string, initial: Plan) {
  const [plan, setPlan] = useState<EditorPlanState>({
    tables: initial.tables,
    unseated: initial.unseated,
    hall: initial.hall,
  });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const version = useRef(initial.version);
  const undoStack = useRef<SeatingOp[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  /** Операции отправляются строго по очереди: два параллельных запроса
   *  с одной версией гарантированно приводят ко второму 409. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  /** Последнее известное сохранённое состояние — на случай отказа без снимка. */
  const confirmed = useRef<EditorPlanState>(plan);

  const adopt = useCallback((snapshot: Plan | null | undefined) => {
    if (!snapshot) return false;
    version.current = snapshot.version;
    const next = { tables: snapshot.tables, unseated: snapshot.unseated, hall: snapshot.hall };
    confirmed.current = next;
    // Снимок старше правок, которые ещё летят на сервер, — не перетираем их.
    if (pending.current === 0) setPlan(next);
    return true;
  }, []);

  const send = useCallback(
    (
      op: SeatingOp,
      optimistic?: (prev: EditorPlanState) => EditorPlanState,
      remember = true,
    ): Promise<OpOutcome> => {
      if (optimistic) setPlan(optimistic);
      pending.current += 1;
      setStatus({ kind: "saving" });

      const run = queue.current.then(async (): Promise<OpOutcome> => {
        let outcome: OpOutcome;
        try {
          const res = await fetch(`/api/app/events/${eventId}/seating/ops`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ version: version.current, op }),
          });
          const data = await res.json().catch(() => ({}));
          pending.current -= 1;

          if (data.ok) {
            if (remember && data.undo) {
              undoStack.current.push(data.undo);
              setCanUndo(true);
            }
            if (!adopt(data.plan)) version.current = data.version;
            setStatus(pending.current === 0 ? { kind: "idle" } : { kind: "saving" });
            return { ok: true };
          }

          const message: string = data.message ?? "Не удалось сохранить";
          if (!adopt(data.plan) && pending.current === 0) setPlan(confirmed.current);
          setStatus(
            res.status === 409 ? { kind: "conflict", message } : { kind: "error", message },
          );
          outcome = { ok: false, message };
        } catch {
          pending.current -= 1;
          if (pending.current === 0) setPlan(confirmed.current);
          outcome = { ok: false, message: "Нет связи с сервером" };
          setStatus({ kind: "error", message: outcome.message });
        }
        return outcome;
      });

      queue.current = run;
      return run;
    },
    [eventId, adopt],
  );

  const assign = useCallback(
    (seatId: string, guest: EditorGuest) =>
      send({ kind: "assign", seatId, guestId: guest.id }, (prev) => {
        // Если место занято, прежний гость встаёт — и должен появиться
        // в списке нерассаженных. Иначе он исчезает из интерфейса, хотя
        // на сервере честно снят с места.
        const displaced = prev.tables
          .flatMap((table) => table.seats)
          .find((seat) => seat.id === seatId)?.guest;

        const tables = prev.tables.map((table) => ({
          ...table,
          seats: table.seats.map((seat) => {
            if (seat.id === seatId) return { ...seat, guest };
            if (seat.guest?.id === guest.id) return { ...seat, guest: null };
            return seat;
          }),
        }));

        let unseated = prev.unseated.filter((g) => g.id !== guest.id);
        if (displaced && displaced.id !== guest.id) unseated = [...unseated, displaced].sort(byName);
        return { ...prev, tables, unseated };
      }),
    [send],
  );

  const clear = useCallback(
    (seatId: string) =>
      send({ kind: "clear", seatId }, (prev) => {
        const removed = prev.tables.flatMap((table) => table.seats).find((s) => s.id === seatId)?.guest;
        return {
          ...prev,
          tables: prev.tables.map((table) => ({
            ...table,
            seats: table.seats.map((seat) => (seat.id === seatId ? { ...seat, guest: null } : seat)),
          })),
          unseated: removed ? [...prev.unseated, removed].sort(byName) : prev.unseated,
        };
      }),
    [send],
  );

  const moveTable = useCallback(
    (tableId: string, x: number, y: number) =>
      send({ kind: "moveTable", tableId, x, y }, (prev) =>
        mapTables(prev, (t) => (t.id === tableId ? { ...t, x, y } : t)),
      ),
    [send],
  );

  const renameTable = useCallback(
    (tableId: string, label: string) =>
      send({ kind: "renameTable", tableId, label }, (prev) =>
        mapTables(prev, (t) => (t.id === tableId ? { ...t, label } : t)),
      ),
    [send],
  );

  /** Смена формы меняет и габариты — пересчитываем их и на клиенте,
   *  иначе план «прыгнет» только с ответом сервера. */
  const setShape = useCallback(
    (tableId: string, shape: string) =>
      send({ kind: "setShape", tableId, shape } as SeatingOp, (prev) =>
        mapTables(prev, (t) => (t.id === tableId ? { ...t, shape, ...tableSize({ ...t, shape }) } : t)),
      ),
    [send],
  );

  /** Новые места получают id на сервере — план придёт снимком. */
  const setCapacity = useCallback(
    (tableId: string, capacity: number) => send({ kind: "setCapacity", tableId, capacity }),
    [send],
  );

  const createTable = useCallback(
    (input: { label: string; shape: string; capacity: number; x?: number; y?: number }) =>
      send({ kind: "createTable", ...input } as SeatingOp),
    [send],
  );

  const createCoupleTable = useCallback(
    (capacity: number, at?: { x: number; y: number }) =>
      send({ kind: "createCoupleTable", capacity, ...at }),
    [send],
  );

  const deleteTable = useCallback(
    (tableId: string) =>
      send({ kind: "deleteTable", tableId }, (prev) => {
        const table = prev.tables.find((t) => t.id === tableId);
        const freed = (table?.seats ?? []).flatMap((seat) => (seat.guest ? [seat.guest] : []));
        return {
          ...prev,
          tables: prev.tables.filter((t) => t.id !== tableId),
          unseated: [...prev.unseated, ...freed].sort(byName),
        };
      }),
    [send],
  );

  const resizeHall = useCallback(
    (hall: Hall, shift: { x: number; y: number }) =>
      send(
        { kind: "resizeHall", width: hall.width, height: hall.height, shiftX: shift.x, shiftY: shift.y },
        (prev) => ({
          hall,
          unseated: prev.unseated,
          tables: prev.tables.map((t) => ({ ...t, x: t.x + shift.x, y: t.y + shift.y })),
        }),
      ),
    [send],
  );

  /** Гость, вписанный в рассадке: id ему даёт сервер, поэтому без прогноза. */
  const createGuest = useCallback(
    (displayName: string, seatId?: string) =>
      send({ kind: "createGuest", displayName, ...(seatId ? { seatId } : {}) }),
    [send],
  );

  /**
   * Отмена. Обратная операция приходит с сервера — считать её на клиенте
   * значило бы дублировать логику и разойтись с ней на первом же исключении.
   * Результат отмены приходит снимком, как у любой операции.
   */
  const undo = useCallback(async () => {
    const op = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!op) return;
    await send(op, undefined, false);
  }, [send]);

  return {
    ...plan,
    status, canUndo,
    assign, clear, moveTable, undo,
    renameTable, setShape, createTable, createCoupleTable, deleteTable, setCapacity,
    resizeHall, createGuest,
    setStatus,
  };
}

export type Seating = ReturnType<typeof useSeating>;
