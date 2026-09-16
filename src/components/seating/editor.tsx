"use client";

/* eslint-disable react-hooks/refs -- dnd-kit отдаёт setNodeRef/listeners как свойства объекта, линтер принимает их за чтение ref во время отрисовки */

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
 *
 * Размер зала меняется мышью или пальцем за края плана. Масштаб экрана
 * при этом постоянный: зал на 1400 единиц буквально шире зала на 1000,
 * и лишнее место прокручивается. Раньше кнопки «Размер зала» только
 * увеличивали картинку, а места для столов не прибавлялось.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, pointerWithin,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  COUPLE_TABLE_LABEL, HALL_MAX, HALL_MIN, SHAPES, SHAPE_LABEL, clampToPlan, contentExtent, freeSpot, isRound,
  tableSize,
  MARK_LABEL_SHIFT, labelPosition, seatPosition, shortName, snap, type Hall, type Point,
} from "@/lib/seating-geometry";
import { MARK_RADIUS, ROLE_LABEL, markFor } from "@/lib/couple-marks";
import { COUPLE_TABLE } from "@/lib/couple-table-style";
import type { GuestRole, TableShape as TableShapeEnum } from "@/generated/prisma/enums";
import {
  useSeating, type EditorGuest, type EditorPlanState, type EditorSeat, type EditorTable, type Seating,
} from "./use-seating";
import { GuestSearch } from "./guest-search";
import { TableEditPanel } from "./table-panel";
import { SeatingList, type ListActions } from "./seating-list";
import { RingsIcon } from "./rings-icon";
import { useIsDesktop } from "./use-media";

type DragPayload =
  | { type: "guest"; guest: EditorGuest; fromSeatId?: string }
  | { type: "table"; tableId: string }
  | { type: "new-table"; label: string; shape: string; capacity: number };

/** Пикселей экрана на единицу плана: зал 1000 единиц — 860 px, как было. */
const SCALE = 0.86;
/** Поле вокруг зала, чтобы за ручки было за что ухватиться. */
const GUTTER = 24;

/**
 * Проценты округляются до трёх знаков намеренно.
 *
 * Без округления координата 724/1000 превращается в «72.39999999999999%»,
 * и сервер с клиентом иногда печатают её по-разному — React ругается
 * на расхождение гидрации и перерисовывает поддерево целиком, теряя
 * состояние редактора.
 */
