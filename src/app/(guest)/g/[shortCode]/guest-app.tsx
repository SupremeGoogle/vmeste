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
import type { GuestHub } from "@/server/services/guest-hub";
import { EASE_OUT } from "@/components/motion/motion";
import { forgetMe, sendWish, type WishState } from "./actions";
import { PhotoUploader } from "./photo-uploader";
import { GuestHeader, GuestFinder as Finder, GuestSeatCard as SeatCard } from "@/components/guest/entry";

type EventInfo = { title: string; dateLabel: string; venue: string | null };

const rise = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
} as const;

export function GuestApp({ code, eventId, event, hub, openEntry = false }: { code: string; eventId: string; event: EventInfo; hub: GuestHub | null; openEntry?: boolean }) {
  return (
    <main className="guest-wedding-page mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-16">
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

/* ── Страница опознанного гостя ─────────────────────────────────── */

/** Строка-ссылка на раздел: подарки, альбом, музыка. */
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

function Hub({ code, eventId, hub }: { code: string; eventId: string; hub: GuestHub }) {
  const [leaving, startLeaving] = useTransition();
  return (
    <motion.div initial="hidden" animate="shown" variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}>
      <motion.p variants={rise} className="mt-8 text-center font-serif text-xl text-muted">
        Добро пожаловать,
      </motion.p>
      <motion.h2 variants={rise} className="mt-1 text-center font-serif text-[34px] leading-tight sm:text-4xl">
        {hub.displayName}
      </motion.h2>

      <motion.nav variants={rise} aria-label="Разделы" className="mx-auto mt-5 flex w-fit gap-1 rounded-full border border-line bg-card/70 p-1 text-sm backdrop-blur">
        {[
          ["#seat", "Мой стол"],
          ...(hub.photos.enabled ? [["#photos", "Фото"]] : []),
          ...(hub.wishes.enabled ? [["#wish", "Пожелание"]] : []),
        ].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full px-4 text-muted transition-colors hover:bg-paper hover:text-ink">
            {label}
          </a>
        ))}
      </motion.nav>


      <motion.div variants={rise}>
        <SeatCard code={code} seat={hub.seat} />
      </motion.div>

      <motion.div variants={rise}>
        <Link
          href={`/g/${code}/seating`}
          className="guest-button mt-4 flex min-h-14 items-center justify-center gap-2.5 rounded-2xl px-5 text-[16px] font-medium transition-transform duration-200 active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="2.5" y="3" width="6" height="6" rx="1.5" /><rect x="11.5" y="3" width="6" height="6" rx="1.5" /><rect x="2.5" y="11" width="6" height="6" rx="1.5" /><rect x="11.5" y="11" width="6" height="6" rx="1.5" /></svg>
          Рассадка всех гостей
        </Link>
      </motion.div>

      {hub.giftsEnabled || hub.album.enabled ? (
        <motion.ul variants={rise} className="mt-4 grid gap-3">
          {hub.giftsEnabled ? (
            <HubLink href={`/g/${code}/gifts`} title="Виш-лист" note="Что паре хотелось бы получить" />
          ) : null}
          {hub.album.enabled ? (
            <HubLink
              href={`/g/${code}/album`}
              title="Альбом"
              note={hub.album.open ? "Снимки гостей со свадьбы — смотреть и скачать" : `Откроется ${hub.album.opensOn}, на следующий день после свадьбы`}
            />
          ) : null}
        </motion.ul>
      ) : null}

      {hub.photos.enabled ? (
        <motion.section variants={rise} id="photos" className="guest-card mt-6 scroll-mt-6 p-5 sm:p-7">
          <h3 className="font-serif text-[26px] leading-tight">Фотографии</h3>
          <p className="mt-1 text-[15px] text-muted">
            До {hub.photos.limit} снимков — они сразу появятся в общей галерее.
          </p>
          <PhotoUploader eventId={eventId} left={hub.photos.left} limit={hub.photos.limit} mine={hub.photos.mine} />
          <Gallery eventId={eventId} ids={hub.photos.gallery} />
        </motion.section>
      ) : null}

      {hub.wishes.enabled ? (
        <motion.section variants={rise} id="wish" className="guest-card mt-6 scroll-mt-6 p-5 sm:p-7">
          <WishForm code={code} name={hub.displayName} mine={hub.wishes.mine} />
        </motion.section>
      ) : null}

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

function Gallery({ eventId, ids }: { eventId: string; ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const media = (id: string, full = false) => `/api/media/${eventId}/${id}${full ? "?size=full" : ""}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mt-7">
      <h4 className="text-[12px] tracking-[0.22em] text-muted uppercase">Общая галерея</h4>
      {ids.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-muted">
          Пока пусто — здесь появятся снимки гостей.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
          {ids.map((id, i) => (
            <motion.li
              key={id}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.45, delay: (i % 9) * 0.03, ease: EASE_OUT }}
            >
              <motion.button
                type="button"
                layoutId={`photo-${id}`}
                onClick={() => setOpen(id)}
                whileTap={{ scale: 0.97 }}
                className="block aspect-square w-full overflow-hidden rounded-xl bg-line/40"
                aria-label={`Открыть фото ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- снимки отдаёт своё API, next/image тут только лишний прокси */}
                <img src={media(id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </motion.button>
            </motion.li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {open ? (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            role="dialog"
            aria-label="Фотография"
          >
            <motion.div layoutId={`photo-${open}`} className="max-h-full max-w-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- см. выше */}
              <img src={media(open, true)} alt="" className="max-h-[85dvh] max-w-full object-contain" />
            </motion.div>
            <button type="button" className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-card/15 text-2xl text-card" aria-label="Закрыть">
              ×
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
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
