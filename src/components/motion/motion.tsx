"use client";

/**
 * Общие движения панели и титульной страницы — на библиотеке Motion.
 *
 * Все анимации берут время и кривые отсюда, а не придумывают свои: один
 * продукт должен двигаться в одном ритме. Пружина — для отклика на
 * действие (нажатие, наведение, переключение), плавная кривая — для
 * появления содержимого.
 *
 * `MotionConfig reducedMotion="user"` в корне глушит перемещения тем, кто
 * попросил систему о меньшем движении: прозрачность при этом остаётся,
 * и содержимое всё равно проявляется, а не застревает невидимым.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, MotionConfig, useInView, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps } from "motion/react";

export const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;
export const EASE_SOFT = [0.22, 0.61, 0.36, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      {children}
    </MotionConfig>
  );
}

/**
 * Смена раздела: новое содержимое чуть поднимается и проявляется.
 *
 * Первую отрисовку не анимируем — страница пришла с сервера уже готовой,
 * и прятать её до гидратации значит показать пустой экран на медленном
 * телефоне. Двигается только то, что пришло переходом.
 */
export function RouteTransition({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const [firstPath] = useState(pathname);
  const [moved, setMoved] = useState(false);
  // Обновление состояния прямо в рендере — законный приём React для
  // «запомнить, что было раньше»: до отрисовки он перерисует сразу.
  if (pathname !== firstPath && !moved) setMoved(true);

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={moved ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Число, которое «доезжает» до значения, когда показалось на экране, и
 * плавно перетекает при обновлении (ответил гость — «Придут» стало 62).
 * С сервера приходит сразу верное число: без JavaScript оно тоже верное.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("ru-RU"));
  const started = useRef(false);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    // Первый раз считаем от нуля, дальше — от того, что уже на экране.
    if (!started.current) {
      started.current = true;
      mv.set(0);
    }
    const controls = animate(mv, value, { duration: Math.min(1.4, 0.6 + Math.abs(value - mv.get()) / 300), ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, value, reduce, mv]);

  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}

/**
 * Карточка, которая отвечает на палец и курсор: приподнимается под
 * мышью и чуть проседает при нажатии. Только transform — без перерасчёта
 * раскладки, поэтому и на сетке из двадцати карточек не дёргается.
 */
export function Lift({ children, className, lift = 3, ...rest }: HTMLMotionProps<"div"> & { lift?: number }) {
  return (
    <motion.div className={className} whileHover={{ y: -lift }} whileTap={{ scale: 0.985 }} transition={SPRING} {...rest}>
      {children}
    </motion.div>
  );
}

/**
 * Лесенка: дети появляются по очереди с шагом 45 мс. Для списков, что
 * видны сразу при открытии раздела; ниже шести шагов задержку не копим.
 */
export function Stagger({ children, className, step = 0.045 }: { children: ReactNode; className?: string; step?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: step } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } },
} as const;

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div className={className} variants={staggerItem} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }} {...rest}>
      {children}
    </motion.div>
  );
}
