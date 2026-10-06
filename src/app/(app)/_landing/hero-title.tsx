"use client";

/**
 * Заголовок первого экрана: слова проявляются по очереди, как надпись,
 * которую выводят пером. Строки — отдельными массивами, чтобы перенос на
 * широком экране стоял там, где задумано, а на телефоне текст тёк сам.
 */
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef, type ReactNode } from "react";
import { EASE_OUT } from "@/components/motion/motion";

export function HeroTitle({ lines, className, delay = 0.08 }: { lines: string[]; className?: string; delay?: number }) {
  let index = 0;
  return (
    <h1 className={`reveal ${className ?? ""}`} aria-label={lines.join(" ")}>
      {lines.map((line, lineIndex) => (
        <span key={line} aria-hidden>
          {lineIndex > 0 && <br className="hidden sm:block" />}
          {line.split(" ").map((word) => {
            const i = index++;
            return (
              <Fragment key={`${word}-${i}`}>
              <motion.span
                className="inline-block will-change-transform"
                initial={{ opacity: 0, y: "0.45em", filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: delay + i * 0.07, ease: EASE_OUT }}
              >
                {word}
              </motion.span>{" "}
              </Fragment>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/**
 * Лёгкий параллакс: блок едет чуть медленнее страницы. Сдвиг маленький
 * (по умолчанию 40 px на всю высоту экрана) — больше уже укачивает, а тем,
 * кто просил меньше движения, не двигаем вовсе.
 */
export function Parallax({ children, className, distance = 40 }: { children: ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);
  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
