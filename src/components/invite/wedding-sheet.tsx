"use client";

/**
 * Боковая панель «Имена, дата и место» в визуальном редакторе.
 *
 * Раньше эта форма стояла над приглашением и встречала человека стеной из
 * двенадцати полей. Теперь редактор открывается сразу на самом приглашении,
 * а форма выезжает по кнопке — или по щелчку на дату на обложке: дату со
 * временем удобнее выбрать в календаре, чем печатать текстом.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { EASE_OUT } from "@/components/motion/motion";
import { useT } from "@/components/i18n-provider";

export function WeddingSheet({
  open, focus, onClose, children,
}: {
  open: boolean;
  /** Имя поля, в которое сразу поставить курсор (например, `eventDate`). */
  focus: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Поле фокусируем после того, как панель оказалась в разметке.
    const timer = window.setTimeout(() => {
      const field = panel.current?.querySelector<HTMLInputElement>(focus ? `[name="${focus}"]` : "input, select");
      field?.focus();
      if (focus && field && "showPicker" in field) {
        try { field.showPicker(); } catch { /* браузер разрешает календарь только по жесту — не страшно */ }
      }
    }, 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open, focus, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-[2px] sm:items-stretch"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("Имена, дата и место", "Names, date & venue")}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 shadow-2xl sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-2xl sm:p-6"
            initial={{ x: 0, y: 40, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.2 } }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg text-stone-900">{t("Имена, дата и место", "Names, date & venue")}</h2>
                <p className="mt-1 text-sm text-stone-500">{t("Общие для всего приглашения: обложка, «Где», карта, обратный отсчёт и анкета обновятся вместе.", "Shared across the whole invitation: the cover, venue, map, countdown and RSVP form all update together.")}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">{t("Закрыть", "Close")}</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