const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(3)}%`;

/**
 * Место за столом.
 *
 * Кружок нарисован маленьким — иначе план перестаёт читаться, — но зона
 * нажатия вокруг него 36 пикселей: в 22-пиксельный кружок промахивается
 * даже мышь, а пальцем на планшете в него не попасть вовсе.
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
  table, seat, hall, compact, selected, onSelect, onPlace, onOpenEmpty,
}: {
  table: EditorTable;
  seat: EditorSeat;
  hall: Hall;
  /** Обзор всего зала: места точками, без подписей — иначе всё сливается. */
  compact: boolean;
  selected: EditorGuest | null;
  onSelect: (guest: EditorGuest | null) => void;
  onPlace: (seatId: string) => void;
  onOpenEmpty: (seat: EditorSeat, table: EditorTable, at: Point) => void;
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

  if (compact) {
    return (
      <span
        aria-hidden
        className={`absolute block -translate-x-1/2 -translate-y-1/2 rounded-full border ${
          seat.guest ? "border-stone-400 bg-stone-300" : "border-stone-300 bg-white"
        }`}
        style={{ left: pct(pos.x, hall.width), top: pct(pos.y, hall.height), width: 7, height: 7 }}
      />
    );
  }

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation();
    // Есть выбранный гость — ставим его сюда, даже если место занято:
    // прежний гость встанет и вернётся в список нерассаженных.
    if (selected) {
      onPlace(seat.id);
      return;
    }
    if (seat.guest) {
      // Щелчок по занятому месту выбирает гостя, чтобы перенести.
      onSelect(seat.guest);
      return;
    }
    // Пустое место — выбрать гостя из списка или вписать нового.
    onOpenEmpty(seat, table, { x: event.clientX, y: event.clientY });
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
            : "Свободное место — щёлкните, чтобы посадить гостя"
        }
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          left: pct(pos.x, hall.width),
          top: pct(pos.y, hall.height),
          width: HIT_SIZE,
          height: HIT_SIZE,
          cursor: seat.guest ? "grab" : "pointer",
          opacity: draggable.isDragging ? 0.3 : 1,
        }}
      >
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
          className={`pointer-events-none absolute z-10 -translate-x-1/2 select-none whitespace-nowrap text-[10px] ${
            role !== "GUEST" && label.y < pos.y ? "-translate-y-full" : ""
          } ${isSelected ? "font-semibold text-stone-900" : "text-stone-600"}`}
          style={{ left: pct(label.x, hall.width), top: pct(label.y, hall.height) }}
        >
          {shortName(seat.guest.displayName)}
        </span>
      )}
    </>
  );
}

function TableShape({
  table, hall, compact, selected, editing, onSelect, onPlace, onEdit, onOpenEmpty,
}: {
  table: EditorTable;
  hall: Hall;
  compact: boolean;
  selected: EditorGuest | null;
  editing: boolean;
  onSelect: (guest: EditorGuest | null) => void;
  onPlace: (seatId: string) => void;
  onEdit: (tableId: string) => void;
  onOpenEmpty: (seat: EditorSeat, table: EditorTable, at: Point) => void;
}) {
  const draggable = useDraggable({
    id: `table:${table.id}`,
    data: { type: "table", tableId: table.id } satisfies DragPayload,
  });

  const round = isRound(table.shape) && !table.isCouple;
  const taken = table.seats.filter((seat) => seat.guest).length;

  return (
    <>
      <div
        ref={draggable.setNodeRef}
        {...draggable.listeners}
        {...draggable.attributes}
        onClick={(event) => {
          event.stopPropagation();
          onEdit(table.id);
        }}
        title="Щёлкните, чтобы изменить стол; перетащите, чтобы передвинуть"
        className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-move flex-col items-center justify-center ${
          round ? "rounded-full" : table.isCouple ? "rounded-2xl" : "rounded-lg"
        } ${draggable.isDragging ? "opacity-40" : ""} ${
          editing ? "ring-2 ring-stone-900 ring-offset-2" : ""
        }`}
        style={{
          left: pct(table.x, hall.width),
          top: pct(table.y, hall.height),
          width: pct(table.width, hall.width),
          height: pct(table.height, hall.height),
          ...(table.isCouple
            ? {
                background: COUPLE_TABLE.fill,
                border: `3px solid ${COUPLE_TABLE.stroke}`,
                boxShadow: "0 6px 18px -8px rgba(176, 141, 87, 0.55)",
              }
            : { background: "#f5f5f4", border: "1px solid #d6cec2" }),
        }}
      >
        {table.isCouple && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[5px] rounded-xl"
            style={{ border: `1px solid ${COUPLE_TABLE.innerStroke}` }}
          />
        )}
        {table.isCouple && !compact && <RingsIcon size={20} />}
        <span
          className={`select-none truncate px-1 font-semibold ${compact ? "text-[9px]" : "text-xs"}`}
          style={{ color: table.isCouple ? COUPLE_TABLE.text : "#44403c", maxWidth: "100%" }}
        >
          {table.label}
        </span>
        {!compact && (
          <span className="select-none text-[10px] text-stone-500">
            {taken}/{table.capacity}
          </span>
        )}
      </div>

      {table.seats.map((seat) => (
        <SeatDot
          key={seat.id}
          table={table}
          seat={seat}
          hall={hall}
          compact={compact}
          selected={selected}
          onSelect={onSelect}
          onPlace={onPlace}
          onOpenEmpty={onOpenEmpty}
        />
      ))}
    </>
  );
}

