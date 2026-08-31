"use client";

/**
 * Галерея свадебных сцен: мозаика, которая на телефоне превращается в
 * ленту с прокруткой пальцем, а на широком экране — в кладку из плиток
 * разного размера.
 *
 * Одинаковые квадратики читаются как таблица, а не как галерея, поэтому
 * у части плиток задан двойной размер. Раскладка задана вручную, а не
 * случайно: случайная кладка на каждой перерисовке прыгает, а на сервере
 * и на клиенте вообще даёт разную разметку.
 *
 * По щелчку сцена открывается во весь экран — не потому, что там больше
 * подробностей, а потому что этого ждут от галереи, и обманывать
 * ожидание хуже, чем сделать.
 */
import { useEffect, useState } from "react";
import { Scene, SCENE_TITLE, type SceneId } from "./scenes";

/** Порядок и размеры плиток. `wide`/`tall` занимают две клетки. */
const TILES: { id: SceneId; span?: "wide" | "tall" | "big" }[] = [
  { id: "hall", span: "big" },
  { id: "rings" },
  { id: "bouquet" },
  { id: "invitation", span: "tall" },
  { id: "table", span: "wide" },
  { id: "cake" },
  { id: "arch", span: "wide" },
  { id: "candles" },
  { id: "toast" },
  { id: "dance", span: "big" },
  { id: "photo" },
  { id: "confetti" },
];

const SPAN_CLASS: Record<string, string> = {
  big: "col-span-2 row-span-2",
  wide: "col-span-2",
  tall: "row-span-2",
};

export function Gallery() {
  const [open, setOpen] = useState<SceneId | null>(null);

  // Открытая сцена закрывается по Escape — на десктопе это первое, что
  // нажимают, и отсутствие реакции читается как зависание.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="grid auto-rows-[112px] grid-cols-2 gap-2.5 sm:auto-rows-[132px] sm:grid-cols-3 sm:gap-3 lg:auto-rows-[150px] lg:grid-cols-4">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => setOpen(tile.id)}
            aria-label={`Открыть: ${SCENE_TITLE[tile.id]}`}
            className={`group relative overflow-hidden rounded-xl border border-stone-200/70 bg-white sm:rounded-2xl ${
              tile.span ? SPAN_CLASS[tile.span] : ""
            }`}
          >
            <Scene
              id={tile.id}
              className="h-full w-full transition-transform duration-700 group-hover:scale-105"
            />
            {/* Подпись проявляется при наведении; на телефоне наведения
                нет, поэтому она там просто не мешает. */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-stone-950/70 to-transparent p-3 text-left text-xs text-stone-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
              {SCENE_TITLE[tile.id]}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/85 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={SCENE_TITLE[open]}
        >
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl">
              <Scene id={open} className="aspect-[4/3] w-full" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="font-serif text-lg text-stone-100">{SCENE_TITLE[open]}</p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full border border-white/25 px-4 py-1.5 text-sm text-stone-200 transition-colors hover:bg-white/10"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
