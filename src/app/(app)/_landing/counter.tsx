"use client";

/**
 * Число, которое досчитывается до значения, когда доезжает до экрана.
 *
 * Считаем по времени кадра, а не по фиксированному шагу: на слабом
 * телефоне шаг «плюс один за кадр» превращает 1200 в десять секунд
 * ожидания.
 */
import { useEffect, useRef, useState } from "react";

type Props = {
  to: number;
  suffix?: string;
  duration?: number;
};

export function Counter({ to, suffix = "", duration = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let raf = 0;

    // Человеку, попросившему меньше движения, число показываем сразу —
    // но всё равно в следующем кадре: менять состояние прямо в теле
    // эффекта значит заказать лишнюю перерисовку всей страницы.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          // Замедление к концу: числу полагается «доехать», а не врезаться.
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(to * eased));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("ru-RU")}
      {suffix}
    </span>
  );
}
