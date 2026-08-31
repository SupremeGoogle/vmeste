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
 */
import { useState } from "react";
import {
  labelPosition,
  seatPosition,
  shapeSize,
  shortName,
  MARK_LABEL_SHIFT,
  SEAT_RADIUS,
  type TableGeometry,
} from "@/lib/seating-geometry";
import { markFor, MARK_RADIUS } from "@/lib/couple-marks";
import type { GuestRole } from "@/generated/prisma/enums";

type DemoTable = TableGeometry & { id: string; title: string };

const TABLES: DemoTable[] = [
  { id: "t1", title: "Стол 1", shape: "ROUND", x: 250, y: 330, capacity: 8, ...shapeSize("ROUND", 8) },
  { id: "t2", title: "Стол 2", shape: "RECT", x: 700, y: 350, capacity: 6, ...shapeSize("RECT", 6) },
  { id: "t3", title: "Президиум", shape: "HEAD", x: 500, y: 110, capacity: 4, ...shapeSize("HEAD", 4) },
];

type Guest = { id: string; name: string; role: GuestRole };

const GUESTS: Guest[] = [
  { id: "g1", name: "Анна Ветрова", role: "BRIDE" },
  { id: "g2", name: "Михаил Ветров", role: "GROOM" },
  { id: "g3", name: "Ирина Соколова", role: "GUEST" },
  { id: "g4", name: "Павел Крылов", role: "GUEST" },
  { id: "g5", name: "Мария Гринёва", role: "GUEST" },
  { id: "g6", name: "Тимур Асланов", role: "GUEST" },
  { id: "g7", name: "Ольга Литвин", role: "GUEST" },
  { id: "g8", name: "Артём Дроздов", role: "GUEST" },
];

/** Ключ места: стол плюс номер. */
const key = (tableId: string, index: number) => `${tableId}:${index}`;

const START: Record<string, string> = {
  "t3:0": "g1",
  "t3:1": "g2",
  "t1:0": "g3",
  "t1:2": "g4",
  "t1:5": "g5",
  "t2:1": "g6",
  "t2:4": "g7",
};

export function SeatingDemo() {
  const [seats, setSeats] = useState<Record<string, string>>(START);
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState("Возьмите гостя и посадите на свободное место.");

  const guestAt = (seatKey: string) => GUESTS.find((guest) => guest.id === seats[seatKey]) ?? null;
  const seatOf = (guestId: string) =>
    Object.keys(seats).find((seatKey) => seats[seatKey] === guestId) ?? null;
  const unseated = GUESTS.filter((guest) => !seatOf(guest.id));

  function tapSeat(seatKey: string) {
    const sitting = seats[seatKey];

    if (!picked) {
      if (!sitting) {
        setHint("Это место свободно. Сначала выберите гостя.");
        return;
      }
      setPicked(sitting);
      setHint("Теперь ткните в свободное место — или в занятое, гости поменяются местами.");
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
    setHint("Готово. В настоящей панели это же движение делается мышью.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-6">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
        {/* Поле обрезано по столам: полная сетка 1000×700 рассчитана на зал
            целиком, а в трёх столах нижняя треть осталась бы пустой. */}
        <svg viewBox="0 0 1000 480" className="w-full touch-manipulation" role="img" aria-label="Демонстрационный план зала">
          <rect width="1000" height="480" fill="#faf7f2" />

          {TABLES.map((table) => (
            <g key={table.id}>
              {table.shape === "ROUND" ? (
                <circle cx={table.x} cy={table.y} r={table.width / 2} fill="#fffdf9" stroke="#d8ccbb" strokeWidth="2" />
              ) : (
                <rect
                  x={table.x - table.width / 2}
                  y={table.y - table.height / 2}
                  width={table.width}
                  height={table.height}
                  rx="10"
                  fill="#fffdf9"
                  stroke="#d8ccbb"
                  strokeWidth="2"
                />
              )}
              <text x={table.x} y={table.y + 5} textAnchor="middle" fontSize="17" fill="#7c7168">
                {table.title}
              </text>

              {Array.from({ length: table.capacity }, (_, index) => {
                const seatKey = key(table.id, index);
                const point = seatPosition(table, index);
                const guest = guestAt(seatKey);
                const mark = guest ? markFor(guest.role) : null;
                const label = labelPosition(table, point, mark ? MARK_LABEL_SHIFT : 0);
                const selected = guest !== null && guest.id === picked;

                return (
                  <g
                    key={seatKey}
                    onClick={() => tapSeat(seatKey)}
                    className="seat cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        tapSeat(seatKey);
                      }
                    }}
                    aria-label={guest ? `${guest.name}, ${table.title}` : `Свободное место, ${table.title}`}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={mark ? MARK_RADIUS : SEAT_RADIUS}
                      fill={guest ? (selected ? "#8b6f47" : "#e6ddd1") : "#fffdf9"}
                      stroke={selected ? "#8b6f47" : "#c9bcab"}
                      strokeWidth={selected ? 3 : 1.5}
                    />
                    {mark?.petals?.map((petal, petalIndex) => (
                      <circle
                        key={petalIndex}
                        cx={point.x + petal.x}
                        cy={point.y + petal.y}
                        r={petal.r}
                        fill={selected ? "#fffdf9" : "#8b6f47"}
                      />
                    ))}
                    {mark?.bow && (
                      <g transform={`translate(${point.x} ${point.y})`} fill={selected ? "#fffdf9" : "#5d534b"}>
                        <polygon points={mark.bow.left} />
                        <polygon points={mark.bow.right} />
                        <circle cx={mark.bow.knot.x} cy={mark.bow.knot.y} r={mark.bow.knot.r} />
                      </g>
                    )}
                    {guest && (
                      <text x={label.x} y={label.y} textAnchor="middle" fontSize="15" fill="#5d534b">
                        {shortName(guest.name)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div>
        <p className="text-sm text-stone-500">Не за столом</p>
        {/* На телефоне гости выстраиваются в ленту: вертикальный список
            из восьми имён отодвинул бы подсказку за нижний край. */}
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:space-y-2 lg:overflow-visible">
          {unseated.length === 0 && <li className="text-sm text-stone-500">Все на местах.</li>}
          {unseated.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => {
                  setPicked(guest.id);
                  setHint("Теперь ткните в свободное место на плане.");
                }}
                className={`w-full shrink-0 rounded-lg border px-3 py-2 text-left text-sm whitespace-nowrap transition-colors ${
                  picked === guest.id
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white hover:border-stone-400"
                }`}
              >
                {guest.name}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-lg bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
          {hint}
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-stone-600">
          <span className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true">
              <circle r="9" fill="#e6ddd1" />
              {markFor("BRIDE")?.petals?.map((petal, index) => (
                <circle key={index} cx={petal.x} cy={petal.y} r={petal.r} fill="#8b6f47" />
              ))}
            </svg>
            невеста
          </span>
          <span className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true">
              <circle r="9" fill="#e6ddd1" />
              <g fill="#5d534b">
                <polygon points={markFor("GROOM")!.bow!.left} />
                <polygon points={markFor("GROOM")!.bow!.right} />
                <circle r="1.9" />
              </g>
            </svg>
            жених
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setSeats(START);
            setPicked(null);
            setHint("Вернули как было.");
          }}
          className="mt-5 text-xs text-stone-500 underline underline-offset-4 hover:text-stone-800"
        >
          Сбросить демо
        </button>
      </div>
    </div>
  );
}
