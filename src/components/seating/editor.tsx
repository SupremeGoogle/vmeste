"use client";

/* eslint-disable react-hooks/refs -- см. пояснение ниже */

/**
 * Конструктор рассадки: план зала с перетаскиванием.
 *
 * Почему план здесь на HTML, а не на SVG, хотя просмотр и PDF — SVG:
 * dnd-kit измеряет элементы через getBoundingClientRect, и абсолютно
 * позиционированные div-ы дают предсказуемые зоны попадания и нормальный
 * тач на планшете. Геометрия при этом общая (lib/seating-geometry.ts),
 * поэтому редактор и распечатка показывают одно и то же.
 *
 * Тач-сенсор с задержкой 200 мс — обязателен: без неё на планшете
 * невозможно прокрутить страницу, любой палец на плане начинает перетаскивание.
 */
import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, pointerWithin,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  PLAN_HEIGHT, PLAN_WIDTH, clampToPlan, isRound, MARK_LABEL_SHIFT, labelPosition, seatPosition,
  shortName, snap,
} from "@/lib/seating-geometry";
import { MARK_RADIUS, ROLE_LABEL, markFor } from "@/lib/couple-marks";
import type { GuestRole } from "@/generated/prisma/enums";
import {
  useSeating, type EditorGuest, type EditorSeat, type EditorTable,
} from "./use-seating";

type DragPayload =
  | { type: "guest"; guest: EditorGuest; fromSeatId?: string }
  | { type: "table"; tableId: string };

/**
 * Проценты округляются до трёх знаков намеренно.
 *
 * Без округления координата 724/1000 превращается в «72.39999999999999%»,
 * и сервер с клиентом иногда печатают её по-разному — React ругается
 * на расхождение гидрации и перерисовывает поддерево целиком, теряя
 * состояние редактора. Поймано по значку ошибки в дев-панели браузера.
 */
