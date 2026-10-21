"use client";

/**
 * Конфетти на весь экран — один залп при появлении.
 *
 * Своё, на canvas, а не библиотека: нужен один залп после оплаты и
 * публикации, ради этого не стоит тянуть зависимость. Холст поверх всего
 * и не ловит нажатия, после залпа исчезает. Тем, кто попросил систему о
 * меньшем движении, не показываем вовсе.
 */
import { useEffect, useRef, useState } from "react";

const COLORS = ["#c9a46a", "#e8d3a8", "#8a6d3b", "#f5efe6", "#b5838d", "#7d8f69"];
const COUNT = 160;
const DURATION = 3800;

type Piece = { x: number; y: number; vx: number; vy: number; size: number; spin: number; angle: number; color: string; round: boolean };

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    // Пустой прозрачный холст без нажатий никому не мешает — просто не рисуем.
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Два залпа из нижних углов навстречу друг другу.
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const speed = 9 + Math.random() * 9;
      const angle = (left ? -60 : -120) + (Math.random() - 0.5) * 40;
      const rad = (angle * Math.PI) / 180;
      return {
        x: left ? -10 : w + 10,
        y: h * 0.75,
        vx: Math.cos(rad) * speed * (w < 640 ? 0.7 : 1),
        vy: Math.sin(rad) * speed,
        size: 5 + Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.3,
      };
    });

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = t > DURATION - 800 ? Math.max(0, (DURATION - t) / 800) : 1;
      for (const p of pieces) {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Сплющиваем по синусу — бумажка «кувыркается».
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.angle * 2)) + 1);
        }
        ctx.restore();
      }
      if (t < DURATION) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (done) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />;
}
