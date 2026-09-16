"use client";

/**
 * Панель стола: название, форма, число мест, удаление — прямо у плана.
 *
 * Панель монтируется заново для каждого стола (`key` в редакторе). Раньше
 * она запоминала поля первого открытого стола, и при щелчке по второму
 * в полях оставались название и места первого.
 *
 * У стола молодожёнов вместо формы — места невесты и жениха: кто сидит,
 * кнопка «убрать» и поиск, чтобы посадить или вписать нового.
 */
import { useState } from "react";
import {
  COUPLE_MAX_SEATS, COUPLE_MIN_SEATS, SHAPES, SHAPE_LABEL,
} from "@/lib/seating-geometry";
import { ROLE_LABEL } from "@/lib/couple-marks";
import { AutosaveInput } from "./autosave-input";
import { GuestSearch } from "./guest-search";
import type { EditorTable, Seating } from "./use-seating";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base sm:py-1.5 sm:text-sm";

export function TableEditPanel({
  table, seating, onClose,
}: {
  table: EditorTable;
  seating: Seating;
  onClose: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const taken = table.seats.filter((s) => s.guest).length;
  const [min, max] = table.isCouple ? [COUPLE_MIN_SEATS, COUPLE_MAX_SEATS] : [1, 20];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-stone-900">
          {table.isCouple ? "Стол молодожёнов" : "Стол"}
          <span className="ml-2 font-normal text-stone-500">
            занято {taken} из {table.capacity}
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть панель стола"
          className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg text-stone-500 hover:bg-stone-200"
        >
          ×
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
        <label className="col-span-2 sm:min-w-48 sm:flex-1">
          <span className="text-xs text-stone-500">Название</span>
          <AutosaveInput
            value={table.label}
            maxLength={40}
            validate={(text) => (text ? null : "Название не может быть пустым")}
            commit={(text) => seating.renameTable(table.id, text)}
            className={inputClass}
          />
        </label>

        {!table.isCouple && (
          <label>
            <span className="text-xs text-stone-500">Форма</span>
            <select
              value={table.shape}
              onChange={(e) => seating.setShape(table.id, e.target.value)}
              className={inputClass}
            >
              {SHAPES.map((shape) => (
                <option key={shape} value={shape}>{SHAPE_LABEL[shape]}</option>
              ))}
            </select>
          </label>
        )}

        <label className="sm:w-28">
          <span className="text-xs text-stone-500">Мест</span>
          <AutosaveInput
            value={String(table.capacity)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            validate={(text) => {
              const n = Number(text);
              return /^\d+$/.test(text) && n >= min && n <= max ? null : `от ${min} до ${max}`;
            }}
            commit={(text) => seating.setCapacity(table.id, Number(text))}
            delay={500}
            className={inputClass}
          />
        </label>
      </div>

      {table.isCouple && <CoupleSeats table={table} seating={seating} />}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {confirmingDelete ? (
          <>
            <span className="text-red-800">
              Удалить стол{taken > 0 ? ` и пересадить ${taken} гостей в список` : ""}?
            </span>
            <button
              type="button"
              onClick={() => {
                seating.deleteTable(table.id);
                onClose();
              }}
              className="rounded-lg bg-red-700 px-3 py-2 font-medium text-white"
            >
              Да, удалить
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="px-2 py-2 text-stone-500 underline"
            >
              Отмена
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="-ml-3 rounded-lg px-3 py-2 font-medium text-red-800 hover:bg-red-50"
          >
            Удалить стол
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Места молодых — первые два места стола (центр ряда, см. `coupleSlot`).
 * Молодые садятся сами при создании стола, но убрать их можно: бывает,
 * что пара сидит не за этим столом или стол нужен под другое.
 */
function CoupleSeats({ table, seating }: { table: EditorTable; seating: Seating }) {
  const seats = table.seats.filter((seat) => seat.index < 2);
  const fallback = ["Место невесты", "Место жениха"];
  // Невеста и жених, ещё не рассаженные, — первыми в подсказках.
  const candidates = [...seating.unseated].sort(
    (a, b) => Number(!a.role || a.role === "GUEST") - Number(!b.role || b.role === "GUEST"),
  );

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-[#d9c29a] bg-[#fbf3e4] p-3">
      {seats.map((seat) => (
        <div key={seat.id}>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6d5637]">
            {seat.guest?.role && seat.guest.role !== "GUEST"
              ? ROLE_LABEL[seat.guest.role]
              : fallback[seat.index]}
          </p>
          {seat.guest ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
              <span>{seat.guest.displayName}</span>
              <button
                type="button"
                onClick={() => seating.clear(seat.id)}
                className="rounded-md px-2 py-1 text-stone-500 underline hover:text-stone-900"
              >
                Убрать
              </button>
            </div>
          ) : (
            <div className="mt-1">
              <GuestSearch
                guests={candidates}
                onPick={(guest) => seating.assign(seat.id, guest)}
                onCreate={(name) => seating.createGuest(name, seat.id)}
                placeholder="Выбрать или вписать имя"
              />
            </div>
          )}
        </div>
      ))}
      <p className="text-xs text-[#6d5637]">
        Свидетелей и близких посадите на остальные места: щёлкните по свободному месту на плане.
      </p>
    </div>
  );
}
