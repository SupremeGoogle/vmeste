"use client";

/**
 * Список гостей.
 *
 * Раньше это была голая таблица, где «+1» было подчёркнутым словом
 * «разрешён», и не было видно ни телефона, ни того, дошла ли ссылка.
 * Теперь у строки есть всё, что организатор проверяет за неделю до
 * свадьбы: ответ, стол, пара, открыта ли ссылка, — и действия рядом.
 *
 * Каждое действие — форма с серверным действием, поэтому без JS список
 * тоже работает. Скрипт добавляет поиск, фильтры, выбор нескольких
 * гостей и «Отменить» после архива.
 */
import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  archiveGuestAction, bulkGuestsAction, restoreGuestAction, togglePlusOneAction,
} from "@/app/(app)/app/e/[eventId]/guests/actions";

export type ListGuest = {
  id: string;
  displayName: string;
  role: "GUEST" | "BRIDE" | "GROOM";
  phone: string | null;
  note: string | null;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  plusOneAllowed: boolean;
  plusOneName: string | null;
  isPlusOne: boolean;
  linkToken: string;
  linkOpened: boolean;
  /** Вписал себя сам по общей ссылке. */
  selfRegistered?: boolean;
  /** В списке уже есть приглашённый с тем же именем — возможно, это он же. */
  maybeDuplicateOf?: string | null;
  table: string | null;
  seatIndex: number | null;
};

type Filter = "all" | "accepted" | "pending" | "declined" | "unseated" | "unopened";

