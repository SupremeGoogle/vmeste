"use client";

/**
 * Частые вопросы. Изначально закрыты, по клику раскрывается один ответ.
 *
 * Своя реализация вместо <details>: нужна плавная высота и стрелка,
 * а браузерный элемент анимируется по-разному в Safari и Chrome.
 * Разметка при этом остаётся кнопкой и областью с aria-атрибутами —
 * без этого голосовой доступ читает раздел как сплошной текст.
 */
import { useState } from "react";
import { FAQ_ITEMS as ITEMS } from "./faq-items";

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-stone-200 border-y border-stone-200">
      {ITEMS.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              aria-controls={`faq-${index}`}
              className="flex w-full items-center justify-between gap-4 py-4 text-left sm:gap-6 sm:py-5"
            >
              <span className={`text-[17px] transition-colors ${expanded ? "text-stone-950" : "text-stone-700"}`}>
                {item.q}
              </span>
              <span
                className={`shrink-0 text-stone-400 transition-transform duration-300 ${
                  expanded ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            <div
              id={`faq-${index}`}
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="pb-5 text-[15px] leading-relaxed text-stone-600 sm:pr-10">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
