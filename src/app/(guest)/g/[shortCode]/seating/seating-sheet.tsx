"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { SeatingList } from "@/server/services/guest-hub";
import { EASE_OUT } from "@/components/motion/motion";
import { useT } from "@/components/i18n-provider";

/** Цвета шаблона «Гортензия» — те же, что в `PRINT_TEMPLATES`. */
const ACCENT = "#8092b0";
const INK = "#303c53";

export function SeatingSheet({ title, dateLabel, tables, meId }: { title: string; dateLabel: string; tables: SeatingList[]; meId: string }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const mine = tables.find((table) => table.guests.some((guest) => guest.id === meId));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((table) => table.label.toLowerCase().includes(q) || table.guests.some((guest) => guest.name.toLowerCase().includes(q)));
  }, [query, tables]);

  // Сразу подвести к своему столу: ради него и открывают список.
  // Плавная прокрутка в фоновой вкладке не идёт — ждём, пока страницу увидят.
  useEffect(() => {
    if (!mine) return;
    let timer = 0;
    const go = () => {
      timer = window.setTimeout(() => document.getElementById(`table-${mine.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 800);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVisible);
      go();
    };
    if (document.visibilityState === "visible") go();
    else document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mine]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      className="relative mt-2 overflow-hidden rounded-[1.75rem] bg-white px-5 pt-40 pb-40 shadow-[0_2px_4px_rgba(48,60,83,0.05),0_30px_60px_-30px_rgba(48,60,83,0.45)] sm:px-12 sm:pt-44 sm:pb-48"
      style={{ color: INK }}
    >
      {/* Акварель по углам, как на печатном листе: сверху слева и снизу справа. */}
      <motion.img
        src="/media/print-design/hydrangea.webp"
        alt=""
        aria-hidden
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
        className="pointer-events-none absolute top-0 left-0 w-[58%] max-w-[340px] origin-top-left select-none sm:w-[45%]"
      />
      <motion.img
        src="/media/print-design/hydrangea.webp"
        alt=""
        aria-hidden
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.15, ease: EASE_OUT }}
        className="pointer-events-none absolute right-0 bottom-0 w-[58%] max-w-[340px] origin-bottom-right rotate-180 select-none sm:w-[45%]"
      />

      <header className="relative text-center">
        <p className="font-serif text-[13px] tracking-[0.3em] uppercase opacity-70">{t("План рассадки гостей", "Seating plan")}</p>
        <h1 className="mt-2 font-script text-[46px] leading-[1.05] sm:text-6xl" style={{ color: ACCENT }}>
          {title}
        </h1>
        <p className="mt-1 font-serif text-lg opacity-80">{dateLabel}</p>
      </header>

      {mine ? (
        <p className="relative mx-auto mt-6 w-fit rounded-full px-4 py-2 text-center font-serif text-lg" style={{ background: `${ACCENT}1f` }}>
          {t("Ваш стол — ", "Your table: ")}<b className="font-semibold">{mine.label}</b>
        </p>
      ) : null}

      <label className="relative mx-auto mt-6 block max-w-sm">
        <span className="sr-only">{t("Найти гостя или стол", "Find a guest or table")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Найти гостя или стол", "Find a guest or table")}
          className="h-12 w-full rounded-full border bg-white/80 px-5 text-center font-serif text-lg outline-none backdrop-blur focus:shadow-[0_0_0_4px_rgba(128,146,176,0.2)]"
          style={{ borderColor: `${ACCENT}66` }}
        />
      </label>

      {shown.length === 0 ? (
        <p className="relative mt-10 text-center font-serif text-lg opacity-70">
          {tables.length === 0 ? t("Рассадка ещё готовится.", "The seating plan isn’t ready yet.") : t("Никого не нашли.", "No one found.")}
        </p>
      ) : (
        <ul className="relative mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {shown.map((table, i) => {
            const isMine = table.id === mine?.id;
            return (
              <motion.li
                key={table.id}
                id={`table-${table.id}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                transition={{ duration: 0.55, delay: (i % 2) * 0.07, ease: EASE_OUT }}
                className={`scroll-mt-24 rounded-2xl px-4 py-4 text-center transition-colors ${isMine ? "ring-1" : ""}`}
                style={isMine ? { background: `${ACCENT}14`, boxShadow: `0 0 0 1px ${ACCENT}66` } : undefined}
              >
                <h2 className="font-script text-[34px] leading-tight" style={{ color: ACCENT }}>
                  {table.label}
                </h2>
                <div className="mx-auto mt-1 mb-3 h-px w-16" style={{ background: `${ACCENT}80` }} />
                <ul className="space-y-1 font-serif text-[19px] leading-snug">
                  {table.guests.map((guest) => (
                    <li key={guest.id} className={guest.id === meId ? "font-semibold" : ""}>
                      {guest.id === meId ? (
                        <span className="rounded-md px-1.5" style={{ background: `${ACCENT}2e` }}>
                          {guest.name} · {t("вы", "you")}
                        </span>
                      ) : (
                        guest.name
                      )}
                    </li>
                  ))}
                </ul>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.article>
  );
}
