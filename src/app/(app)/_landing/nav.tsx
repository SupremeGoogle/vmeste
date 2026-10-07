"use client";

/**
 * Шапка титульной страницы: липкая, с подсветкой текущего раздела и
 * меню для телефона.
 *
 * Подсветка сделана наблюдателем, а не обработчиком прокрутки: считать
 * положение десятка блоков на каждый пиксель прокрутки — гарантированные
 * подтормаживания на телефоне.
 */
import { BrandLogo } from "@/components/brand";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Разделы шапки — те же, что в меню телефона. */
const LINKS = [
  { href: "#vozmozhnosti", label: "Возможности" },
  { href: "#priglasheniya", label: "Приглашения" },
  { href: "#demo", label: "Рассадка" },
  { href: "#voprosy", label: "Вопросы" },
];

export function Nav({ userName }: { userName: string | null }) {
  const header = useRef<HTMLElement>(null);
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
    const sections = LINKS.map((link) => document.getElementById(link.href.slice(1))).filter(
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
  }, []);

  // Ссылка вида «/#voprosy» приходит из переписки и из подвала другой
  // страницы. Браузер прыгает к якорю до того, как разделы заняли свою
  // высоту, и промахивается тем сильнее, чем ниже раздел.
  //
  // Поэтому доводим сами: следим за высотой документа и повторяем прицел,
  // пока страница не перестанет расти, но не дольше двух секунд — дальше
  // это уже борьба с человеком, который начал листать сам.
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

    // Человек тронул колесо, экран или клавиатуру — прекращаем немедленно:
    // спорить с рукой пользователя худшее, что может делать страница.
    const surrender = () => {
      stop = true;
    };
    window.addEventListener("wheel", surrender, { passive: true, once: true });
    window.addEventListener("touchstart", surrender, { passive: true, once: true });
    window.addEventListener("keydown", surrender, { passive: true, once: true });

    aim();

    return () => {
      stop = true;
      window.removeEventListener("wheel", surrender);
      window.removeEventListener("touchstart", surrender);
      window.removeEventListener("keydown", surrender);
    };
  }, []);

  // Компактное выпадающее меню закрывается снаружи и клавишей Escape.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <header ref={header} className="home-nav home-nav--clay" data-solid={scrolled || open}>
      <div className="home-container home-nav-bar">
        <Link href="/" className="home-brand" aria-label="Вместе — на главную">
          <BrandLogo adaptive={false} />
        </Link>

        <nav className="home-nav-links" aria-label="Разделы">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={active === link.href ? "true" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="home-nav-actions">
          {userName ? (
            <Link href="/app" className="home-button">Личный кабинет</Link>
          ) : (
            <>
              <Link href="/login" className="home-nav-login">Войти</Link>
              <Link href="/register" className="home-button">Создать свадьбу</Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="home-mobile-menu"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          className="home-burger"
        >
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div id="home-mobile-menu" className="home-menu">
          <div className="home-container">
            <nav aria-label="Разделы">
              {LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="home-menu-actions">
              {userName ? (
                <Link href="/app" className="home-button">Личный кабинет</Link>
              ) : (
                <>
                  <Link href="/register" className="home-button">Создать свадьбу</Link>
                  <Link href="/login" className="home-button home-button--outline">Войти</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
