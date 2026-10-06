"use client";

/**
 * Приглашение в корпусе настоящего iPhone.
 *
 * Внутри — живая страница во фрейме шириной телефона (390 × 844 точки),
 * уменьшенная до экрана корпуса: гость увидит ровно это, а не нарисованную
 * копию. Корпус собран так, как выглядит телефон в руке: титановая рамка
 * с бликом, чёрная окантовка экрана, Dynamic Island, строка состояния,
 * полоска «домой» и кнопки на торцах.
 *
 * Строка состояния не лежит поверх обложки, а стоит над страницей и
 * берёт её цвет (`theme-color` или фон `body`), как это делает Safari:
 * иначе часы и значки сети перекрывали бы имена на обложке.
 *
 * `interactive` — можно листать приглашение прямо в телефоне (обзор
 * мероприятия). На витрине шаблонов фрейм касаний не принимает: колесо
 * мыши над ним прокручивало бы образец вместо списка.
 *
 * `image` — вместо живой страницы готовая картинка первого экрана (витрина
 * шаблонов: 23 живых фрейма грузили бы 23 приглашения разом). Картинку
 * снимает scripts/template-previews.mjs, он же запоминает цвет строки состояния.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const SCREEN_W = 390;
const SCREEN_H = 844;
/** Высота строки состояния iPhone 15/16 в точках. */
const STATUS_H = 54;

/** Тёмный ли цвет — по нему выбираем белые или чёрные значки. */
function isDark(color: string): boolean {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  let rgb: number[] | null = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  if (!rgb) {
    const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
    if (hex) {
      const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
      rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    }
  }
  if (!rgb) return false;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4;
}

