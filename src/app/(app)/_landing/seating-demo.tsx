"use client";

/**
 * Живая рассадка прямо на титульной странице.
 *
 * Это не картинка и не видео: тот же расчёт геометрии, что в настоящем
 * редакторе (`@/lib/seating-geometry`) и те же значки молодожёнов
 * (`@/lib/couple-marks`). Продукт, в котором главное — план зала, проще
 * один раз дать потрогать, чем описать тремя абзацами.
 *
 * Данные здесь выдуманные и никуда не сохраняются: демо работает без
 * регистрации и без единого запроса на сервер.
 *
 * Планов два. Широкий — зал целиком, шесть столов в два ряда. На телефоне
 * тот же зал уменьшился бы до подписей в пять пикселей и мест, в которые
 * не попасть пальцем, поэтому там два стола в натуральную величину.
 */
import { useState, useSyncExternalStore } from "react";
import {
  fitSeatLabels,
  labelLines,
  placeSeatLabel,
  svgLineOffsets,
  seatPosition,
  shapeSize,
  tableSize,
  LABEL_LINE,
  MARK_LABEL_SHIFT,
  SEAT_RADIUS,
  type LabelFit,
  type TableGeometry,
} from "@/lib/seating-geometry";
import { markFor, MARK_RADIUS } from "@/lib/couple-marks";
import type { GuestRole } from "@/generated/prisma/enums";

type DemoTable = TableGeometry & { id: string; title: string };
type Guest = { id: string; name: string; role: GuestRole };
type Layout = { tables: DemoTable[]; guests: Guest[]; start: Record<string, string> };

/** Кегль подписей в единицах плана — как в настоящем редакторе. */
const LABEL = { base: 15, min: 11 };
/** Отступ подписи от центра места. */
const LABEL_GAP = SEAT_RADIUS + 6;
/** Радиус невидимой области нажатия: кружок места меньше пальца. */
const HIT_RADIUS = 19;

// Фамилии не длиннее восьми букв: тогда подпись у круглого стола встаёт
// в две аккуратные строки и не уходит в наклон.
const NAMES = [
  "Анна Ветрова", "Михаил Ветров", "Ирина Соколова", "Павел Крылов", "Мария Гринёва",
  "Тимур Асланов", "Ольга Литвин", "Артём Дроздов", "Елена Орлова", "Денис Морозов",
  "Ксения Белова", "Игорь Зайцев", "Софья Лебедева", "Никита Козлов", "Дарья Новикова",
  "Роман Егоров", "Алиса Фролова", "Глеб Смирнов", "Вера Павлова", "Олег Титов",
  "Полина Жукова", "Максим Волков", "Юлия Комарова", "Кирилл Попов", "Нина Сергеева",
  "Антон Быков", "Мила Кузьмина", "Егор Медведев", "Лидия Карпова", "Степан Гусев",
  "Ева Королёва", "Илья Чернов", "Злата Ершова", "Борис Тихонов", "Таисия Носова",
  "Лев Захаров", "Алина Рябова", "Фёдор Котов", "Майя Жданова", "Ян Белов",
];

const ALL_GUESTS: Guest[] = NAMES.map((name, index) => ({
  id: `g${index + 1}`,
  name,
  role: index === 0 ? "BRIDE" : index === 1 ? "GROOM" : "GUEST",
}));

/**
 * `width` — шире стандартного: у длинного стола и стола молодожёнов места
 * тогда стоят реже, и подписи встают ровно в две строки, а не в наклон.
 */
function table(
  id: string,
  title: string,
  shape: string,
  x: number,
  y: number,
  capacity: number,
  { isCouple = false, width }: { isCouple?: boolean; width?: number } = {},
): DemoTable {
  const size = isCouple ? tableSize({ shape, capacity, isCouple }) : shapeSize(shape, capacity);
  return { id, title, shape, x, y, capacity, isCouple, ...size, width: width ?? size.width };
}

/** Ключ места: стол плюс номер. */
const key = (tableId: string, index: number) => `${tableId}:${index}`;

/**
 * Начальная рассадка: гости по порядку за столы, `seated[i]` — сколько
 * человек сидит за i-м столом. Пустые места оставлены специально, чтобы
 * было куда пересаживать.
 */
function seatInOrder(tables: DemoTable[], guests: Guest[], seated: number[]): Record<string, string> {
  const start: Record<string, string> = {};
  let next = 0;
  tables.forEach((one, tableIndex) => {
    for (let index = 0; index < seated[tableIndex] && next < guests.length; index += 1) {
      start[key(one.id, index)] = guests[next].id;
      next += 1;
    }
  });
  return start;
}