const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(3)}%`;

/**
 * Место за столом.
 *
 * Кружок нарисован маленьким — иначе план перестаёт читаться, — но зона
 * нажатия вокруг него 36 пикселей. Проверка в браузере показала, что
 * в 22-пиксельный кружок промахивается даже мышь; пальцем на планшете
 * в него не попасть вовсе (рекомендуемый минимум для тача — 44 px,
 * и 36 здесь предел, дальше зоны соседних мест начинают перекрываться).
 *
 * Два способа работы, оба обязательны:
 *   — перетаскивание, когда удобно мышью;
 *   — «выбрать и поставить» щелчками, что единственный надёжный способ
 *     на тач-экране и работает с клавиатуры.
 */
const HIT_SIZE = 36;

/** Значок невесты или жениха: фигуры общие с планом гостя и PDF. */
function CoupleGlyph({ role, active }: { role: GuestRole; active: boolean }) {
  const mark = markFor(role);
  if (!mark) return null;

  return (
    <svg
      viewBox="-16 -16 32 32"
      width={26}
      height={26}
      aria-label={mark.label}
      className={active ? "opacity-80" : ""}
    >
      <circle r={MARK_RADIUS} fill="#8b6f47" stroke="#fffdf9" strokeWidth={1.5} />
      {mark.petals?.map((petal, index) => (
        <circle key={index} cx={petal.x} cy={petal.y} r={petal.r} fill="#fffdf9" />
      ))}
      {mark.bow ? (
        <>
          <polygon points={mark.bow.left} fill="#fffdf9" />
          <polygon points={mark.bow.right} fill="#fffdf9" />
          <circle cx={mark.bow.knot.x} cy={mark.bow.knot.y} r={mark.bow.knot.r} fill="#8b6f47" />
        </>
      ) : null}
    </svg>
  );
}

function SeatDot({
  table, seat, selected, onSelect, onPlace,
}: {
  table: EditorTable;
  seat: EditorSeat;
  selected: EditorGuest | null;
  onSelect: (guest: EditorGuest | null, seatId?: string) => void;
  onPlace: (seatId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `seat:${seat.id}` });
  const pos = seatPosition(table, seat.index);
  const role = seat.guest?.role ?? "GUEST";
  const label = labelPosition(table, pos, role === "GUEST" ? 0 : MARK_LABEL_SHIFT);

  const draggable = useDraggable({
    id: `seated:${seat.id}`,
    data: seat.guest
      ? ({ type: "guest", guest: seat.guest, fromSeatId: seat.id } satisfies DragPayload)
      : undefined,
    disabled: !seat.guest,
  });

  const isSelected = Boolean(seat.guest && selected?.id === seat.guest.id);

  function handleClick() {
    // Есть выбранный гость — ставим его сюда, даже если место занято:
    // прежний гость встанет и вернётся в список нерассаженных.
    if (selected) {
      onPlace(seat.id);
      return;
    }
    // Иначе щелчок по занятому месту выбирает гостя, чтобы перенести.
    onSelect(seat.guest ?? null, seat.id);
  }

  return (
    <>
      <button
        ref={(node) => {
          setNodeRef(node);
          if (seat.guest) draggable.setNodeRef(node);
        }}
        {...(seat.guest ? draggable.listeners : {})}
        {...(seat.guest ? draggable.attributes : {})}
        onClick={handleClick}
        type="button"
        title={
          seat.guest
            ? `${seat.guest.displayName} — щёлкните, чтобы перенести`
            : "Свободное место"
        }
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          left: pct(pos.x, PLAN_WIDTH),
          top: pct(pos.y, PLAN_HEIGHT),
          width: HIT_SIZE,
          height: HIT_SIZE,
          cursor: seat.guest ? "grab" : selected ? "pointer" : "default",
          opacity: draggable.isDragging ? 0.3 : 1,
        }}
      >
        {/* Место молодожёнов помечено значком — тем же, что видит гость
            на плане и координатор в распечатке. */}
        {seat.guest?.role && seat.guest.role !== "GUEST" ? (
          <CoupleGlyph role={seat.guest.role} active={isOver || isSelected} />
        ) : (
          <span
            className={`block rounded-full border transition-colors ${
              isOver || isSelected
                ? "border-stone-900 bg-stone-900"
                : seat.guest
                  ? "border-stone-400 bg-stone-300"
                  : selected
                    ? "border-stone-500 bg-white"
                    : "border-stone-300 bg-white"
            }`}
            style={{ width: 22, height: 22 }}
          />
        )}
      </button>

      {seat.guest && (
        <span
          /*
           * У молодожёнов вместо кружка значок, он крупнее, и подпись над
           * ним приходится сдвигать вверх целиком — иначе текст растёт вниз
           * от точки привязки и ложится на значок. Обычным местам этот сдвиг
           * не нужен и даже вреден: подписи соседних мест круглого стола
           * начинают наезжать друг на друга.
           */
          className={`pointer-events-none absolute -translate-x-1/2 select-none whitespace-nowrap text-[10px] ${
            role !== "GUEST" && label.y < pos.y ? "-translate-y-full" : ""
          } ${isSelected ? "font-semibold text-stone-900" : "text-stone-600"}`}
          style={{ left: pct(label.x, PLAN_WIDTH), top: pct(label.y, PLAN_HEIGHT) }}
        >
          {shortName(seat.guest.displayName)}
        </span>
      )}
    </>
  );
}

function TableShape({
  table, selected, onSelect, onPlace,
}: {
  table: EditorTable;
  selected: EditorGuest | null;
  onSelect: (guest: EditorGuest | null, seatId?: string) => void;
  onPlace: (seatId: string) => void;
}) {
  const draggable = useDraggable({
    id: `table:${table.id}`,
    data: { type: "table", tableId: table.id } satisfies DragPayload,
  });

  const round = isRound(table.shape);
  const taken = table.seats.filter((seat) => seat.guest).length;

  return (
    <>
      <div
        ref={draggable.setNodeRef}
        {...draggable.listeners}
        {...draggable.attributes}
        className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-move flex-col items-center justify-center border bg-stone-100 ${
          round ? "rounded-full" : "rounded-lg"
        } ${draggable.isDragging ? "opacity-40" : ""}`}
        style={{
          left: pct(table.x, PLAN_WIDTH),
          top: pct(table.y, PLAN_HEIGHT),
          width: pct(table.width, PLAN_WIDTH),
          height: pct(table.height, PLAN_HEIGHT),
          borderColor: "#d6cec2",
        }}
      >
        <span className="select-none text-xs font-semibold text-stone-700">{table.label}</span>
        <span className="select-none text-[10px] text-stone-500">
          {taken}/{table.capacity}
        </span>
      </div>

      {table.seats.map((seat) => (
        <SeatDot
          key={seat.id}
          table={table}
          seat={seat}
          selected={selected}
          onSelect={onSelect}
          onPlace={onPlace}
        />
      ))}
    </>
  );
}

