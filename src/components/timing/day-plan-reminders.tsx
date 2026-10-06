"use client";

/**
 * Напоминания об этапах дня, пока план открыт на телефоне.
 *
 * Уведомления браузера приходят только при открытой странице, а на iPhone —
 * только если сайт добавлен на экран «Домой». Поэтому рядом всегда есть
 * календарь: событие с будильником сработает и при закрытом браузере.
 *
 * План сам подтягивает изменения раз в 30 секунд — ведущий видит, что
 * координатор отметил этап на другом телефоне. Но не тогда, когда человек
 * что-то правит: обновление сбросило бы раскрытую форму этапа.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ReminderStep = { id: string; title: string; responsible: string; startsAt: string; reminderMinutes: number; status: string };

/** Сколько этап ещё считается «пора начинать» после своего времени. */
const LATE_MS = 15 * 60_000;

function isEditing(): boolean {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest("input, textarea, select")) return true;
  return document.querySelector("details[open] form") !== null;
}

export function DayPlanReminders({ eventId, steps, initialNow, calendarHref }: {
  eventId: string;
  steps: ReminderStep[];
  initialNow: number;
  calendarHref: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const delivered = useRef(new Set<string>());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const refresh = () => {
      if (document.visibilityState === "visible" && !isEditing()) router.refresh();
    };
    const clock = setInterval(tick, 10_000);
    const sync = setInterval(refresh, 30_000);
    const focus = () => {
      tick();
      refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(clock);
      clearInterval(sync);
      window.removeEventListener("focus", focus);
    };
  }, [router]);

  const due = steps.filter((step) => {
    const start = Date.parse(step.startsAt);
    return step.status === "PENDING" && now >= start - step.reminderMinutes * 60_000 && now <= start + LATE_MS;
  });

  useEffect(() => {
    if (!enabled || !("Notification" in window) || Notification.permission !== "granted") return;
    for (const step of due) {
      const start = Date.parse(step.startsAt);
      // Ключ с временем и сроком: перенесли этап — напоминание придёт заново.
      const key = `day-reminder:${eventId}:${step.id}:${step.startsAt}:${step.reminderMinutes}`;
      if (delivered.current.has(key)) continue;
      delivered.current.add(key);
      try {
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, "1");
      } catch {
        // Приватный режим: помним только до закрытия страницы.
      }
      const when = start > now ? `Через ${Math.ceil((start - now) / 60_000)} мин` : "Пора начинать";
      try {
        new Notification(step.title, { body: [when, step.responsible].filter(Boolean).join(" · "), tag: key });
      } catch {
        // Поддержку проверили при включении; сюда попадаем только в редком случае.
      }
    }
  }, [due, enabled, eventId, now]);

  async function enable() {
    if (!("Notification" in window)) {
      setMessage("Этот браузер не показывает уведомления — добавьте план в календарь.");
      return;
    }
    const permission = await Notification.requestPermission().catch(() => "denied" as const);
    if (permission !== "granted") {
      setMessage("Уведомления не разрешены — добавьте план в календарь.");
      return;
    }
    // Android Chrome разрешение даёт, а уведомление со страницы показать
    // не может. Пробное уведомление заодно подтверждает, что всё работает.
    try {
      new Notification("Напоминания включены", { body: "Пока эта страница открыта, о каждом этапе придёт уведомление." });
    } catch {
      setMessage("Этот браузер не показывает уведомления со страницы — добавьте план в календарь.");
      return;
    }
    setEnabled(true);
    setMessage("");
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={enable} disabled={enabled} className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-60">
          {enabled ? "Напоминания включены" : "Напоминать на этом телефоне"}
        </button>
        <a href={calendarHref} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
          Добавить в календарь
        </a>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Календарь напомнит и при закрытом браузере. Время — по часовому поясу площадки.
      </p>
      {message ? <p role="status" className="mt-2 text-sm text-stone-600">{message}</p> : null}
      {due.length > 0 ? (
        <ul aria-live="polite" className="mt-3 space-y-2">
          {due.map((step) => {
            const start = Date.parse(step.startsAt);
            return (
              <li key={step.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <b className="font-medium">{step.title}</b> — {start > now ? `через ${Math.ceil((start - now) / 60_000)} мин` : "пора начинать"}
                {step.responsible ? `, ${step.responsible}` : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