function StatusBar({ dark }: { dark: boolean }) {
  const ink = dark ? "#fff" : "#111";
  return (
    <div className="flex h-full items-center justify-between px-[34px] pt-[6px]" style={{ color: ink }}>
      <span className="text-[17px] font-semibold tracking-[-0.01em]" style={{ fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
        9:41
      </span>
      <span className="flex items-center gap-[7px]">
        {/* Сеть */}
        <svg width="19" height="12" viewBox="0 0 19 12" fill={ink} aria-hidden>
          <rect x="0" y="8" width="3.2" height="4" rx="1" />
          <rect x="5" y="5.5" width="3.2" height="6.5" rx="1" />
          <rect x="10" y="3" width="3.2" height="9" rx="1" />
          <rect x="15" y="0" width="3.2" height="12" rx="1" />
        </svg>
        {/* Wi-Fi */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill={ink} aria-hidden>
          <path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.3-1.3A10.6 10.6 0 0 0 8.5.4 10.6 10.6 0 0 0 .9 3.5l1.3 1.3a8.8 8.8 0 0 1 6.3-2.5Z" />
          <path d="M8.5 5.9c1.4 0 2.7.5 3.7 1.4l1.3-1.3a7.2 7.2 0 0 0-10 0l1.3 1.3a5.3 5.3 0 0 1 3.7-1.4Z" />
          <path d="M8.5 9.3c.5 0 .9.2 1.2.5L8.5 11 7.3 9.8c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        {/* Батарея */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={ink} strokeOpacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill={ink} />
          <path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill={ink} fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

export function IphoneFrame({
  src,
  image,
  title,
  width = 260,
  interactive = false,
  className = "",
  children,
}: {
  src: string;
  /** Картинка первого экрана вместо живой страницы и цвет строки состояния над ней. */
  image?: { src: string; bar: string };
  title: string;
  /** Ширина экрана в корпусе, px. Корпус целиком на ~24 px шире. */
  width?: number;
  interactive?: boolean;
  className?: string;
  /** Что положить поверх телефона (например, кнопку выбора шаблона). */
  children?: React.ReactNode;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const picture = useRef<HTMLImageElement>(null);
  const [bar, setBar] = useState<{ color: string; dark: boolean }>(
    image ? { color: image.bar, dark: isDark(image.bar) } : { color: "#f6f1e8", dark: false },
  );
  const [loaded, setLoaded] = useState(false);

  // Картинка из кеша успевает загрузиться до гидрации, и onLoad React уже не
  // увидит — тогда она так и осталась бы прозрачной под заглушкой.
  useEffect(() => {
    if (picture.current?.complete && picture.current.naturalWidth > 0) setLoaded(true);
  }, []);

  const scale = width / SCREEN_W;
  const height = Math.round(SCREEN_H * scale);
  const bezel = Math.max(7, Math.round(width * 0.04));
  const radius = Math.round(width * 0.155);

  // Цвет строки состояния — по самой странице: тот же источник, что у Safari.
  const onLoad = useCallback(() => {
    setLoaded(true);
    try {
      const doc = frame.current?.contentDocument;
      if (!doc) return;
      // Полоса прокрутки Windows посреди экрана телефона выглядит чужой:
      // в настоящем телефоне её нет.
      const style = doc.createElement("style");
      style.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}";
      doc.head?.appendChild(style);
      const meta = doc.querySelector('meta[name="theme-color"]')?.getAttribute("content");
      const body = doc.body ? getComputedStyle(doc.body).backgroundColor : "";
      const color = meta || (body && body !== "rgba(0, 0, 0, 0)" ? body : "#f6f1e8");
      setBar({ color, dark: isDark(color) });
    } catch {
      // Чужой адрес — оставляем нейтральную строку состояния.
    }
  }, []);

  return (
    <div className={`relative mx-auto w-fit ${className}`}>
      {/* Кнопки на торцах: действие и громкость слева, питание справа. */}
      <span aria-hidden className="absolute rounded-l-[2px] bg-gradient-to-r from-[#55565a] to-[#8d8e93]" style={{ left: -2, top: height * 0.17, width: 3, height: height * 0.05 }} />
      <span aria-hidden className="absolute rounded-l-[2px] bg-gradient-to-r from-[#55565a] to-[#8d8e93]" style={{ left: -2, top: height * 0.25, width: 3, height: height * 0.085 }} />
      <span aria-hidden className="absolute rounded-l-[2px] bg-gradient-to-r from-[#55565a] to-[#8d8e93]" style={{ left: -2, top: height * 0.355, width: 3, height: height * 0.085 }} />
      <span aria-hidden className="absolute rounded-r-[2px] bg-gradient-to-l from-[#55565a] to-[#8d8e93]" style={{ right: -2, top: height * 0.28, width: 3, height: height * 0.13 }} />

      {/* Титановая рамка: тонкий светлый кант и тёмная окантовка экрана. */}
      <div
        className="relative bg-[linear-gradient(145deg,#9a9ba0_0%,#5f6065_22%,#2d2e32_50%,#6b6c71_78%,#a5a6ab_100%)] p-[2px] shadow-[0_30px_60px_-22px_rgba(30,22,12,.55),0_10px_24px_-12px_rgba(30,22,12,.35)]"
        style={{ borderRadius: radius + bezel + 2 }}
      >
        <div className="relative bg-[#0b0b0d]" style={{ padding: bezel, borderRadius: radius + bezel }}>
          <div
            className="relative overflow-hidden bg-[#0b0b0d]"
            style={{ width, height, borderRadius: radius, isolation: "isolate" }}
          >
            {/* Строка состояния в цвет страницы. */}
            <div
              className="absolute inset-x-0 top-0 z-10 origin-top-left transition-colors duration-300"
              style={{ width: SCREEN_W, height: STATUS_H, transform: `scale(${scale})`, background: bar.color }}
            >
              <StatusBar dark={bar.dark} />
            </div>

            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- готовый webp нужного размера, оптимизатор Next тут лишний
              <img
                ref={picture}
                src={image.src}
                alt={title}
                loading="lazy"
                decoding="async"
                width={SCREEN_W}
                height={SCREEN_H - STATUS_H}
                onLoad={() => setLoaded(true)}
                className="absolute left-0 z-[1] w-full object-cover object-top"
                style={{ top: Math.round(STATUS_H * scale), height: height - Math.round(STATUS_H * scale) }}
              />
            ) : (
            <iframe
              ref={frame}
              src={src}
              title={title}
              loading="lazy"
              onLoad={onLoad}
              scrolling={interactive ? "yes" : "no"}
              tabIndex={interactive ? 0 : -1}
              aria-hidden={interactive ? undefined : true}
              sandbox="allow-scripts allow-same-origin"
              className={`no-scrollbar absolute left-0 origin-top-left border-0 bg-white transition-opacity duration-500 ${interactive ? "" : "pointer-events-none"} ${loaded ? "opacity-100" : "opacity-0"}`}
              style={{
                top: Math.round(STATUS_H * scale),
                width: SCREEN_W,
                height: SCREEN_H - STATUS_H,
                transform: `scale(${scale})`,
              }}
            />
            )}

            {/* Пока страница грузится — мягкая заглушка, а не белый лист. */}
            {!loaded && <div aria-hidden className="skeleton absolute inset-0 -z-0" style={{ top: Math.round(STATUS_H * scale) }} />}

            {/* Dynamic Island. */}
            <span
              aria-hidden
              className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-black"
              style={{ top: Math.round(11 * scale), width: Math.round(124 * scale), height: Math.round(36 * scale) }}
            />
            {/* Полоска «домой». */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full mix-blend-difference"
              style={{ bottom: Math.round(8 * scale), width: Math.round(134 * scale), height: Math.max(3, Math.round(5 * scale)), background: "rgba(255,255,255,.75)" }}
            />
            {/* Блик стекла. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(115deg,rgba(255,255,255,.14)_0%,rgba(255,255,255,0)_32%,rgba(255,255,255,0)_70%,rgba(255,255,255,.06)_100%)]"
              style={{ borderRadius: radius }}
            />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
