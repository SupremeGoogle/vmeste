"use client";

/**
 * Частые вопросы. Раскрывается по клику, открыт всегда один.
 *
 * Своя реализация вместо <details>: нужна плавная высота и стрелка,
 * а браузерный элемент анимируется по-разному в Safari и Chrome.
 * Разметка при этом остаётся кнопкой и областью с aria-атрибутами —
 * без этого голосовой доступ читает раздел как сплошной текст.
 */
import { useState } from "react";

const ITEMS = [
  {
    q: "Гостю нужно что-то устанавливать?",
    a: "Нет. Приглашение открывается по ссылке в браузере, а на входе достаточно снять QR-код камерой. Ни приложения, ни регистрации, ни пароля у гостя нет — только именная ссылка.",
  },
  {
    q: "А если в день свадьбы упадёт интернет?",
    a: "План зала, список гостей и таблички с номерами столов печатаются заранее — PDF собирается из тех же данных, что и экран. Свадьба не должна зависеть от вайфая в усадьбе.",
  },
  {
    q: "Кто видит фотографии гостей?",
    a: "До вашего одобрения — никто, кроме вас. Гость отправляет снимок со своего телефона, вы одобряете, и только тогда фотография появляется на экране в зале.",
  },
  {
    q: "Можно перенести список гостей из моей таблицы?",
    a: "Да, загрузкой CSV. Импорт понимает выгрузки из Excel, чинит телефоны, которые Excel превратил в «9.15E+11», и перед сохранением показывает, что именно попадёт в базу.",
  },
  {
    q: "У меня несколько свадеб одновременно — не перепутается?",
    a: "Каждое мероприятие живёт отдельно: гости, столы, фотографии и ссылки не пересекаются между свадьбами и тем более между организаторами. Это проверяется автоматически на каждом запросе.",
  },
  {
    q: "Что будет с данными после свадьбы?",
    a: "Мероприятие уходит в архив: гостевые ссылки и QR-код перестают работать, а список гостей и фотографии остаются у вас в кабинете, пока вы не удалите их сами.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

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
