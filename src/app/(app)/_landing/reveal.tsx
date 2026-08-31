"use client";

/**
 * Появление блока при прокрутке.
 *
 * Обёртка, а не хук в каждом компоненте: наблюдатель один на страницу,
 * а не по одному на каждый из трёх десятков блоков. Элемент, который уже
 * показался, из наблюдения выходит — обратно ничего не прячется, иначе
 * при прокрутке вверх страница мигает.
 *
 * Спрятанное состояние живёт в CSS, а не в состоянии React: иначе первый
 * кадр страницы приходил бы без анимации и дёргался после гидратации.
 * Цена такого решения — страница без JavaScript осталась бы пустой,
 * поэтому в разметке есть <noscript>, который показывает всё сразу.
 */
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

let shared: IntersectionObserver | null = null;
const shown = new WeakSet<Element>();

function observer(): IntersectionObserver {
  shared ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        shown.add(entry.target);
        entry.target.setAttribute("data-shown", "true");
        shared?.unobserve(entry.target);
      }
    },
    // Небольшой отступ снизу: блок «оживает» чуть раньше, чем упрётся
    // в край экрана, — иначе анимация всегда происходит за кадром.
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  return shared;
}

type Props = {
  children: ReactNode;
  /** Задержка, чтобы соседние карточки появлялись волной. */
  delay?: number;
  className?: string;
  as?: ElementType;
};

export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (shown.has(node)) {
      node.setAttribute("data-shown", "true");
      return;
    }
    const io = observer();
    io.observe(node);
    return () => io.unobserve(node);
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
