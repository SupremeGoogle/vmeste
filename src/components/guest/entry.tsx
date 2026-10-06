"use client";

// Общие элементы настоящей страницы гостя и её демонстрации на главной.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type { GuestHub } from "@/server/services/guest-hub";
import { EASE_OUT, SPRING } from "@/components/motion/motion";
import { BrandLogo } from "@/components/brand";

export type EventInfo = { title: string; dateLabel: string; venue: string | null };
const rise = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
} as const;

export function GuestHeader({ event }: { event: EventInfo }) {
  const displayTitle = event.title.replace(/\s*[—–-]\s*свадьба\s*$/i, "");
  return (
      <motion.header
        className="guest-wedding-hero text-center"
        initial="hidden"
        animate="shown"
        variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.08 } } }}
      >
        <div className="absolute top-5 left-1/2 -translate-x-1/2"><BrandLogo size={32} adaptive={false} /></div>
        <span className="guest-wedding-wreath" aria-hidden="true" />
        <motion.p variants={rise} className="guest-wedding-eyebrow">
          Добро пожаловать на свадьбу
        </motion.p>
        <motion.h1 variants={rise} className="guest-wedding-title font-script">
          {displayTitle}
        </motion.h1>
        <motion.div variants={rise} className="guest-wedding-divider" aria-hidden>
          <span className="h-px flex-1 bg-current opacity-60" />
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.2 6.3 6.3 2.2-6.3 2.2L10 18.5l-2.2-6.3L1.5 10l6.3-2.2z" /></svg>
          <span className="h-px flex-1 bg-current opacity-60" />
        </motion.div>
        <motion.p variants={rise} className="guest-wedding-date">
          {event.dateLabel}{event.venue ? ` · ${event.venue}` : ""}
        </motion.p>
      </motion.header>
  );
}

export type Match = { guestId: string; displayName: string; tableLabel: string | null };
export type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; matches: Match[] }
  | { status: "not_found" | "too_many" | "too_short" | "rate_limited" | "error" };

const LOOKUP_HINT: Record<string, string> = {
  not_found: "Не нашли. Попробуйте только фамилию — или подойдите к координатору.",
  too_many: "Слишком много совпадений — добавьте фамилию.",
  too_short: "Введите хотя бы две буквы.",
  rate_limited: "Слишком много попыток. Подождите минуту.",
  error: "Нет связи. Попробуйте ещё раз.",
};

