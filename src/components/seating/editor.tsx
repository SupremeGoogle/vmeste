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
  PLAN_HEIGHT, PLAN_WIDTH, SHAPES, SHAPE_LABEL, clampToPlan, isRound, MARK_LABEL_SHIFT,
  labelPosition, seatPosition, shortName, snap,
} from "@/lib/seating-geometry";
import { MARK_RADIUS, ROLE_LABEL, markFor } from "@/lib/couple-marks";
import type { GuestRole, TableShape as TableShapeEnum } from "@/generated/prisma/enums";
import {
  useSeating, type EditorGuest, type EditorSeat, type EditorTable,
} from "./use-seating";

type DragPayload =
  | { type: "guest"; guest: EditorGuest; fromSeatId?: string }
  | { type: "table"; tableId: string }
  | { type: "new-table"; label: string; shape: string; capacity: number };

/** Ширина плана на 100% зума — дальше зал буквально становится больше
 *  на экране (появляется горизонтальная/вертикальная прокрутка), и столы
 *  можно расставлять с бо́льшим запасом между ними. */
const BASE_PLAN_WIDTH = 860;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.2;

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
      {mark.shapes.map((shape, index) => {
        // Фигура светлая на золотом кружке; «вырез» — это тот же золотой,
        // а фата на нём же, только вполсилы.
        const fill = shape.tone === "hole" ? "#8b6f47" : "#fffdf9";
        const opacity = shape.tone === "veil" ? 0.45 : 1;

        if (shape.kind === "circle") {
          return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} opacity={opacity} />;
        }
        if (shape.kind === "polygon") {
          return <polygon key={index} points={shape.points} fill={fill} opacity={opacity} />;
        }
        return <path key={index} d={shape.d} fill={fill} opacity={opacity} />;
      })}
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
  table, selected, editing, onSelect, onPlace, onEdit,
}: {
  table: EditorTable;
  selected: EditorGuest | null;
  editing: boolean;
  onSelect: (guest: EditorGuest | null, seatId?: string) => void;
  onPlace: (seatId: string) => void;
  onEdit: (tableId: string) => void;
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
        onClick={() => onEdit(table.id)}
        title="Щёлкните, чтобы переименовать, изменить форму/вместимость или удалить"
        className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-move flex-col items-center justify-center border bg-stone-100 ${
          round ? "rounded-full" : "rounded-lg"
        } ${draggable.isDragging ? "opacity-40" : ""} ${
          editing ? "ring-2 ring-stone-900 ring-offset-2" : ""
        }`}
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

/**
 * Черновик нового стола — тащим на план, а не выбираем из меню.
 *
 * Клик без перетаскивания тоже работает: стол ставится в центр зала
 * (тот же путь, что и раньше через нижнюю форму), а перетаскивание —
 * это просто способ сразу указать, где именно.
 */
function NewTableChip({
  label, shape, capacity, disabled, onClick,
}: {
  label: string;
  shape: string;
  capacity: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const draggable = useDraggable({
    id: "new-table",
    data: { type: "new-table", label, shape, capacity } satisfies DragPayload,
    disabled,
  });

  return (
    <button
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      type="button"
      disabled={disabled}
      // Клик без перетаскивания — тот же путь, что и раньше через форму:
      // стол встаёт в центр. dnd-kit не считает это перетаскиванием, пока
      // курсор не сдвинулся дальше порога, так что onClick срабатывает
      // как обычно (тот же приём, что и у карточки гостя).
      onClick={onClick}
      className="flex shrink-0 cursor-grab select-none items-center gap-2 rounded-lg border-2 border-dashed border-stone-400 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 active:cursor-grabbing disabled:opacity-50"
      style={{ opacity: draggable.isDragging ? 0.4 : 1 }}
      title="Перетащите на план — стол встанет туда, куда его отпустите. Или просто щёлкните — встанет в центр."
    >
      <span aria-hidden>⠿</span> Новый стол — перетащите на план
    </button>
  );
}

/**
 * Панель редактирования стола: название, форма, вместимость, удаление —
 * прямо тут же, без похода в отдельную форму или настройки мероприятия.
 */
function TableEditPanel({
  table, pending, onRename, onShape, onCapacity, onDelete, onClose,
}: {
  table: EditorTable;
  pending: boolean;
  onRename: (label: string) => void;
  onShape: (shape: string) => void;
  onCapacity: (capacity: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(table.label);
  const [capacity, setCapacity] = useState(table.capacity);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const taken = table.seats.filter((s) => s.guest).length;

  return (
    <div className="mt-3 rounded-xl border border-stone-300 bg-stone-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="text-xs text-stone-500">Название стола</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label.trim() && label !== table.label && onRename(label.trim())}
            maxLength={40}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>

        <label>
          <span className="text-xs text-stone-500">Форма</span>
          <select
            value={table.shape}
            onChange={(e) => onShape(e.target.value)}
            className="mt-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            {SHAPES.map((shape) => (
              <option key={shape} value={shape}>{SHAPE_LABEL[shape]}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-stone-500">Мест</span>
          <input
            type="number" min={1} max={20}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value) || table.capacity)}
            onBlur={() => capacity !== table.capacity && onCapacity(capacity)}
            className="mt-1 w-20 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>

        {pending && <span className="pb-2 text-xs text-stone-500">Сохраняю…</span>}

        <button type="button" onClick={onClose} className="pb-2 text-sm text-stone-500 underline">
          Готово
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm">
        {confirmingDelete ? (
          <>
            <span className="text-red-800">
              Удалить стол{taken > 0 ? ` вместе с рассадкой ${taken} гостей` : ""}?
            </span>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white"
            >
              Да, удалить
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="text-stone-500 underline">
              Отмена
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg px-3 py-1.5 font-medium text-red-800 hover:bg-red-50"
          >
            Удалить стол
          </button>
        )}
      </div>
    </div>
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

  /** Насколько увеличен зал на экране (1 = базовый размер). */
  const [zoom, setZoom] = useState(1);

  /** Стол, который сейчас редактируют (название/форма/вместимость). */
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const editingTable = seating.tables.find((t) => t.id === editingTableId) ?? null;

  /** Черновик нового стола — те же поля, что раньше жили в форме внизу,
   *  теперь наполняют перетаскиваемую «фишку». */
  const [draftLabel, setDraftLabel] = useState(`Стол ${seating.tables.length + 1}`);
  const [draftShape, setDraftShape] = useState<TableShapeEnum>("ROUND");
  const [draftCapacity, setDraftCapacity] = useState(8);

  function select(guest: EditorGuest | null) {
    setSelected(guest);
  }

  function place(seatId: string) {
    if (!selected) return;
    seating.assign(seatId, selected);
    setSelected(null);
  }

  function addDraftTable(x?: number, y?: number) {
    const label = draftLabel.trim() || `Стол ${seating.tables.length + 1}`;
    seating.createTable({ label, shape: draftShape, capacity: draftCapacity, x, y });
    setDraftLabel(`Стол ${seating.tables.length + 2}`);
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

    if (payload.type === "new-table") {
      const plan = document.getElementById("seating-plan");
      const rect = plan?.getBoundingClientRect();
      // Активирующее событие несёт координаты начала перетаскивания,
      // delta — сдвиг за время жеста: вместе они и есть точка отпускания.
      const start = event.activatorEvent as { clientX?: number; clientY?: number };
      if (!rect || typeof start.clientX !== "number" || typeof start.clientY !== "number") {
        addDraftTable();
        return;
      }
      const clientX = start.clientX + event.delta.x;
      const clientY = start.clientY + event.delta.y;
      const fracX = (clientX - rect.left) / rect.width;
      const fracY = (clientY - rect.top) / rect.height;

      // Отпустили за пределами зала — не гадаем, куда хотели, ставим
      // так же, как обычный клик без перетаскивания: в центр.
      if (fracX < 0 || fracX > 1 || fracY < 0 || fracY > 1) {
        addDraftTable();
        return;
      }
      addDraftTable(snap(fracX * PLAN_WIDTH), snap(fracY * PLAN_HEIGHT));
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
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-stone-500">Размер зала:</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)))}
                disabled={zoom <= ZOOM_MIN}
                className="h-7 w-7 rounded-lg border border-stone-300 disabled:opacity-40"
                aria-label="Уменьшить зал"
              >
                −
              </button>
              <span className="w-12 text-center font-mono text-stone-600">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)))}
                disabled={zoom >= ZOOM_MAX}
                className="h-7 w-7 rounded-lg border border-stone-300 disabled:opacity-40"
                aria-label="Увеличить зал"
              >
                +
              </button>
              {zoom !== 1 && (
                <button type="button" onClick={() => setZoom(1)} className="text-stone-500 underline">
                  Сбросить
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Название стола"
                className="w-36 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
              />
              <select
                value={draftShape}
                onChange={(e) => setDraftShape(e.target.value as TableShapeEnum)}
                className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
              >
                {SHAPES.map((shape) => (
                  <option key={shape} value={shape}>{SHAPE_LABEL[shape]}</option>
                ))}
              </select>
              <input
                type="number" min={1} max={20}
                value={draftCapacity}
                onChange={(e) => setDraftCapacity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
                aria-label="Мест за новым столом"
              />
              <NewTableChip
                label={draftLabel || `Стол ${seating.tables.length + 1}`}
                shape={draftShape}
                capacity={draftCapacity}
                disabled={seating.structuralPending}
                onClick={() => addDraftTable()}
              />
            </div>
          </div>

          {/* Зал прокручивается, когда зум делает план больше контейнера —
              это и есть «увеличить зал»: больше места, чтобы расставлять
              столы просторно, без пересчёта самой геометрии плана. */}
          <div className="overflow-auto rounded-xl border border-stone-200 bg-stone-100/60 p-3">
            <div
              id="seating-plan"
              className="relative mx-auto bg-white shadow-sm"
              style={{
                width: BASE_PLAN_WIDTH * zoom,
                aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}`,
              }}
            >
              {seating.tables.map((table) => (
                <TableShape
                  key={table.id}
                  table={table}
                  selected={selected}
                  editing={editingTableId === table.id}
                  onSelect={select}
                  onPlace={place}
                  onEdit={(id) => setEditingTableId((cur) => (cur === id ? null : id))}
                />
              ))}
            </div>
          </div>

          {editingTable && (
            <TableEditPanel
              table={editingTable}
              pending={seating.structuralPending}
              onRename={(label) => seating.renameTable(editingTable.id, label)}
              onShape={(shape) => seating.setShape(editingTable.id, shape)}
              onCapacity={(capacity) => seating.setCapacity(editingTable.id, capacity)}
              onDelete={() => {
                seating.deleteTable(editingTable.id);
                setEditingTableId(null);
              }}
              onClose={() => setEditingTableId(null)}
            />
          )}

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
        {dragging?.type === "new-table" && (
          <div className="rounded-lg border-2 border-dashed border-stone-500 bg-stone-50 px-3 py-1.5 text-sm font-medium shadow-lg">
            {dragging.label || "Новый стол"}
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
