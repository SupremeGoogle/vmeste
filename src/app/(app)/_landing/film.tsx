"use client";

/**
 * Ролик о сервисе — шесть кадров с наездом камеры, титрами и управлением.
 *
 * Почему не mp4: минутный ролик в приличном качестве — это 8–15 мегабайт,
 * которые качаются на телефоне в дороге и не показывают ничего, пока не
 * докачаются. Здесь «плёнка» собрана из тех же векторных сцен, что и
 * галерея: приходит вместе с разметкой, стартует мгновенно, тянется в 4K
 * без мыла и одинаково читается на проекторе и на телефоне. Движение —
 * трансформации, которые считает видеокарта, а не главный поток.
 *
 * Управление настоящее: пауза, перемотка по кадрам, подпись под каждым.
 * Ролик останавливается, когда уезжает с экрана: крутить анимацию в
 * невидимой части страницы — это разряженный телефон и ничего больше.
 */
import { useEffect, useRef, useState } from "react";
import { Scene, type SceneId } from "./scenes";

type Shot = {
  scene: SceneId;
  title: string;
  caption: string;
  /** Куда ведёт камера: где кадр начинается и где заканчивается. */
  from: string;
  to: string;
};

const SHOTS: Shot[] = [
  {
    scene: "invitation",
    title: "Приглашение",
    caption: "Своя страница у каждого гостя — с именем и ответом в один тап",
    from: "scale(1.18) translate(2%, 2%)",
    to: "scale(1.02) translate(-1%, -1%)",
  },
  {
    scene: "rings",
    title: "Ответы гостей",
    caption: "Кто придёт, с кем и что ест — считается само",
    from: "scale(1.03)",
    to: "scale(1.2) translate(-3%, -2%)",
  },
  {
    scene: "hall",
    title: "Рассадка",
    caption: "План зала мышью: круглые столы, прямоугольные, президиум",
    from: "scale(1.24) translate(6%, 4%)",
    to: "scale(1.02) translate(-2%, 0%)",
  },
  {
    scene: "table",
    title: "Вход по QR",
    caption: "Гость находит себя по имени и видит номер своего стола",
    from: "scale(1.02)",
    to: "scale(1.2) translate(4%, -3%)",
  },
  {
    scene: "photo",
    title: "Экран в зале",
    caption: "Фотографии гостей на проекторе — после вашего одобрения",
    from: "scale(1.16) translate(-4%, 2%)",
    to: "scale(1.02) translate(2%, -2%)",
  },
  {
    scene: "dance",
    title: "И сам вечер",
    caption: "Розыгрыш среди пришедших, пожелания и всё, ради чего это затевалось",
    from: "scale(1.02)",
    to: "scale(1.18) translate(0%, -3%)",
  },
];

/** Длительность кадра. Меньше — не успеваешь прочитать титр. */
const SHOT_MS = 4200;

export function Film() {
  const ref = useRef<HTMLDivElement>(null);
  const [shot, setShot] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Автозапуск только когда ролик видно и человек не просил меньше
  // движения. В кадре, а не в теле эффекта: иначе перерисовка каскадом.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raf = requestAnimationFrame(() => setPlaying(visible && !reduced));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setShot((value) => (value + 1) % SHOTS.length),
      SHOT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, shot]);

  const current = SHOTS[shot];

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl bg-stone-950 shadow-[0_30px_80px_-40px_rgba(43,38,34,0.85)] sm:rounded-3xl"
    >
      {/* Кадр 4:3 на телефоне и 16:9 на широком экране: вертикальный экран
          иначе оставляет чёрную полосу в треть высоты. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-video">
        {SHOTS.map((item, index) => (
          <div
            key={item.scene}
            // Текущий кадр поднят над остальными явно. Кадры лежат стопкой
            // в порядке разметки, и без этого поздний кадр оказывается выше
            // раннего: пока растворение не закончилось — а браузер его
            // придерживает, когда вкладка не на виду, — под свежим титром
            // стоит картинка из будущего. Слой решает это раз и навсегда,
            // не полагаясь на то, что переход успел доиграть.
            className={`absolute inset-0 transition-opacity duration-[900ms] ${
              index === shot ? "z-10 opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== shot}
          >
            <div
              // Ключ перезапускает наезд при каждом заходе на кадр,
              // иначе второй круг ролика идёт статичной картинкой.
              key={`${index}-${shot}`}
              className="film-move h-full w-full"
              style={
                {
                  "--from": item.from,
                  "--to": item.to,
                  animationDuration: `${SHOT_MS + 900}ms`,
                  animationPlayState: index === shot && playing ? "running" : "paused",
                } as React.CSSProperties
              }
            >
              <Scene id={item.scene} className="h-full w-full" />
            </div>
          </div>
        ))}

        {/* Затемнение снизу: без него титр теряется на светлой сцене. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-stone-950/85 to-transparent" />

        <div key={shot} className="film-caption absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <p className="text-[10px] tracking-[0.28em] text-stone-400 uppercase">
            {String(shot + 1).padStart(2, "0")} / {String(SHOTS.length).padStart(2, "0")}
          </p>
          <p className="mt-2 font-serif text-2xl text-stone-50 sm:text-4xl">{current.title}</p>
          <p className="mt-1.5 max-w-md text-sm leading-snug text-stone-300 sm:text-base">
            {current.caption}
          </p>
        </div>

        {/* Зерно плёнки: плоские заливки без него выглядят как слайд. */}
        <div className="film-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Пауза" : "Смотреть"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-stone-100 transition-colors hover:bg-white/20"
        >
          {playing ? (
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" fill="currentColor">
              <rect width="4" height="14" rx="1" />
              <rect x="8" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" fill="currentColor">
              <path d="M1 1.2 11 7 1 12.8z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 gap-1.5">
          {SHOTS.map((item, index) => (
            <button
              key={item.scene}
              type="button"
              onClick={() => {
                setShot(index);
                setPlaying(true);
              }}
              aria-label={`Кадр ${index + 1}: ${item.title}`}
              className="h-7 flex-1"
            >
              <span className="relative block h-1 overflow-hidden rounded-full bg-white/15">
                <span
                  key={`${index}-${shot}-${playing}`}
                  className={`block h-full origin-left rounded-full bg-[#e0cba8] ${
                    index < shot ? "scale-x-100" : index === shot ? "film-progress" : "scale-x-0"
                  }`}
                  style={
                    index === shot
                      ? {
                          animationDuration: `${SHOT_MS}ms`,
                          animationPlayState: playing ? "running" : "paused",
                        }
                      : undefined
                  }
                />
              </span>
            </button>
          ))}
        </div>

        <span className="hidden shrink-0 text-xs text-stone-400 lg:block">
          Нарисован векторами — весит меньше одной фотографии
        </span>
      </div>
    </div>
  );
}