/**
 * Черновик нового стола — тащим на план. Щелчок без перетаскивания ставит
 * стол в центр видимой части зала: dnd-kit не считает щелчок
 * перетаскиванием, пока курсор не сдвинулся дальше порога.
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
      onClick={onClick}
      className="flex shrink-0 cursor-grab select-none items-center gap-2 rounded-lg border-2 border-dashed border-stone-400 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 active:cursor-grabbing disabled:opacity-50"
      style={{ opacity: draggable.isDragging ? 0.4 : 1 }}
      title="Перетащите на план — стол встанет туда, куда отпустите. Или щёлкните — встанет в центр видимой части зала."
    >
      <span aria-hidden>⠿</span> Новый стол — перетащите на план
    </button>
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

// ─── Размер зала ────────────────────────────────────────────────

type Edges = { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean };
type ResizePreview = { hall: Hall; shift: Point };

const HANDLES: { edges: Edges; className: string; cursor: string; label: string }[] = [
  { edges: { right: true }, className: "top-0 bottom-0 -right-3 w-6 pointer-coarse:-right-5 pointer-coarse:w-10", cursor: "ew-resize", label: "Растянуть зал вправо" },
  { edges: { left: true }, className: "top-0 bottom-0 -left-3 w-6 pointer-coarse:-left-5 pointer-coarse:w-10", cursor: "ew-resize", label: "Растянуть зал влево" },
  { edges: { bottom: true }, className: "left-0 right-0 -bottom-3 h-6 pointer-coarse:-bottom-5 pointer-coarse:h-10", cursor: "ns-resize", label: "Растянуть зал вниз" },
  { edges: { top: true }, className: "left-0 right-0 -top-3 h-6 pointer-coarse:-top-5 pointer-coarse:h-10", cursor: "ns-resize", label: "Растянуть зал вверх" },
  { edges: { right: true, bottom: true }, className: "-right-3 -bottom-3 h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 pointer-coarse:-right-5 pointer-coarse:-bottom-5", cursor: "nwse-resize", label: "Растянуть зал по диагонали" },
  { edges: { left: true, top: true }, className: "-left-3 -top-3 h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 pointer-coarse:-left-5 pointer-coarse:-top-5", cursor: "nwse-resize", label: "Растянуть зал по диагонали" },
  { edges: { right: true, top: true }, className: "-right-3 -top-3 h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 pointer-coarse:-right-5 pointer-coarse:-top-5", cursor: "nesw-resize", label: "Растянуть зал по диагонали" },
  { edges: { left: true, bottom: true }, className: "-left-3 -bottom-3 h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 pointer-coarse:-left-5 pointer-coarse:-bottom-5", cursor: "nesw-resize", label: "Растянуть зал по диагонали" },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Новый размер зала по сдвигу ручки.
 *
 * Правая и нижняя стены просто уходят дальше. Левая и верхняя — растят
 * зал в свою сторону, поэтому все столы сдвигаются на ту же величину:
 * иначе растянутый влево зал утащил бы столы вместе с началом координат.
 * Ужать зал можно только до занятой столами области.
 */
function resizeFrom(start: Hall, edges: Edges, delta: Point, tables: EditorTable[]): ResizePreview {
  const extent = contentExtent(tables) ?? { left: Infinity, top: Infinity, right: 0, bottom: 0 };
  let { width, height } = start;
  const shift = { x: 0, y: 0 };

  if (edges.right) {
    width = clamp(snap(start.width + delta.x), Math.max(HALL_MIN.width, Math.ceil(extent.right)), HALL_MAX.width);
  }
  if (edges.left) {
    const grow = clamp(
      snap(-delta.x),
      Math.max(HALL_MIN.width - start.width, -Math.floor(extent.left)),
      HALL_MAX.width - start.width,
    );
    width = start.width + grow;
    shift.x = grow;
  }
  if (edges.bottom) {
    height = clamp(snap(start.height + delta.y), Math.max(HALL_MIN.height, Math.ceil(extent.bottom)), HALL_MAX.height);
  }
  if (edges.top) {
    const grow = clamp(
      snap(-delta.y),
      Math.max(HALL_MIN.height - start.height, -Math.floor(extent.top)),
      HALL_MAX.height - start.height,
    );
    height = start.height + grow;
    shift.y = grow;
  }

  return { hall: { width, height }, shift };
}

// ─── Редактор ───────────────────────────────────────────────────

type EmptySeatTarget = { seat: EditorSeat; table: EditorTable; at: Point };