const STATUS = {
  ACCEPTED: { label: "Придёт", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  PENDING: { label: "Ждём ответа", className: "bg-stone-100 text-stone-700", dot: "bg-stone-400" },
  DECLINED: { label: "Не придёт", className: "bg-rose-50 text-rose-800", dot: "bg-rose-400" },
} as const;

const ROLE = { BRIDE: "Невеста", GROOM: "Жених", GUEST: null } as const;

const AVATAR_TONES = ["bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-900", "bg-sky-100 text-sky-900", "bg-rose-100 text-rose-900", "bg-violet-100 text-violet-900", "bg-stone-200 text-stone-800"];

function initials(name: string) {
  const parts = name.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function tone(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е");

export function GuestList({
  eventId, eventSlug, guests, byTable,
}: {
  eventId: string;
  eventSlug: string;
  guests: ListGuest[];
  byTable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimistic, applyOptimistic] = useOptimistic(
    guests,
    (state, change: { id: string; plusOne?: boolean; archived?: boolean }) =>
      change.archived
        ? state.filter((g) => g.id !== change.id)
        : state.map((g) => (g.id === change.id && change.plusOne !== undefined ? { ...g, plusOneAllowed: change.plusOne } : g)),
  );

  const counts = useMemo(() => ({
    all: optimistic.length,
    accepted: optimistic.filter((g) => g.rsvpStatus === "ACCEPTED").length,
    pending: optimistic.filter((g) => g.rsvpStatus === "PENDING").length,
    declined: optimistic.filter((g) => g.rsvpStatus === "DECLINED").length,
    unseated: optimistic.filter((g) => !g.table && g.rsvpStatus !== "DECLINED").length,
    unopened: optimistic.filter((g) => !g.linkOpened).length,
  }), [optimistic]);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return optimistic.filter((g) => {
      if (q && !fold(`${g.displayName} ${g.phone ?? ""} ${g.note ?? ""} ${g.table ?? ""}`).includes(q)) return false;
      switch (filter) {
        case "accepted": return g.rsvpStatus === "ACCEPTED";
        case "pending": return g.rsvpStatus === "PENDING";
        case "declined": return g.rsvpStatus === "DECLINED";
        case "unseated": return !g.table && g.rsvpStatus !== "DECLINED";
        case "unopened": return !g.linkOpened;
        default: return true;
      }
    });
  }, [optimistic, query, filter]);

  const groups = useMemo(() => {
    if (!byTable) return [{ label: null as string | null, guests: shown }];
    const map = new Map<string, ListGuest[]>();
    const unseated: ListGuest[] = [];
    for (const guest of shown) {
      if (!guest.table) unseated.push(guest);
      else map.set(guest.table, [...(map.get(guest.table) ?? []), guest]);
    }
    const seated = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ru", { numeric: true }))
      .map(([label, members]) => ({ label, guests: members.sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0)) }));
    return unseated.length ? [...seated, { label: "Не рассажено", guests: unseated }] : seated;
  }, [shown, byTable]);

  function formFor(values: Record<string, string>) {
    const data = new FormData();
    data.set("eventId", eventId);
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  function togglePlusOne(guest: ListGuest) {
    startTransition(async () => {
      applyOptimistic({ id: guest.id, plusOne: !guest.plusOneAllowed });
      await togglePlusOneAction(formFor({ guestId: guest.id, allowed: guest.plusOneAllowed ? "0" : "1" }));
    });
  }

  function archive(guest: ListGuest) {
    startTransition(async () => {
      applyOptimistic({ id: guest.id, archived: true });
      setToast({ id: guest.id, name: guest.displayName });
      await archiveGuestAction(formFor({ guestId: guest.id }));
    });
  }

  function restore() {
    if (!toast) return;
    const id = toast.id;
    setToast(null);
    startTransition(async () => {
      await restoreGuestAction(formFor({ guestId: id }));
    });
  }

  async function copyLink(guest: ListGuest) {
    const url = `${window.location.origin}/i/${eventSlug}/${guest.linkToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(guest.id);
      setTimeout(() => setCopied((current) => (current === guest.id ? null : current)), 1800);
    } catch {
      window.prompt("Скопируйте ссылку", url);
    }
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allShownSelected = shown.length > 0 && shown.every((g) => selected.has(g.id));

  if (guests.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-card px-6 py-12 text-center">
        <p className="text-4xl" aria-hidden>💌</p>
        <p className="mt-3 text-lg text-stone-900">Гостей пока нет</p>
        <p className="mt-1 text-sm text-stone-500">Добавьте первого вручную или загрузите готовый список из Excel — выше.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-card p-1 text-sm">
          <Link href={`/app/e/${eventId}/guests`} scroll={false} className={`rounded-md px-3 py-1 ${!byTable ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
            Списком
          </Link>
          <Link href={`/app/e/${eventId}/guests?view=bytable`} scroll={false} className={`rounded-md px-3 py-1 ${byTable ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
            По столам
          </Link>
        </div>
        <label className="relative w-full sm:w-72">
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти по имени, телефону, столу"
            aria-label="Поиск гостя"
            className="w-full rounded-lg border border-stone-300 bg-card py-2 pl-8 pr-3 text-base sm:text-sm"
          />
        </label>
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {([
          ["all", "Все"],
          ["accepted", "Придут"],
          ["pending", "Ждём ответа"],
          ["declined", "Не придут"],
          ["unseated", "Без места"],
          ["unopened", "Ссылка не открыта"],
        ] as [Filter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-card text-stone-600 hover:border-stone-400"
            }`}
          >
            {label} <span className={filter === value ? "text-white/70" : "text-stone-400"}>{counts[value]}</span>
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <form action={bulkGuestsAction} onSubmit={() => setSelected(new Set())} className="rise sticky top-28 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <input type="hidden" name="eventId" value={eventId} />
          {[...selected].map((id) => <input key={id} type="hidden" name="guestId" value={id} />)}
          <span className="mr-auto">Выбрано: {selected.size}</span>
          <button name="bulk" value="plus-one-on" className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/20">Разрешить +1</button>
          <button name="bulk" value="plus-one-off" className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/20">Без пары</button>
          <button
            name="bulk"
            value="archive"
            onClick={(e) => { if (!window.confirm(`Убрать в архив ${selected.size}?`)) e.preventDefault(); }}
            className="rounded-lg bg-rose-500/80 px-3 py-1 hover:bg-rose-500"
          >
            В архив
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="px-2 py-1 text-white/70 hover:text-white">✕</button>
        </form>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-card">
        <div className="hidden items-center gap-3 border-b border-stone-200 px-4 py-2 text-xs text-stone-500 md:grid md:grid-cols-[1.5rem_minmax(0,2fr)_8rem_7rem_9rem_6rem_5.5rem]">
          <input
            type="checkbox"
            checked={allShownSelected}
            onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((g) => g.id)))}
            aria-label="Выбрать всех показанных"
            className="h-4 w-4 accent-stone-900"
          />
          <span>Гость</span>
          <span>Ответ</span>
          <span>Стол</span>
          <span>Пара</span>
          <span className="text-right">Ссылка</span>
          <span />
        </div>

        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-stone-500">Никого не нашли — поменяйте поиск или фильтр.</p>}

        {groups.map((group) => (
          <section key={group.label ?? "all"}>
            {group.label && (
              <h3 className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800">
                {group.label} <span className="font-normal text-stone-500">· {group.guests.length}</span>
              </h3>
            )}
            <ul className="divide-y divide-stone-100">
              {group.guests.map((guest) => {
                const status = STATUS[guest.rsvpStatus];
                return (
                  <li
                    key={guest.id}
                    className={`group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-stone-50/70 md:grid-cols-[1.5rem_minmax(0,2fr)_8rem_7rem_9rem_6rem_5.5rem] ${
                      selected.has(guest.id) ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(guest.id)}
                      onChange={() => toggleSelect(guest.id)}
                      aria-label={`Выбрать ${guest.displayName}`}
                      className="h-4 w-4 accent-stone-900"
                    />

                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${tone(guest.displayName)}`}>
                        {initials(guest.displayName)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate">
                          <Link href={`/app/e/${eventId}/guests/${guest.id}`} className="truncate font-medium text-stone-900 hover:underline">
                            {guest.displayName}
                          </Link>
                          {ROLE[guest.role] && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">{ROLE[guest.role]}</span>
                          )}
                          {guest.isPlusOne && <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">спутник</span>}
                          {guest.selfRegistered && <span title="Вписал себя сам по общей ссылке на приглашение" className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900">добавился сам</span>}
                          {guest.maybeDuplicateOf && <span title={`В списке уже есть «${guest.maybeDuplicateOf}». Если это один человек, удалите лишнюю строку.`} className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-800">возможно, повтор</span>}
                        </p>
                        <p className="truncate text-xs text-stone-500">
                          {guest.phone ? <a href={`tel:${guest.phone}`} className="hover:text-stone-800">{guest.phone}</a> : null}
                          {guest.phone && guest.note ? " · " : null}
                          {guest.note}
                        </p>
                      </div>
                    </div>

                    {/* Меню действий: на телефоне справа от имени, на компьютере — в конце строки. */}
                    <GuestMenu
                      eventId={eventId}
                      guest={guest}
                      href={`/i/${eventSlug}/${guest.linkToken}`}
                      copied={copied === guest.id}
                      onCopy={() => void copyLink(guest)}
                      onArchive={() => archive(guest)}
                      className="md:order-last"
                    />

                    <div className="col-span-3 col-start-2 flex flex-wrap items-center gap-2 md:contents">
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${status.className}`}>
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>

                      <span className={`w-fit truncate rounded-md px-2 py-1 text-xs ${guest.table ? "bg-stone-100 text-stone-700" : "text-stone-400"}`}>
                        {guest.table ?? "без места"}
                      </span>

                      <form action={togglePlusOneAction} onSubmit={(e) => { e.preventDefault(); togglePlusOne(guest); }} className="min-w-0">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="guestId" value={guest.id} />
                        <input type="hidden" name="allowed" value={guest.plusOneAllowed ? "0" : "1"} />
                        <button
                          role="switch"
                          aria-checked={guest.plusOneAllowed}
                          title={guest.plusOneAllowed ? "Гость может прийти с парой — нажмите, чтобы запретить" : "Разрешить прийти с парой"}
                          className="flex max-w-full items-center gap-2 rounded-full py-0.5 text-xs text-stone-700"
                        >
                          {/* Ползунок отсчитывается от левого края дорожки:
                              без `left-0` абсолютная позиция бралась от места,
                              где спан оказался в потоке, и кружок уезжал
                              за пределы переключателя. */}
                          <span aria-hidden className={`relative block h-5 w-9 shrink-0 rounded-full transition-colors ${guest.plusOneAllowed ? "bg-stone-900" : "bg-stone-200 ring-1 ring-inset ring-stone-300"}`}>
                            <span className={`absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-card shadow transition-transform ${guest.plusOneAllowed ? "translate-x-4" : "translate-x-0"}`} />
                          </span>
                          <span className="truncate">{guest.plusOneAllowed ? guest.plusOneName ?? "+1" : "без пары"}</span>
                        </button>
                      </form>

                      <span className={`text-xs md:text-right ${guest.linkOpened ? "text-emerald-700" : "text-stone-400"}`}>
                        {guest.linkOpened ? "✓ открыта" : "не открыта"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {toast && (
        <div role="status" className="rise fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl">
          <span className="truncate">{toast.name} — в архиве</span>
          <div className="flex shrink-0 gap-3">
            <button type="button" onClick={restore} className="font-medium text-amber-200 hover:text-amber-100">Отменить</button>
            <button type="button" onClick={() => setToast(null)} aria-label="Закрыть" className="text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestMenu({
  eventId, guest, href, copied, onCopy, onArchive, className = "",
}: {
  eventId: string;
  guest: ListGuest;
  href: string;
  copied: boolean;
  onCopy: () => void;
  onArchive: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={onCopy}
        title="Скопировать именную ссылку"
        className={`hidden rounded-lg px-2 py-1 text-xs transition-colors sm:block ${copied ? "bg-emerald-50 text-emerald-700" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"}`}
      >
        {copied ? "Скопировано" : "Ссылка"}
      </button>
      <details className="relative">
        <summary aria-label="Действия" className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 [&::-webkit-details-marker]:hidden">
          ⋯
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-stone-200 bg-card py-1 text-sm shadow-lg">
          <button type="button" onClick={(e) => { onCopy(); e.currentTarget.closest("details")?.removeAttribute("open"); }} className="block w-full px-3 py-2 text-left hover:bg-stone-50">
            {copied ? "✓ Скопировано" : "Скопировать ссылку"}
          </button>
          <a href={href} target="_blank" rel="noreferrer" className="block px-3 py-2 hover:bg-stone-50">Открыть приглашение ↗</a>
          <Link href={`/app/e/${eventId}/guests/${guest.id}`} className="block px-3 py-2 hover:bg-stone-50">Карточка гостя</Link>
          <form action={archiveGuestAction} onSubmit={(e) => { e.preventDefault(); e.currentTarget.closest("details")?.removeAttribute("open"); onArchive(); }}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="guestId" value={guest.id} />
            <button className="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50">В архив</button>
          </form>
        </div>
      </details>
    </div>
  );
}