// Два ряда: так зал целиком помещается в невысокий блок.
const WIDE_TABLES = [
  table("couple", "Молодожёны", "HEAD", 560, 150, 4, { isCouple: true, width: 330 }),
  table("t1", "Стол 1", "ROUND", 170, 150, 8),
  table("t3", "Стол 3", "ROUND", 950, 150, 8),
  table("t2", "Стол 2", "RECT", 560, 425, 8, { width: 300 }),
  table("t4", "Стол 4", "ROUND", 225, 425, 8),
  table("t5", "Стол 5", "ROUND", 895, 425, 8),
];

// На телефоне — стол молодожёнов и один круглый стол в натуральную
// величину: больше в ширину экрана читаемо не помещается.
const NARROW_TABLES = [
  { ...table("couple", "Молодожёны", "HEAD", 0, 0, 4, { isCouple: true, width: 220 }), height: 56 },
  table("t1", "Стол 1", "ROUND", 0, 195, 8),
];

const WIDE: Layout = {
  tables: WIDE_TABLES,
  guests: ALL_GUESTS,
  start: seatInOrder(WIDE_TABLES, ALL_GUESTS.slice(0, 36), [4, 7, 7, 7, 7, 4]),
};

const NARROW_GUESTS = ALL_GUESTS.slice(0, 14);
const NARROW: Layout = {
  tables: NARROW_TABLES,
  guests: NARROW_GUESTS,
  start: seatInOrder(NARROW_TABLES, NARROW_GUESTS.slice(0, 11), [4, 7]),
};

/** Ширина текста подписи в единицах плана — с тем же запасом, что в геометрии. */
const textWidth = (line: string, fontSize: number) => line.length * 0.58 * fontSize;

/**
 * Рамка плана по столам, местам и самым длинным подписям. Считается один
 * раз на план и по худшему случаю, поэтому не прыгает, когда гостей
 * пересаживают, и ни одна подпись не упирается в край.
 */
function planBox(tables: DemoTable[], names: string[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const one of tables) {
    grow(one.x - one.width / 2, one.y - one.height / 2);
    grow(one.x + one.width / 2, one.y + one.height / 2);

    const fit = fitSeatLabels(one, names, LABEL);
    const lines = names.map((name) => labelLines(name, fit));
    const width = Math.max(...lines.flat().map((line) => textWidth(line, fit.fontSize)));
    const height = Math.max(...lines.map((rows) => rows.length)) * fit.fontSize * LABEL_LINE;

    for (let index = 0; index < one.capacity; index += 1) {
      const seat = seatPosition(one, index);
      grow(seat.x - HIT_RADIUS, seat.y - HIT_RADIUS);
      grow(seat.x + HIT_RADIUS, seat.y + HIT_RADIUS);

      const label = placeSeatLabel(one, index, fit, LABEL_GAP + MARK_LABEL_SHIFT);
      if (label.angle) {
        const rad = (label.angle * Math.PI) / 180;
        const dir = label.align === "end" ? -1 : 1;
        grow(label.x + Math.cos(rad) * width * dir, label.y + Math.sin(rad) * width * dir);
        grow(label.x, label.y);
        continue;
      }
      const left = label.align === "start" ? label.x : label.align === "end" ? label.x - width : label.x - width / 2;
      const top = label.baseline === "top" ? label.y : label.baseline === "bottom" ? label.y - height : label.y - height / 2;
      grow(left, top);
      grow(left + width, top + height);
    }
  }

  const pad = 14;
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

const WIDE_BOX = planBox(WIDE.tables, WIDE.guests.map((guest) => guest.name));
const NARROW_BOX = planBox(NARROW.tables, NARROW.guests.map((guest) => guest.name));

const NARROW_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function SeatingDemo() {
  // На сервере ширины экрана нет — рисуем широкий план, телефон
  // переключится на свой сразу после загрузки.
  const narrow = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );

  // `key` сбрасывает рассадку при смене плана: у планов разные столы.
  return narrow ? (
    <Board key="narrow" layout={NARROW} box={NARROW_BOX} />
  ) : (
    <Board key="wide" layout={WIDE} box={WIDE_BOX} />
  );
}

