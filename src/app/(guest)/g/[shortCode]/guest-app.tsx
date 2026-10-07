"use client";

/**
 * Страница гостя: поиск себя по имени → «ваш стол», фото, пожелания.
 *
 * Движения — на Motion, в общем ритме продукта: содержимое проявляется
 * снизу лесенкой, карточка стола «приземляется» пружиной. Всё
 * прерываемое и глушится системной настройкой «меньше движения».
 */
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { GuestHub } from "@/server/services/guest-hub";
import { EASE_OUT } from "@/components/motion/motion";
import { forgetMe, sendWish, type WishState } from "./actions";
import { PhotoUploader } from "./photo-uploader";
import { PhotoWall } from "@/components/guest/photo-wall";
import { GuestHeader, GuestFinder as Finder, GuestSeatCard as SeatCard } from "@/components/guest/entry";

type EventInfo = { title: string; dateLabel: string; venue: string | null };

const rise = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
} as const;

export function GuestApp({ code, eventId, event, hub, openEntry = false }: { code: string; eventId: string; event: EventInfo; hub: GuestHub | null; openEntry?: boolean }) {
  return (
    <main className="guest-wedding-page relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-16">
      {hub ? <LeaveButton code={code} /> : null}
      <GuestHeader event={event} />

      <AnimatePresence mode="wait" initial={false}>
        {hub ? (
          <motion.div key="hub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
            <Hub code={code} eventId={eventId} hub={hub} />
          </motion.div>
        ) : (
          <motion.div key="finder" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
            <Finder code={code} openEntry={openEntry} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/** «Выйти» в углу шапки: снять гостевую сессию и вернуться к поиску себя. */
function LeaveButton({ code }: { code: string }) {
  const [leaving, startLeaving] = useTransition();
  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => startLeaving(() => forgetMe(code))}
      className="absolute top-4 right-4 z-40 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-card/80 px-3 text-[13px] text-muted backdrop-blur transition-colors hover:text-ink disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 4H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h3M12.5 13.5 16 10l-3.5-3.5M16 10H8" /></svg>
      {leaving ? "Выходим…" : "Выйти"}
    </button>
  );
}

/* ── Страница опознанного гостя ─────────────────────────────────── */

type Tab = "seat" | "photos" | "wish";

/** Строка-ссылка на раздел: подарки, альбом. */
function HubLink({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <li>
      <Link href={href} className="guest-card flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition-transform duration-200 active:scale-[0.99]">
        <span className="min-w-0">
          <span className="block font-serif text-[22px] leading-tight">{title}</span>
          <span className="mt-0.5 block text-[15px] text-muted">{note}</span>
        </span>
        <span aria-hidden className="text-xl text-gold-soft">›</span>
      </Link>
    </li>
  );
}

/**
 * Три раздела — вкладками, а не якорями: раньше «Фото» прокручивало
 * страницу вниз, и гость терял, где он. Теперь виден один раздел, панель
 * вкладок стоит на месте (прилипает к верху при прокрутке), выбранная
 * подсвечена. Вкладка живёт в адресе (`?tab=photos`): после загрузки фото
 * или перезагрузки гость остаётся там же.
 */
function Hub({ code, eventId, hub }: { code: string; eventId: string; hub: GuestHub }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "seat", label: "Мой стол" },
    ...(hub.photos.enabled ? [{ id: "photos" as const, label: "Фото" }] : []),
    ...(hub.wishes.enabled ? [{ id: "wish" as const, label: "Пожелание" }] : []),
  ];
  const asked = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>(tabs.some((item) => item.id === asked) ? (asked as Tab) : "seat");
  const [leaving, startLeaving] = useTransition();

  function choose(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "seat") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <motion.div initial="hidden" animate="shown" variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}>
      <motion.p variants={rise} className="mt-8 text-center font-serif text-xl text-muted">
        Добро пожаловать,
      </motion.p>
      <motion.h2 variants={rise} className="mt-1 text-center font-serif text-[34px] leading-tight sm:text-4xl">
        {hub.displayName}
      </motion.h2>

      {tabs.length > 1 ? (
        <motion.div variants={rise} className="sticky top-3 z-30 mt-5 flex justify-center">
          <div role="tablist" aria-label="Разделы" className="flex w-fit gap-1 rounded-full border border-line bg-card/90 p-1 text-[15px] shadow-[0_10px_30px_-18px_rgba(64,56,51,0.45)] backdrop-blur">
            {tabs.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${item.id}`}
                  onClick={() => choose(item.id)}
                  className={`relative inline-flex min-h-11 items-center rounded-full px-4 transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {active ? (
                    <motion.span layoutId="guest-tab" className="absolute inset-0 rounded-full border border-gold-soft/60 bg-paper" transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-hidden />
                  ) : null}
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      <motion.div variants={rise}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            {tab === "seat" ? (
              <>
                <SeatCard code={code} seat={hub.seat} />
                <Link
                  href={`/g/${code}/seating`}
                  className="guest-button mt-4 flex min-h-14 items-center justify-center gap-2.5 rounded-2xl px-5 text-[16px] font-medium transition-transform duration-200 active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="2.5" y="3" width="6" height="6" rx="1.5" /><rect x="11.5" y="3" width="6" height="6" rx="1.5" /><rect x="2.5" y="11" width="6" height="6" rx="1.5" /><rect x="11.5" y="11" width="6" height="6" rx="1.5" /></svg>
                  Рассадка всех гостей
                </Link>
                {hub.giftsEnabled ? (
                  <ul className="mt-4 grid gap-3">
                    <HubLink href={`/g/${code}/gifts`} title="Виш-лист" note="Что паре хотелось бы получить" />
                  </ul>
                ) : null}
              </>
            ) : tab === "photos" ? (
              <section className="guest-card mt-6 p-5 sm:p-7">
                <h3 className="font-serif text-[26px] leading-tight">Фотографии</h3>
                <p className="mt-1 text-[15px] text-muted">
                  До {hub.photos.limit} снимков — они сразу появятся в общей галерее.
                </p>
                <PhotoUploader eventId={eventId} left={hub.photos.left} limit={hub.photos.limit} mine={hub.photos.mine} />
                <div className="mt-7">
                  <h4 className="text-[12px] tracking-[0.22em] text-muted uppercase">Общая галерея</h4>
                  {hub.photos.gallery.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-muted">
                      Пока пусто — здесь появятся снимки гостей.
                    </p>
                  ) : (
                    <div className="mt-3">
                      <PhotoWall eventId={eventId} photos={hub.photos.gallery} />
                    </div>
                  )}
                </div>
                {hub.album.enabled ? (
                  <ul className="mt-6 grid gap-3">
                    <HubLink
                      href={`/g/${code}/album`}
                      title="Альбом"
                      note={hub.album.open ? "Снимки гостей со свадьбы — смотреть и скачать" : `Откроется ${hub.album.opensOn}, на следующий день после свадьбы`}
                    />
                  </ul>
                ) : null}
              </section>
            ) : (
              <section className="guest-card mt-6 p-5 sm:p-7">
                <WishForm code={code} name={hub.displayName} mine={hub.wishes.mine} />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.p variants={rise} className="mt-8 text-center text-sm text-muted">
        Не {hub.displayName.split(" ")[0]}?{" "}
        <button
          type="button"
          disabled={leaving}
          onClick={() => startLeaving(() => forgetMe(code))}
          className="min-h-11 underline decoration-line underline-offset-4 hover:text-ink disabled:opacity-50"
        >
          Найти себя заново
        </button>
      </motion.p>
    </motion.div>
  );
}

const WISH_STATUS: Record<string, string> = { PENDING: "ждёт проверки", APPROVED: "показано в зале", REJECTED: "не подошло" };

function WishForm({ code, name, mine }: { code: string; name: string; mine: GuestHub["wishes"]["mine"] }) {
  const [state, action, pending] = useActionState<WishState, FormData>(sendWish.bind(null, code), { ok: false, message: null });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <>
      <h3 className="font-serif text-[26px] leading-tight">Пожелание молодожёнам</h3>
      <p className="mt-1 text-[15px] text-muted">Несколько тёплых слов для молодожёнов.</p>
      <form ref={formRef} action={action} className="mt-5 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">Как подписать</span>
          <input name="authorName" required maxLength={80} defaultValue={name} className="mt-1 h-12 w-full rounded-xl border border-line bg-card px-4 text-[16px] outline-none focus:border-gold-soft focus:shadow-[0_0_0_4px_rgba(201,163,106,0.18)]" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Пожелание</span>
          <textarea name="text" required minLength={3} maxLength={500} rows={4} placeholder="Желаем вам…" className="mt-1 w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-[16px] leading-relaxed outline-none focus:border-gold-soft focus:shadow-[0_0_0_4px_rgba(201,163,106,0.18)]" />
        </label>
        <motion.button whileTap={{ scale: 0.98 }} disabled={pending} className="guest-button h-12 w-full rounded-xl text-[16px] font-medium disabled:opacity-60">
          {pending ? "Отправляем…" : "Отправить"}
        </motion.button>
        <AnimatePresence mode="wait">
          {state.ok ? (
            <motion.p key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-sage/25 px-4 py-3 text-center text-[15px]" role="status">
              Спасибо! Пожелание отправлено.
            </motion.p>
          ) : state.message ? (
            <motion.p key="err" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-blush/30 px-4 py-3 text-center text-[15px]" role="alert">
              {state.message}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </form>

      {mine.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-[12px] tracking-[0.22em] text-muted uppercase">Ваши пожелания</h4>
          <ul className="mt-3 space-y-2">
            {mine.map((wish) => (
              <li key={wish.id} className="rounded-xl border border-line bg-paper/70 px-4 py-3 text-[15px] leading-relaxed">
                <p className="whitespace-pre-line">{wish.text}</p>
                <p className="mt-1 text-xs text-muted">{WISH_STATUS[wish.status] ?? wish.status}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
