"use client";

/**
 * Поиск гостя с возможностью вписать нового.
 *
 * Один и тот же в трёх местах: у свободного места на плане, в панели
 * стола молодожёнов и над списком нерассаженных. Выбирать только из
 * списка было неудобно: гостя, которого забыли внести, приходилось
 * уходить заводить во вкладку «Гости» и возвращаться.
 */
import { useId, useState } from "react";
import { ROLE_LABEL } from "@/lib/couple-marks";
import type { EditorGuest } from "./use-seating";

/** Подписи статуса ответа из списка нерассаженных в поиске только мешают. */
export function baseName(displayName: string): string {
  return displayName.replace(/ \((не придёт|не ответил)\)$/, "");
}

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е").trim();

export function GuestSearch({
  guests,
  onPick,
  onCreate,
  onCancel,
  placeholder = "Имя гостя",
  autoFocus = false,
  busy = false,
}: {
  guests: EditorGuest[];
  onPick: (guest: EditorGuest) => void;
  onCreate: (name: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  busy?: boolean;
}) {
  const [query, setQuery] = useState("");
  const listId = useId();

  const needle = fold(query);
  const matches = (needle
    ? guests.filter((guest) => fold(guest.displayName).includes(needle))
    : guests
  ).slice(0, 8);
  const trimmed = query.trim();
  const exact = guests.some((guest) => fold(baseName(guest.displayName)) === needle);

  function submit() {
    if (busy) return;
    if (matches.length === 1 && needle) {
      onPick(matches[0]);
    } else if (trimmed && !exact) {
      onCreate(trimmed);
    } else if (exact) {
      const guest = guests.find((g) => fold(baseName(g.displayName)) === needle);
      if (guest) onPick(guest);
    } else {
      return;
    }
    setQuery("");
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onCancel?.();
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={120}
        aria-controls={listId}
        // 16px на телефоне: при меньшем шрифте айфон сам увеличивает страницу.
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base sm:text-sm"
      />

      <ul id={listId} className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {trimmed && !exact && (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="w-full rounded-lg bg-stone-900 px-3 py-2 text-left text-sm text-white disabled:opacity-50"
            >
              + Добавить «{trimmed}» как нового гостя
            </button>
          </li>
        )}
        {matches.map((guest) => (
          <li key={guest.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onPick(guest);
                setQuery("");
              }}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm hover:border-stone-400"
            >
              {guest.displayName}
              {guest.role && guest.role !== "GUEST" ? (
                <span className="ml-2 text-xs text-stone-500">{ROLE_LABEL[guest.role]}</span>
              ) : null}
            </button>
          </li>
        ))}
        {!trimmed && guests.length === 0 && (
          <li className="px-1 text-xs text-stone-500">Все гости рассажены — впишите имя нового.</li>
        )}
      </ul>
    </div>
  );
}