function Board({ layout, box }: { layout: Layout; box: ReturnType<typeof planBox> }) {
  const [seats, setSeats] = useState<Record<string, string>>(layout.start);
  const [picked, setPicked] = useState<string | null>(null);

  const byId = new Map(layout.guests.map((guest) => [guest.id, guest]));
  const guestAt = (seatKey: string) => (seats[seatKey] ? byId.get(seats[seatKey]) ?? null : null);

  function tapSeat(seatKey: string) {
    const sitting = seats[seatKey];

    if (!picked) {
      // Пустое место без выбранного гостя ничего не делает.
      if (sitting) setPicked(sitting);
      return;
    }

    setSeats((current) => {
      const next = { ...current };
      const from = Object.keys(next).find((one) => next[one] === picked);
      if (from) delete next[from];
      // Место занято: не выгоняем чужого гостя в никуда, а меняем местами —
      // в жизни пересадка почти всегда именно такая.
      if (sitting && from) next[from] = sitting;
      else if (sitting) delete next[seatKey];
      next[seatKey] = picked;
      return next;
    });

    setPicked(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[#faf7f2]">
        <svg
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          className="block h-auto w-full touch-manipulation"
          role="img"
          aria-label="Демонстрационный план зала"
        >
          {layout.tables.map((one) => {
            const fit = fitSeatLabels(
              one,
              Array.from({ length: one.capacity }, (_, i) => guestAt(key(one.id, i))?.name ?? "").filter(Boolean),
              LABEL,
            );
            return (
              <g key={one.id}>
                {one.shape === "ROUND" ? (
                  <circle cx={one.x} cy={one.y} r={one.width / 2} fill="#fffdf9" stroke="#d8ccbb" strokeWidth="2" />
                ) : (
                  <rect
                    x={one.x - one.width / 2}
                    y={one.y - one.height / 2}
                    width={one.width}
                    height={one.height}
                    rx="10"
                    fill={one.isCouple ? "#f6eee6" : "#fffdf9"}
                    stroke={one.isCouple ? "#c9a9a0" : "#d8ccbb"}
                    strokeWidth="2"
                  />
                )}
                <text x={one.x} y={one.y + 5} textAnchor="middle" fontSize="16" fill="#7c7168">
                  {one.title}
                </text>
                {Array.from({ length: one.capacity }, (_, index) => (
                  <Seat
                    key={index}
                    table={one}
                    index={index}
                    fit={fit}
                    guest={guestAt(key(one.id, index))}
                    picked={picked}
                    onTap={() => tapSeat(key(one.id, index))}
                  />
                ))}
              </g>
            );
          })}
        </svg>
    </div>
  );
}

const PICKED = "#5e2a35";

function Seat({
  table: one,
  index,
  fit,
  guest,
  picked,
  onTap,
}: {
  table: DemoTable;
  index: number;
  fit: LabelFit;
  guest: Guest | null;
  picked: string | null;
  onTap: () => void;
}) {
  const point = seatPosition(one, index);
  const mark = guest ? markFor(guest.role) : null;
  const label = placeSeatLabel(one, index, fit, LABEL_GAP + (mark ? MARK_LABEL_SHIFT : 0));
  const selected = guest !== null && guest.id === picked;

  return (
    <g
      onClick={onTap}
      className="seat cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap();
        }
      }}
      aria-label={guest ? `${guest.name}, ${one.title}` : `Свободное место, ${one.title}`}
    >
      <circle cx={point.x} cy={point.y} r={HIT_RADIUS} fill="transparent" />
      <circle
        cx={point.x}
        cy={point.y}
        r={mark ? MARK_RADIUS : SEAT_RADIUS}
        fill={guest ? (selected ? PICKED : "#e6ddd1") : "#fffdf9"}
        stroke={selected ? PICKED : "#c9bcab"}
        strokeWidth={selected ? 3 : 1.5}
      />
      {mark?.shapes.map((shape, shapeIndex) => {
        // Здесь подложка светлая, а выбранное место — тёмное,
        // поэтому цвета фигуры меняются местами.
        const fill =
          shape.tone === "hole"
            ? selected ? PICKED : "#e6ddd1"
            : selected ? "#fffdf9" : "#5d534b";
        const opacity = shape.tone === "veil" ? 0.4 : 1;

        if (shape.kind === "circle") {
          return (
            <circle
              key={shapeIndex}
              cx={point.x + shape.cx}
              cy={point.y + shape.cy}
              r={shape.r}
              fill={fill}
              opacity={opacity}
            />
          );
        }
        return (
          <g key={shapeIndex} transform={`translate(${point.x} ${point.y})`}>
            {shape.kind === "polygon" ? (
              <polygon points={shape.points} fill={fill} opacity={opacity} />
            ) : (
              <path d={shape.d} fill={fill} opacity={opacity} />
            )}
          </g>
        );
      })}
      {guest && (
        <text
          transform={`translate(${label.x} ${label.y})${label.angle ? ` rotate(${label.angle})` : ""}`}
          textAnchor={label.align}
          fontSize={fit.fontSize}
          fill={selected ? PICKED : "#5d534b"}
          fontWeight={selected ? 600 : 400}
        >
          {labelLines(guest.name, fit).map((line, i, lines) => (
            <tspan key={i} x={0} y={svgLineOffsets(lines.length, fit.fontSize, label.baseline)[i]}>{line}</tspan>
          ))}
        </text>
      )}
    </g>
  );
}
