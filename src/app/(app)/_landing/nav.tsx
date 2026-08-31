"use client";

/**
 * Шапка титульной страницы: липкая, с подсветкой текущего раздела и
 * меню для телефона.
 *
 * Подсветка сделана наблюдателем, а не обработчиком прокрутки: считать
 * положение десятка блоков на каждый пиксель прокрутки — гарантированные
 * подтормаживания на телефоне.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Разделы шапки. `wide` — то, что показывается только на широком экране:
 * на планшете семь ссылок в ряд уже наезжают на кнопку кабинета, а
 * выбрасывать их из меню телефона незачем — там они помещаются все.
 */
const LINKS = [
  // Раздел с видео появляется только когда файл загружен, поэтому ссылка
  // на него условная: пункт меню, ведущий в никуда, — это обещание,
  // которого страница не выполняет.
  { href: "#rolik", label: "Видео", wide: true, needsVideo: true },
  { href: "#vozmozhnosti", label: "Возможности" },
  { href: "#kak", label: "Как это работает", wide: true },
  { href: "#demo", label: "Демо" },
  { href: "#galereya", label: "Галерея", wide: true },
  { href: "#ceny", label: "Цены" },
  { href: "#voprosy", label: "Вопросы" },
];

export function Nav({ userName, hasVideo }: { userName: string | null; hasVideo: boolean }) {
  const links = LINKS.filter((link) => !link.needsVideo || hasVideo);

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links.map((link) => document.getElementById(link.href.slice(1))).filter(
      (node): node is HTMLElement => node !== null,
    );

    const io = new IntersectionObserver(
      (entries) => {
        // Активным считаем самый верхний из видимых разделов: иначе при
        // длинном разделе подсветка прыгает на следующий раньше времени.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    sections.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [links]);

  // Ссылка вида «/#ceny» приходит из переписки и из подвала другой
  // страницы. Браузер прыгает к якорю до того, как разделы заняли свою
  // высоту, и промахивается тем сильнее, чем ниже раздел: до «Ролика»
  // он доезжал, до «Галереи» — уже нет.
  //
  // Поэтому доводим сами и не «три раза наугад», а пока страница
  // перестанет расти: следим за высотой документа и повторяем прицел,
  // но не дольше двух секунд — дальше это уже борьба с человеком,
  // который начал листать сам.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const target = document.getElementById(hash);
    if (!target) return;

    const started = Date.now();
    let lastHeight = -1;
    let stop = false;

    const aim = () => {
      if (stop || Date.now() - started > 2000) return;

      const height = document.documentElement.scrollHeight;
      // Высота устоялась и мы уже на месте — доводить больше нечего.
      const settled = height === lastHeight;
      lastHeight = height;

      if (!settled || Math.abs(target.getBoundingClientRect().top - 84) > 4) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }

      window.setTimeout(aim, 120);
    };

    // Человек тронул колесо или экран — прекращаем немедленно: спорить
    // с рукой пользователя худшее, что может делать страница.
    const surrender = () => {
      stop = true;
    };
    window.addEventListener("wheel", surrender, { passive: true, once: true });
    window.addEventListener("touchstart", surrender, { passive: true, once: true });
    // Клавиатура — тоже рука пользователя: Page Down и стрелки должны
    // уводить со страницы так же беспрекословно, как колесо мыши.
    window.addEventListener("keydown", surrender, { passive: true, once: true });

    aim();

    return () => {
      stop = true;
      window.removeEventListener("wheel", surrender);
      window.removeEventListener("touchstart", surrender);
      window.removeEventListener("keydown", surrender);
    };
  }, []);

  // Меню на телефоне закрывает страницу целиком — прокрутку под ним
  // надо остановить, иначе фон уезжает под пальцем.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "border-b border-stone-200/70 bg-[#fffdf9]/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <RingsGlyph />
          <span className="font-serif text-lg tracking-wide sm:text-xl">Вместе</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-stone-600 md:flex lg:gap-7">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`relative py-1 transition-colors hover:text-stone-950 ${
                link.wide ? "hidden lg:inline-block" : ""
              } ${active === link.href ? "text-stone-950" : ""}`}
            >
              {link.label}
              <span
                className={`absolute -bottom-0.5 left-0 h-px bg-stone-900 transition-all duration-300 ${
                  active === link.href ? "w-full" : "w-0"
                }`}
              />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {userName ? (
            <Link
              href="/app"
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white transition-transform hover:scale-[1.03]"
            >
              Личный кабинет
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-2 py-2 text-sm text-stone-600 hover:text-stone-950">
                Войти
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white transition-transform hover:scale-[1.03]"
              >
                Создать кабинет
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`h-px w-6 bg-stone-800 transition-transform duration-300 ${
              open ? "translate-y-[3.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-6 bg-stone-800 transition-transform duration-300 ${
              open ? "-translate-y-[3.5px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-stone-200/70 bg-[#fffdf9] px-4 pb-8 md:hidden">
          <nav className="flex flex-col">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-stone-200/70 py-3.5 text-stone-700"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-3">
            {userName ? (
              <Link href="/app" className="rounded-full bg-stone-900 px-5 py-3 text-center text-white">
                Личный кабинет
              </Link>
            ) : (
              <>
                <Link href="/register" className="rounded-full bg-stone-900 px-5 py-3 text-center text-white">
                  Создать кабинет
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-stone-300 px-5 py-3 text-center text-stone-700"
                >
                  Войти
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/** Два кольца — знак сервиса. Рисуем геометрией: это 200 байт вместо файла. */
function RingsGlyph() {
  return (
    <svg width="26" height="20" viewBox="0 0 34 24" aria-hidden="true">
      <circle cx="13" cy="13" r="8.5" fill="none" stroke="#8b6f47" strokeWidth="1.6" />
      <circle cx="21" cy="13" r="8.5" fill="none" stroke="#c2a878" strokeWidth="1.6" />
      <path d="M17 3.4 19.1 1 21.2 3.4 19.1 5.6Z" fill="#8b6f47" />
    </svg>
  );
}