function GuestChip({
  guest, selected, onSelect,
}: {
  guest: EditorGuest;
  selected: boolean;
  onSelect: (guest: EditorGuest | null) => void;
}) {
  const draggable = useDraggable({
    id: `guest:${guest.id}`,
    data: { type: "guest", guest } satisfies DragPayload,
  });

  return (
    <li>
      <button
        ref={draggable.setNodeRef}
        {...draggable.listeners}
        {...draggable.attributes}
        type="button"
        onClick={() => onSelect(selected ? null : guest)}
        className={`w-full cursor-grab rounded-lg border px-3 py-2 text-left text-sm active:cursor-grabbing ${
          selected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white"
        }`}
        style={{ opacity: draggable.isDragging ? 0.3 : 1 }}
      >
        {guest.displayName}
        {guest.role && guest.role !== "GUEST" ? (
          <span className="ml-2 text-xs opacity-70">{ROLE_LABEL[guest.role]}</span>
        ) : null}
      </button>
    </li>
  );
}

export function SeatingEditor({
  eventId,
  initialTables,
  initialUnseated,
  initialVersion,
}: {
  eventId: string;
  initialTables: EditorTable[];
  initialUnseated: EditorGuest[];
  initialVersion: number;
}) {
  const seating = useSeating(eventId, {
    tables: initialTables,
    unseated: initialUnseated,
    version: initialVersion,
  });

  const [dragging, setDragging] = useState<DragPayload | null>(null);

  /** Выбранный гость: «выбрать и поставить» — второй способ работы,
   *  единственный надёжный на тач-экране. */
  const [selected, setSelected] = useState<EditorGuest | null>(null);

  function select(guest: EditorGuest | null) {
    setSelected(guest);
  }

  function place(seatId: string) {
    if (!selected) return;
    seating.assign(seatId, selected);
    setSelected(null);
  }

  const sensors = useSensors(
    // 6 пикселей: иначе обычный щелчок по гостю считается перетаскиванием.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Задержка на тач-устройствах — чтобы страница осталась прокручиваемой.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function onDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current as DragPayload) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    const payload = event.active.data.current as DragPayload | undefined;
    setDragging(null);
    if (!payload) return;

    if (payload.type === "table") {
      const table = seating.tables.find((t) => t.id === payload.tableId);
      if (!table) return;

      // delta приходит в пикселях экрана — переводим в условные единицы плана.
      const plan = document.getElementById("seating-plan");
      const rect = plan?.getBoundingClientRect();
      if (!rect) return;

      const next = clampToPlan(table, {
        x: snap(table.x + (event.delta.x / rect.width) * PLAN_WIDTH),
        y: snap(table.y + (event.delta.y / rect.height) * PLAN_HEIGHT),
      });
      if (next.x === table.x && next.y === table.y) return;
      seating.moveTable(table.id, next.x, next.y);
      return;
    }

    const overId = String(event.over?.id ?? "");
    if (overId.startsWith("seat:")) {
      seating.assign(overId.slice(5), payload.guest);
      return;
    }
    // Гостя вынесли из плана в список — значит, снять с места.
    if (overId === "unseated" && payload.fromSeatId) {
      seating.clear(payload.fromSeatId);
    }
  }

  return (
    <DndContext
      // Явный id обязателен: без него dnd-kit нумерует свои служебные
      // идентификаторы сквозным счётчиком, и на сервере получается
      // «DndDescribedBy-0», а на клиенте «DndDescribedBy-10» — React
      // считает это расхождением гидрации и перерисовывает весь план.
      id="seating"
      sensors={sensors}
      // Попадание определяется по КУРСОРУ, а не по габаритам перетаскиваемой
      // карточки. С алгоритмом по умолчанию карточка с именем шириной 200 px
      // перекрывает сразу несколько мест, и гость садится не туда, куда его
      // вели, — поймано при проверке в браузере.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:flex-1">
          <div
            id="seating-plan"
            className="relative w-full rounded-xl border border-stone-200 bg-white"
            style={{ aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}` }}
          >
            {seating.tables.map((table) => (
              <TableShape
                key={table.id}
                table={table}
                selected={selected}
                onSelect={select}
                onPlace={place}
              />
            ))}
          </div>

          <StatusBar seating={seating} />
        </div>

        <UnseatedPanel
          guests={seating.unseated}
          selected={selected}
          onSelect={select}
          onUnseat={(guest) => {
            const seat = seating.tables
              .flatMap((table) => table.seats)
              .find((s) => s.guest?.id === guest.id);
            if (seat) seating.clear(seat.id);
            setSelected(null);
          }}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging?.type === "guest" && (
          <div className="rounded-lg border border-stone-400 bg-white px-3 py-1.5 text-sm shadow-lg">
            {dragging.guest.displayName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function StatusBar({ seating }: { seating: ReturnType<typeof useSeating> }) {
  return (
    <div className="mt-3 flex min-h-8 items-center gap-4 text-sm">
      <button
        type="button"
        onClick={seating.undo}
        disabled={!seating.canUndo}
        className="rounded-lg border border-stone-300 px-3 py-1 disabled:opacity-40"
      >
        Отменить
      </button>

      {seating.status.kind === "saving" && <span className="text-stone-500">Сохраняем…</span>}
      {seating.status.kind === "idle" && <span className="text-stone-400">Всё сохранено</span>}

      {seating.status.kind === "error" && (
        <span className="text-red-700">{seating.status.message}</span>
      )}

      {seating.status.kind === "conflict" && (
        <span className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1 text-amber-900">
          Рассадку изменили в другом окне — ваше действие не сохранено.
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline"
          >
            Обновить
          </button>
        </span>
      )}
    </div>
  );
}

function UnseatedPanel({
  guests, selected, onSelect, onUnseat,
}: {
  guests: EditorGuest[];
  selected: EditorGuest | null;
  onSelect: (guest: EditorGuest | null) => void;
  onUnseat: (guest: EditorGuest) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unseated" });
  const selectedIsSeated = selected && !guests.some((g) => g.id === selected.id);

  return (
    <div className="lg:w-72">
      <p className="text-sm font-medium">
        Не рассажено: <span className="text-stone-500">{guests.length}</span>
      </p>

      {selected && (
        <div className="mt-3 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white">
          <p className="font-medium">{selected.displayName}</p>
          <p className="mt-0.5 text-xs text-stone-300">
            Щёлкните по месту на плане, чтобы посадить.
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            {selectedIsSeated && (
              <button type="button" onClick={() => onUnseat(selected)} className="underline">
                Снять с места
              </button>
            )}
            <button type="button" onClick={() => onSelect(null)} className="underline">
              Отмена
            </button>
          </div>
        </div>
      )}

      <ul
        ref={setNodeRef}
        className={`mt-3 max-h-[32rem] space-y-1.5 overflow-y-auto rounded-xl border p-2 ${
          isOver ? "border-stone-900 bg-stone-50" : "border-stone-200"
        }`}
      >
        {guests.map((guest) => (
          <GuestChip
            key={guest.id}
            guest={guest}
            selected={selected?.id === guest.id}
            onSelect={onSelect}
          />
        ))}

        {guests.length === 0 && (
          <li className="px-2 py-3 text-sm text-stone-500">Все гости за столами.</li>
        )}
      </ul>

      <p className="mt-2 text-xs text-stone-500">
        Щёлкните по гостю, затем по месту — или перетащите мышью.
        Чтобы снять с места, выберите гостя и нажмите «Снять с места».
      </p>
    </div>
  );
}
