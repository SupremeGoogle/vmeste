"use client";

/**
 * Видео на первом экране.
 *
 * Клиентский компонент по одной причине: на телефоне автозапуск часто не
 * срабатывает — экономия трафика, режим энергосбережения, настройка
 * браузера, — и об этом надо узнать и показать заставку, а не чёрный
 * прямоугольник. Сервер об этом знать не может.
 *
 * Видео здесь — украшение, а не содержание: без него страница выглядит
 * законченной, поэтому оно и не грузится, пока не выехало на экран, и
 * снимается целиком при `prefers-reduced-motion`.
 */
import { useEffect, useRef, useState } from "react";

export function HeroVideo({ src, poster }: { src: string; poster: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const node = video.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // play() возвращает обещание, которое браузер отклоняет, если
    // автозапуск запрещён. Молча: без этого обработчика в консоли
    // остаётся необработанное отклонение, а на экране — пустота.
    node.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );

    // Ушли с вкладки — останавливаем: греть телефон фоновым видео незачем.
    const onVisibility = () => {
      if (document.hidden) node.pause();
      else void node.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <video
      ref={video}
      src={src}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
        playing ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