export function SeatingEditor({
  eventId,
  initial,
  actions,
}: {
  eventId: string;
  initial: EditorPlanState & { version: number };
  actions: ListActions;
}) {
  const seating = useSeating(eventId, initial);
  const isDesktop = useIsDesktop();

  const [dragging, setDragging] = useState<DragPayload | null>(null);

  /** Выбранный гость: «выбрать и поставить» — второй способ работы,
   *  единственный надёжный на тач-экране. */
  const [selected, setSelected] = useState<EditorGuest | null>(null);

  /** Стол, который сейчас редактируют. */
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const editingTable = seating.tables.find((t) => t.id === editingTableId) ?? null;

  /** Пустое место, для которого открыт поиск гостя. */
  const [emptySeat, setEmptySeat] = useState<EmptySeatTarget | null>(null);

  /** Телефон: открыт ли список нерассаженных и форма нового стола. */
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [newTableOpen, setNewTableOpen] = useState(false);

  /** Обзор всего зала целиком — на телефоне без него не понять, где что. */
  const [overview, setOverview] = useState(false);

  /** Черновик нового стола. Пустое название — подставится «Стол N». */
  const [draftLabel, setDraftLabel] = useState("");
  const [draftShape, setDraftShape] = useState<TableShapeEnum>("ROUND");
  const [draftCapacity, setDraftCapacity] = useState("8");
  const draftCapacityValue = Number(draftCapacity);
  const draftCapacityValid = /^\d+$/.test(draftCapacity) && draftCapacityValue >= 1 && draftCapacityValue <= 20;

  const coupleTable = seating.tables.find((t) => t.isCouple) ?? null;

  /** Стол молодожёнов только что создан — открыть его панель, когда придёт из базы. */
  const [openCoupleWhenReady, setOpenCoupleWhenReady] = useState(false);
  if (openCoupleWhenReady && coupleTable) {
    setOpenCoupleWhenReady(false);
    setEditingTableId(coupleTable.id);
  }

  const [resize, setResize] = useState<ResizePreview | null>(null);
  const resizeStart = useRef<{ pointer: Point; hall: Hall; edges: Edges } | null>(null);

  const hall = resize?.hall ?? seating.hall;
  const shift = resize?.shift ?? { x: 0, y: 0 };
  const tables =
    shift.x || shift.y
      ? seating.tables.map((t) => ({ ...t, x: t.x + shift.x, y: t.y + shift.y }))
      : seating.tables;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setViewportWidth(node.clientWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fitScale = viewportWidth > 0 ? Math.min(SCALE, (viewportWidth - GUTTER * 2) / hall.width) : SCALE;
  const scale = overview ? fitScale : SCALE;

  function autoLabel(): string {
    const used = new Set(seating.tables.map((t) => t.label));
    let n = seating.tables.filter((t) => !t.isCouple).length + 1;
    while (used.has(`Стол ${n}`)) n += 1;
    return `Стол ${n}`;
  }

  /** Центр видимой части зала в единицах плана: туда встаёт новый стол. */
  function visibleCenter(): Point {
    const node = scrollRef.current;
    if (!node) return { x: seating.hall.width / 2, y: seating.hall.height / 2 };
    return {
      x: clamp((node.scrollLeft + node.clientWidth / 2 - GUTTER) / scale, 0, seating.hall.width),
      y: clamp((node.scrollTop + node.clientHeight / 2 - GUTTER) / scale, 0, seating.hall.height),
    };
  }

  function addDraftTable(at?: Point) {
    if (!draftCapacityValid) return;
    const label = draftLabel.trim() || autoLabel();
    // Щелчок без перетаскивания — ближайшее свободное место у центра экрана,
    // а не поверх стола, который там уже стоит.
    const geometry = { shape: draftShape, capacity: draftCapacityValue };
    const point =
      at ?? freeSpot({ ...geometry, ...tableSize(geometry) }, seating.tables, seating.hall, visibleCenter());
    void seating
      .createTable({ label, shape: draftShape, capacity: draftCapacityValue, x: snap(point.x), y: snap(point.y) })
      .then((outcome) => {
        if (outcome.ok) {
          setDraftLabel("");
          setNewTableOpen(false);
        }
      });
  }

  function addCoupleTable() {
    setOpenCoupleWhenReady(true);
    void seating.createCoupleTable(2).then((outcome) => {
      if (!outcome.ok) setOpenCoupleWhenReady(false);
    });
  }

  function select(guest: EditorGuest | null) {
    setSelected(guest);
    setEmptySeat(null);
    if (guest && !isDesktop) setGuestsOpen(false);
  }

  function place(seatId: string) {
    if (!selected) return;
    seating.assign(seatId, selected);
    setSelected(null);
  }

  function editTable(id: string) {
    setEmptySeat(null);
    setGuestsOpen(false);
    setEditingTableId((current) => (current === id ? null : id));
  }

  function openEmpty(seat: EditorSeat, table: EditorTable, at: Point) {
    setEditingTableId(null);
    setGuestsOpen(false);
    setEmptySeat({ seat, table, at });
  }

  /**
   * Зал по размеру столов. Растянуть зал легко, а ужимать руками до
   * крайнего стола — долго: пустая половина плана так и остаётся и в
   * распечатке, и на плане для гостя.
   */
  function fitHall() {
    const extent = contentExtent(seating.tables);
    if (!extent) return;
    const margin = 60;
    const width = Math.min(HALL_MAX.width, Math.max(HALL_MIN.width, Math.ceil((extent.right - extent.left + margin * 2) / 10) * 10));
    const height = Math.min(HALL_MAX.height, Math.max(HALL_MIN.height, Math.ceil((extent.bottom - extent.top + margin * 2) / 10) * 10));
    // Столы встают с отступом от левой и верхней стены; если зал упёрся
    // в минимум, лишнее место делится поровну по краям.
    const shift = {
      x: Math.round(margin - extent.left + (width - (extent.right - extent.left + margin * 2)) / 2),
      y: Math.round(margin - extent.top + (height - (extent.bottom - extent.top + margin * 2)) / 2),
    };
    if (width === seating.hall.width && height === seating.hall.height && shift.x === 0 && shift.y === 0) return;
    seating.resizeHall({ width, height }, shift);
  }

  // ── ручки размера зала ──
  function onHandleDown(event: ReactPointerEvent<HTMLDivElement>, edges: Edges) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { pointer: { x: event.clientX, y: event.clientY }, hall: seating.hall, edges };
    setResize({ hall: seating.hall, shift: { x: 0, y: 0 } });
  }

  function onHandleMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = resizeStart.current;
    if (!start) return;
    const delta = {
      x: (event.clientX - start.pointer.x) / scale,
      y: (event.clientY - start.pointer.y) / scale,
    };
    setResize(resizeFrom(start.hall, start.edges, delta, seating.tables));
  }

  function onHandleUp() {
    const start = resizeStart.current;
    resizeStart.current = null;
    const preview = resize;
    setResize(null);
    if (!start || !preview) return;
    if (preview.hall.width === start.hall.width && preview.hall.height === start.hall.height) return;
    seating.resizeHall(preview.hall, preview.shift);
  }

  const sensors = useSensors(
    // 6 пикселей: иначе обычный щелчок по гостю считается перетаскиванием.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Задержка на тач-устройствах — чтобы страница осталась прокручиваемой.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function onDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current as DragPayload) ?? null);
    setEmptySeat(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const payload = event.active.data.current as DragPayload | undefined;
    setDragging(null);
    if (!payload) return;

    const plan = document.getElementById("seating-plan");
    const rect = plan?.getBoundingClientRect();

    if (payload.type === "table") {
      const table = seating.tables.find((t) => t.id === payload.tableId);
      if (!table || !rect) return;

      // delta приходит в пикселях экрана — переводим в единицы плана.
      const next = clampToPlan(
        table,
        {
          x: snap(table.x + (event.delta.x / rect.width) * seating.hall.width),
          y: snap(table.y + (event.delta.y / rect.height) * seating.hall.height),
        },
        seating.hall,
      );
      if (next.x === table.x && next.y === table.y) return;
      seating.moveTable(table.id, next.x, next.y);
      return;
    }

    if (payload.type === "new-table") {
      // Активирующее событие несёт координаты начала перетаскивания,
      // delta — сдвиг за время жеста: вместе они и есть точка отпускания.
      const start = event.activatorEvent as { clientX?: number; clientY?: number };
      if (!rect || typeof start.clientX !== "number" || typeof start.clientY !== "number") {
        addDraftTable();
        return;
      }
      const fracX = (start.clientX + event.delta.x - rect.left) / rect.width;
      const fracY = (start.clientY + event.delta.y - rect.top) / rect.height;

      // Отпустили за пределами зала — ставим, как по щелчку.
      if (fracX < 0 || fracX > 1 || fracY < 0 || fracY > 1) {
        addDraftTable();
        return;
      }
      addDraftTable({ x: fracX * seating.hall.width, y: fracY * seating.hall.height });
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

  const planWidth = hall.width * scale;
  const planHeight = hall.height * scale;

  const draftFields = (
    <>
      <input
        value={draftLabel}
        onChange={(e) => setDraftLabel(e.target.value)}
        placeholder={autoLabel()}
        maxLength={40}
        aria-label="Название нового стола"
        className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-base sm:w-36 sm:py-1.5 sm:text-sm"
      />
      <select
        value={draftShape}
        onChange={(e) => setDraftShape(e.target.value as TableShapeEnum)}
        aria-label="Форма нового стола"
        className="rounded-lg border border-stone-300 px-2.5 py-2 text-base sm:py-1.5 sm:text-sm"
      >
        {SHAPES.map((shape) => (
          <option key={shape} value={shape}>{SHAPE_LABEL[shape]}</option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-sm text-stone-500">
        мест
        <input
          value={draftCapacity}
          onChange={(e) => setDraftCapacity(e.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          aria-label="Мест за новым столом"
          aria-invalid={!draftCapacityValid}
          className={`w-14 rounded-lg border px-2.5 py-2 text-base text-stone-900 sm:py-1.5 sm:text-sm ${
            draftCapacityValid ? "border-stone-300" : "border-red-400"
          }`}
        />
      </label>
    </>
  );

  const coupleButton = (
    <button
      type="button"
      onClick={addCoupleTable}
      disabled={Boolean(coupleTable) || openCoupleWhenReady}
      title={coupleTable ? "Стол молодожёнов уже есть — щёлкните по нему на плане" : "Добавить стол молодожёнов"}
      className="flex shrink-0 items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium disabled:opacity-45"
      style={{ borderColor: COUPLE_TABLE.stroke, color: COUPLE_TABLE.text, background: COUPLE_TABLE.fill }}
    >
      <RingsIcon /> {COUPLE_TABLE_LABEL}
    </button>
  );

  return (
    <DndContext
      // Явный id обязателен: без него dnd-kit нумерует служебные
      // идентификаторы сквозным счётчиком, и сервер с клиентом расходятся.
      id="seating"
      sensors={sensors}
      // Попадание по КУРСОРУ, а не по габаритам карточки: широкая карточка
      // с именем перекрывает сразу несколько мест.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col gap-6 pb-24 lg:flex-row lg:pb-0">
        <div className="min-w-0 lg:flex-1">
          {/* Панель: на компьютере поля нового стола, на телефоне две кнопки. */}
          <div className="mb-3 hidden flex-wrap items-center gap-2 lg:flex">
            {draftFields}
            <NewTableChip
              label={draftLabel.trim() || autoLabel()}
              shape={draftShape}
              capacity={draftCapacityValue}
              disabled={!draftCapacityValid}
              onClick={() => addDraftTable()}
            />
            {coupleButton}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setNewTableOpen((open) => !open);
                setEditingTableId(null);
              }}
              className="rounded-lg border-2 border-dashed border-stone-400 bg-stone-50 px-4 py-2 text-sm font-medium"
            >
              + Стол
            </button>
            {coupleButton}
          </div>

          {newTableOpen && !isDesktop && (
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-stone-200 bg-white p-3">
              <div className="col-span-2 flex flex-wrap items-center gap-2">{draftFields}</div>
              <button
                type="button"
                onClick={() => addDraftTable()}
                disabled={!draftCapacityValid}
                className="col-span-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50"
              >
                Поставить в центр экрана
              </button>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-stone-500">
            <span>
              Зал {Math.round(hall.width)} × {Math.round(hall.height)} — тяните за края, чтобы изменить размер
            </span>
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={fitHall}
                disabled={seating.tables.length === 0}
                title="Убрать пустое место вокруг столов"
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-stone-600 disabled:opacity-40"
              >
                Подогнать под столы
              </button>
              <button
                type="button"
                onClick={() => setOverview((v) => !v)}
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-stone-600"
              >
                {overview ? "Обычный масштаб" : "Весь зал"}
              </button>
            </span>
          </div>

          <div
            ref={scrollRef}
            className="relative max-h-[65vh] overflow-auto rounded-xl border border-stone-200 bg-stone-100/60 lg:max-h-[80vh]"
          >
            <div style={{ width: planWidth + GUTTER * 2, height: planHeight + GUTTER * 2, padding: GUTTER }}>
              <div
                id="seating-plan"
                className={`relative bg-white shadow-sm ${resize ? "ring-2 ring-stone-400" : ""}`}
                style={{ width: planWidth, height: planHeight }}
                onClick={() => {
                  // Щелчок по пустому залу закрывает панели.
                  setEditingTableId(null);
                  setEmptySeat(null);
                }}
              >
                <div className={overview ? "pointer-events-none" : ""}>
                  {tables.map((table) => (
                    <TableShape
                      key={table.id}
                      table={table}
                      hall={hall}
                      compact={overview}
                      selected={selected}
                      editing={editingTableId === table.id}
                      onSelect={select}
                      onPlace={place}
                      onEdit={editTable}
                      onOpenEmpty={openEmpty}
                    />
                  ))}
                </div>

                {overview && (
                  <button
                    type="button"
                    aria-label="Вернуть обычный масштаб"
                    className="absolute inset-0 z-20 cursor-zoom-in"
                    onClick={(event) => {
                      event.stopPropagation();
                      // Возвращаемся к обычному масштабу у того места, куда нажали.
                      const rect = event.currentTarget.getBoundingClientRect();
                      const fx = (event.clientX - rect.left) / rect.width;
                      const fy = (event.clientY - rect.top) / rect.height;
                      setOverview(false);
                      requestAnimationFrame(() => {
                        const node = scrollRef.current;
                        if (!node) return;
                        node.scrollTo({
                          left: fx * hall.width * SCALE + GUTTER - node.clientWidth / 2,
                          top: fy * hall.height * SCALE + GUTTER - node.clientHeight / 2,
                        });
                      });
                    }}
                  />
                )}

                {!overview &&
                  HANDLES.map((handle) => (
                    <div
                      key={handle.label + handle.className}
                      role="separator"
                      aria-label={handle.label}
                      title={handle.label}
                      onPointerDown={(event) => onHandleDown(event, handle.edges)}
                      onPointerMove={onHandleMove}
                      onPointerUp={onHandleUp}
                      onPointerCancel={onHandleUp}
                      onClick={(event) => event.stopPropagation()}
                      className={`group absolute z-30 flex items-center justify-center ${handle.className}`}
                      style={{ cursor: handle.cursor, touchAction: "none" }}
                    >
                      <span
                        className={`rounded-full bg-stone-400 opacity-60 transition group-hover:bg-stone-700 group-hover:opacity-100 ${
                          handle.edges.left || handle.edges.right
                            ? handle.edges.top || handle.edges.bottom
                              ? "h-3 w-3"
                              : "h-10 w-1.5"
                            : "h-1.5 w-10"
                        }`}
                      />
                    </div>
                  ))}

                {resize && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-stone-900 px-3 py-1.5 font-mono text-sm text-white">
                    {Math.round(hall.width)} × {Math.round(hall.height)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {editingTable && isDesktop && (
            <div className="mt-3 rounded-xl border border-stone-300 bg-stone-50 p-4">
              <TableEditPanel
                key={editingTable.id}
                table={editingTable}
                seating={seating}
                onClose={() => setEditingTableId(null)}
              />
            </div>
          )}

          <StatusBar seating={seating} />
        </div>

        {isDesktop && (
          <div className="lg:w-72">
            <UnseatedPanel seating={seating} selected={selected} onSelect={select} />
          </div>
        )}
      </div>

      <SeatingList seating={seating} actions={actions} eventId={eventId} />

      {/* ── Телефон: панели выезжают снизу ── */}
      {!isDesktop && editingTable && (
        <BottomSheet onClose={() => setEditingTableId(null)}>
          <TableEditPanel
            key={editingTable.id}
            table={editingTable}
            seating={seating}
            onClose={() => setEditingTableId(null)}
          />
        </BottomSheet>
      )}

      {!isDesktop && guestsOpen && (
        <BottomSheet onClose={() => setGuestsOpen(false)}>
          <UnseatedPanel seating={seating} selected={selected} onSelect={select} />
        </BottomSheet>
      )}

      {!isDesktop && !editingTable && !guestsOpen && !emptySeat && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.2)] backdrop-blur">
          {selected ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <b>{selected.displayName}</b> — нажмите на место
              </span>
              <button type="button" onClick={() => setSelected(null)} className="shrink-0 px-2 py-1 underline">
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setGuestsOpen(true)}
                className="flex-1 rounded-lg bg-stone-900 px-4 py-2.5 text-left text-sm text-white"
              >
                Не рассажено: {seating.unseated.length} ▴
              </button>
              <StatusText seating={seating} />
            </div>
          )}
        </div>
      )}

      {emptySeat && (
        <EmptySeatPicker
          target={emptySeat}
          seating={seating}
          isDesktop={isDesktop}
          onClose={() => setEmptySeat(null)}
        />
      )}

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

/** Выезжающая снизу панель для телефона. */
function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-stone-900/20"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300" aria-hidden />
        {children}
      </div>
    </>
  );
}

/**
 * Поиск гостя для свободного места. На компьютере — карточка у курсора,
 * на телефоне — панель снизу, чтобы клавиатура не закрыла список.
 */
function EmptySeatPicker({
  target, seating, isDesktop, onClose,
}: {
  target: EmptySeatTarget;
  seating: Seating;
  isDesktop: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const seatLabel =
    target.table.isCouple && target.seat.index < 2
      ? target.seat.index === 0 ? "место невесты" : "место жениха"
      : `место ${target.seat.index + 1}`;

  const body = (
    <div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {target.table.label}, {seatLabel}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg text-stone-500 hover:bg-stone-100"
        >
          ×
        </button>
      </div>
      <GuestSearch
        guests={seating.unseated}
        autoFocus={isDesktop}
        busy={busy}
        placeholder="Найти или вписать нового"
        onCancel={onClose}
        onPick={(guest) => {
          seating.assign(target.seat.id, guest);
          onClose();
        }}
        onCreate={(name) => {
          setBusy(true);
          void seating.createGuest(name, target.seat.id).then((outcome) => {
            setBusy(false);
            if (outcome.ok) onClose();
          });
        }}
      />
    </div>
  );

  if (!isDesktop) return <BottomSheet onClose={onClose}>{body}</BottomSheet>;

  const width = 300;
  const left = Math.min(target.at.x + 12, window.innerWidth - width - 12);
  const top = Math.min(target.at.y + 12, window.innerHeight - 380);

  return (
    <>
      <button type="button" aria-label="Закрыть" onClick={onClose} className="fixed inset-0 z-40 cursor-default" />
      <div
        className="fixed z-50 rounded-xl border border-stone-200 bg-white p-3 shadow-xl"
        style={{ left, top: Math.max(12, top), width }}
      >
        {body}
      </div>
    </>
  );
}

function StatusText({ seating }: { seating: Seating }) {
  if (seating.status.kind === "saving") return <span className="text-xs text-stone-500">Сохраняем…</span>;
  if (seating.status.kind === "idle") return <span className="text-xs text-stone-400">Сохранено</span>;
  return <span className="text-xs text-red-700">Ошибка</span>;
}

function StatusBar({ seating }: { seating: Seating }) {
  return (
    <div className="mt-3 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <button
        type="button"
        onClick={seating.undo}
        disabled={!seating.canUndo}
        className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
      >
        Отменить
      </button>

      {seating.status.kind === "saving" && <span className="text-stone-500">Сохраняем…</span>}
      {seating.status.kind === "idle" && <span className="text-stone-400">Всё сохранено</span>}

      {seating.status.kind === "error" && (
        <span className="text-red-700">{seating.status.message}</span>
      )}

      {seating.status.kind === "conflict" && (
        <span className="rounded-lg bg-amber-50 px-3 py-1 text-amber-900">{seating.status.message}</span>
      )}
    </div>
  );
}

function UnseatedPanel({
  seating, selected, onSelect,
}: {
  seating: Seating;
  selected: EditorGuest | null;
  onSelect: (guest: EditorGuest | null) => void;
}) {
  const guests = seating.unseated;
  const { setNodeRef, isOver } = useDroppable({ id: "unseated" });
  const selectedIsSeated = selected && !guests.some((g) => g.id === selected.id);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function unseat(guest: EditorGuest) {
    const seat = seating.tables.flatMap((table) => table.seats).find((s) => s.guest?.id === guest.id);
    if (seat) seating.clear(seat.id);
    onSelect(null);
  }

  return (
    <div>
      <p className="text-sm font-medium">
        Не рассажено: <span className="text-stone-500">{guests.length}</span>
      </p>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed || busy) return;
          setBusy(true);
          void seating.createGuest(trimmed).then((outcome) => {
            setBusy(false);
            if (outcome.ok) setName("");
          });
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новый гость"
          maxLength={120}
          aria-label="Имя нового гостя"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base sm:py-1.5 sm:text-sm"
        />
        <button
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-40 sm:py-1.5"
        >
          Добавить
        </button>
      </form>

      {selected && (
        <div className="mt-3 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white">
          <p className="font-medium">{selected.displayName}</p>
          <p className="mt-0.5 text-xs text-stone-300">Щёлкните по месту на плане, чтобы посадить.</p>
          <div className="mt-2 flex gap-3 text-xs">
            {selectedIsSeated && (
              <button type="button" onClick={() => unseat(selected)} className="underline">
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
        className={`mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto rounded-xl border p-2 lg:max-h-[32rem] ${
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
        Щёлкните по гостю, затем по месту — или перетащите мышью. По свободному
        месту можно щёлкнуть сразу и вписать имя.
      </p>
    </div>
  );
}
