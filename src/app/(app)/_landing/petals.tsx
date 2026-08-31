"use client";

/**
 * Лепестки, падающие на первом экране.
 *
 * Позиции разбрасываются в useEffect, а не при отрисовке: случайные числа
 * на сервере и на клиенте разные, и React ругается на расхождение разметки.
 * До гидратации лепестков просто нет — на первый экран это не влияет.
 */
import { useEffect, useState } from "react";

type Petal = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
};

const COLORS = ["#e8d5c4", "#f0dcd2", "#dfc9ae", "#efe2d0"];

export function Petals({ count = 9 }: { count?: number }) {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Не в теле эффекта: лишняя перерисовка на первом же кадре страницы
    // стоит дороже, чем один пропущенный кадр у украшения.
    const raf = requestAnimationFrame(() =>
      setPetals(
      Array.from({ length: count }, (_, index) => ({
        left: (index / count) * 100 + Math.random() * 8,
        size: 7 + Math.random() * 8,
        duration: 14 + Math.random() * 12,
        delay: -Math.random() * 20,
        color: COLORS[index % COLORS.length],
        })),
      ),
    );

    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {petals.map((petal, index) => (
        <span
          key={index}
          className="petal"
          style={{
            left: `${petal.left}%`,
            width: petal.size,
            height: petal.size,
            background: petal.color,
            animationDuration: `${petal.duration}s`,
            animationDelay: `${petal.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