export function GuestFinder({ code, lookupUrl = `/api/e/${code}/lookup`, onChoose, planHref = `/e/${code}/plan`, autoFocus = true }: {
  code: string;
  lookupUrl?: string;
  onChoose?: (match: Match) => void;
  planHref?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LookupState>({ status: "idle" });
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<Match | null>(null);
  const claimForm = useRef<HTMLFormElement>(null);
  const claimId = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, LookupState>());
  const listId = useId();

  // Поиск по мере ввода, с паузой 250 мс: пока человек печатает, запросы не
  // летят на каждую букву. Ответы кешируются — стёр букву и вернул, повтора нет.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const cached = cache.current.get(q.toLowerCase());
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (cached) {
        setState(cached);
        setActive(0);
        return;
      }
      setState({ status: "loading" });
      try {
        const res = await fetch(lookupUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });
        const body = await res.json();
        const next: LookupState = body.status === "ok" ? { status: "ok", matches: body.matches } : { status: body.status ?? "error" };
        // Запоминаем только ответ по существу: «слишком много попыток» через
        // минуту уже неправда, и тот же запрос должен снова уйти на сервер.
        if (next.status !== "rate_limited" && next.status !== "error") cache.current.set(q.toLowerCase(), next);
        setState(next);
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setState({ status: "error" });
      }
    }, cached ? 0 : 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lookupUrl]);

  const shown: LookupState = query.trim().length < 2 ? { status: "idle" } : state;
  const matches = shown.status === "ok" ? shown.matches : [];
  const open = matches.length > 0 && !picked;

  function choose(match: Match) {
    setPicked(match);
    setQuery(match.displayName);
    if (onChoose) {
      onChoose(match);
      return;
    }
    // Обычная отправка формы: сервер ставит гостевую cookie и возвращает
    // на эту же страницу, уже со столом. Поле пишем напрямую, не дожидаясь
    // перерисовки: отправка не должна зависеть от кадров анимации.
    if (claimId.current) claimId.current.value = match.guestId;
    claimForm.current?.requestSubmit();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(matches[active]);
    }
  }

  return (
    <section className="guest-card guest-finder-card mt-3 p-5 sm:p-7">
      <h2 className="font-serif text-[28px] leading-tight sm:text-3xl">Найдите своё место</h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">Начните вводить имя или фамилию и выберите себя в списке.</p>

      {/* Без JavaScript это обычная форма: ищет на сервере и показывает стол. */}
      <form method="get" action={`/e/${code}/me`} className="relative mt-5" onSubmit={(e) => { if (open) { e.preventDefault(); choose(matches[active]); } }}>
        <label htmlFor="guest-q" className="sr-only">Имя или фамилия</label>
        <div className="relative">
          <svg className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5 18 18" strokeLinecap="round" /></svg>
          <input
            id="guest-q"
            name="q"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="search"
            required
            minLength={2}
            maxLength={80}
            placeholder="Например, Петрова"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            className="h-14 w-full rounded-2xl border border-line bg-card pr-12 pl-11 text-[17px] shadow-[inset_0_1px_2px_rgba(64,56,51,0.06)] transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted/70 focus:border-gold-soft focus:shadow-[0_0_0_4px_rgba(201,163,106,0.18)]"
          />
          <AnimatePresence>
            {shown.status === "loading" || picked ? (
              <motion.span
                key="spin"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ rotate: { repeat: Infinity, duration: 0.9, ease: "linear" } }}
                className="absolute top-1/2 right-4 -mt-2.5 block h-5 w-5 rounded-full border-2 border-gold-soft border-t-transparent"
                aria-hidden
              />
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {open ? (
            <motion.ul
              id={listId}
              role="listbox"
              aria-label="Найденные гости"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
              transition={SPRING}
              className="absolute inset-x-0 top-[calc(100%+8px)] z-20 origin-top overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-[0_24px_48px_-20px_rgba(64,56,51,0.45)]"
            >
              {matches.map((match, i) => (
                <motion.li
                  key={match.guestId}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.035, duration: 0.3, ease: EASE_OUT } }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(match)}
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${i === active ? "bg-paper" : ""}`}
                >
                  <span className="text-[16px]">{match.displayName}</span>
                  {match.tableLabel ? (
                    <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs text-gold">{match.tableLabel}</span>
                  ) : null}
                </motion.li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {shown.status in LOOKUP_HINT && !picked ? (
            <motion.p key={shown.status} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-muted" role="status">
              {LOOKUP_HINT[shown.status]}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <noscript>
          <button type="submit" className="guest-button mt-4 h-12 w-full rounded-2xl text-[16px] font-medium">Найти</button>
        </noscript>
      </form>

      <form ref={claimForm} method="post" action={`/api/e/${code}/claim`} hidden>
        <input ref={claimId} type="hidden" name="guestId" defaultValue="" />
        <input type="hidden" name="next" value="hub" />
      </form>

      <p className="mt-6 text-center text-sm">
        <a href={planHref} className="text-muted underline decoration-line underline-offset-4 hover:text-ink">Общий план зала</a>
      </p>
    </section>
  );
}

export function GuestSeatCard({ code, seat, planHref }: { code: string; seat: GuestHub["seat"]; planHref?: string }) {
  if (!seat) {
    return (
      <section id="seat" className="guest-card guest-seat-card mt-6 scroll-mt-6 p-6 text-center">
        <span className="guest-seat-garland" aria-hidden="true" />
        <p className="text-sm tracking-[0.2em] text-muted uppercase">Ваше место</p>
        <p className="mt-3 font-serif text-2xl">Пока не назначено</p>
        <p className="mt-2 text-[15px] text-muted">Подойдите к координатору — он подскажет, куда сесть.</p>
      </section>
    );
  }
  return (
    <section id="seat" className="guest-card guest-seat-card relative mt-6 scroll-mt-6 overflow-hidden p-6 text-center sm:p-8">
      <span className="guest-seat-garland" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gold-soft/25 blur-3xl" aria-hidden />
      <p className="relative text-[12px] tracking-[0.28em] text-muted uppercase">Ваше место</p>
      <motion.p
        className="relative mt-3 font-script text-[56px] leading-none text-gold sm:text-7xl"
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.35 }}
      >
        {seat.tableLabel}
      </motion.p>
      <p className="relative mt-3 text-[15px] text-muted">Место {seat.seatNumber}</p>

      {seat.tablemates.length > 0 ? (
        <div className="relative mt-5">
          <p className="text-[12px] tracking-[0.2em] text-muted uppercase">За столом с вами</p>
          <motion.ul
            className="mt-3 flex flex-wrap justify-center gap-1.5"
            initial="hidden"
            animate="shown"
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.04, delayChildren: 0.55 } } }}
          >
            {seat.tablemates.map((name, i) => (
              <motion.li
                key={`${name}-${i}`}
                variants={{ hidden: { opacity: 0, scale: 0.85 }, shown: { opacity: 1, scale: 1, transition: SPRING } }}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm"
              >
                {name}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      ) : null}

      <a href={planHref ?? `/e/${code}/plan?t=${seat.tableId}`} className="relative mt-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] text-gold underline decoration-gold/30 underline-offset-4 hover:decoration-gold">
        Показать на плане зала →
      </a>
    </section>
  );
}

