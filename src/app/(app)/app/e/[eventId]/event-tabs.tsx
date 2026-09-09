"use client";

/**
 * Лента разделов мероприятия.
 *
 * Живёт на клиенте ради одной вещи, которую сервер не знает: какой
 * раздел открыт сейчас. Раньше активной вкладки не было вовсе — под
 * лентой шла полоса прокрутки, и её принимали за подчёркивание, хотя
 * стояла она под совершенно другим разделом.
 *
 * Здесь же решается вторая беда узкого экрана: одиннадцать разделов
 * не помещаются в ряд, и открыв «Настройки», человек видел ленту,
 * отмотанную в начало, — без единого признака, что он вообще где-то.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLElement>(null);
  const activeTab = useRef<HTMLAnchorElement>(null);

  // Нужны ли подсказки, что лента продолжается за краем экрана.
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const base = `/app/e/${eventId}`;
  const tabs = [
    { href: base, label: "Обзор" },
    { href: `${base}/guests`, label: "Гости" },
    { href: `${base}/seating`, label: "Рассадка" },
    { href: `${base}/invite`, label: "Приглашение" },
    { href: `${base}/rsvp`, label: "Ответы" },
    { href: `${base}/photos`, label: "Фото" },
    { href: `${base}/wishes`, label: "Пожелания" },
    { href: `${base}/raffle`, label: "Розыгрыш" },
    { href: `${base}/screen`, label: "Экран" },
    { href: `${base}/print`, label: "Печать и QR" },
    { href: `${base}/settings`, label: "Настройки" },
  ];

  /**
   * «Обзор» лежит по адресу самого мероприятия, а значит его путь —
   * начало путей всех остальных разделов. Сравнивать через startsWith
   * можно всем, кроме него: иначе «Обзор» горел бы всегда и везде.
   */
  const isActive = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href);

  function syncOverflow() {
    const el = scroller.current;
    if (!el) return;
    // Один пиксель запаса: дробное масштабирование делает scrollLeft
    // нецелым, и без допуска стрелка справа не гаснет до конца.
    setOverflow({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }

  useEffect(() => {
    // Подтянуть открытый раздел в поле зрения. `block: "nearest"`
    // важен: без него браузер тянет и вертикаль, уводя страницу вниз.
    activeTab.current?.scrollIntoView({ block: "nearest", inline: "center" });
    syncOverflow();
  }, [pathname]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <nav
        ref={scroller}
        onScroll={syncOverflow}
        aria-label="Разделы мероприятия"
        className="no-scrollbar -mx-4 mt-4 flex gap-1 overflow-x-auto px-4 whitespace-nowrap sm:mx-0 sm:gap-2 sm:px-0"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              ref={active ? activeTab : undefined}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative shrink-0 rounded-t-md px-3 pt-1.5 pb-3 text-sm transition-colors duration-200 ${
                active
                  ? "font-medium text-stone-900"
                  : "text-stone-500 hover:bg-stone-100/70 hover:text-stone-900"
              }`}
            >
              {tab.label}
              {/*
                Подчёркивание — отдельным слоем, а не border-ом: у него
                своя анимация появления, и оно не дёргает базовую линию
                текста при переключении разделов.
              */}
              <span
                aria-hidden
                className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-stone-900 transition-transform duration-200 ${
                  active ? "scale-x-100" : "scale-x-0"
                }`}
                style={{ transitionTimingFunction: "var(--ease-soft)" }}
              />
            </Link>
          );
        })}
      </nav>

      {/* Растушёвка у края: единственный честный признак, что лента
          продолжается. `pointer-events-none` обязателен — иначе полоска
          перехватывала бы нажатие на крайнюю вкладку. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 sm:hidden ${
          overflow.left ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 sm:hidden ${
          overflow.right ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
