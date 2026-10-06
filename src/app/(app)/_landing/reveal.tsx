"use client";

/**
 * Появление блока при прокрутке — на Motion.
 *
 * Блок слегка поднимается, когда доезжает до экрана. Показавшийся блок обратно
 * не прячется: при прокрутке вверх страница не мигает.
 *
 * Содержимое видно уже с сервера: если наблюдатель прокрутки не сработал
 * при переходе по якорю, страница всё равно остаётся читаемой.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/components/motion/motion";

type Tag = "div" | "p" | "h1" | "h2" | "li" | "section";

type Props = {
  children: ReactNode;
  /** Задержка в миллисекундах, чтобы соседние карточки появлялись волной. */
  delay?: number;
  className?: string;
  as?: Tag;
};

export function Reveal({ children, delay = 0, className = "", as = "div" }: Props) {
  const Component = motion[as];
  return (
    <Component
      className={`reveal ${className}`}
      initial={{ opacity: 1, y: 8, filter: "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      // Отступ снизу: блок «оживает» чуть раньше, чем упрётся в край
      // экрана, — иначе анимация всегда происходит за кадром.
      viewport={{ once: true, margin: "0px 0px -12% 0px", amount: 0.08 }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: EASE_OUT }}
    >
      {children}
    </Component>
  );
}
