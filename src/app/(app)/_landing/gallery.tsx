"use client";

/**
 * Галерея: мозаика из фотографий, которые лежат в `public/media`.
 *
 * Раскладка задана вручную, а не случайно: случайная кладка на каждой
 * перерисовке прыгает, а на сервере и на клиенте вообще даёт разную
 * разметку. Три плитки из двенадцати занимают по четыре клетки — иначе
 * одинаковые квадратики читаются как таблица, а не как галерея.
 *
 * По щелчку снимок открывается во весь экран. Не потому, что там больше
 * подробностей, а потому что этого ждут от галереи, и обмануть ожидание
 * хуже, чем сделать.
 */
import { useEffect, useState } from "react";

export type GalleryItem = { src: string; alt: string; span?: "wide" | "big" };

const SPAN_CLASS: Record<string, string> = {
  big: "col-span-2 row-span-2",
  wide: "col-span-2",
};

export function Gallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<GalleryItem | null>(null);

  // Открытый снимок закрывается по Escape — на десктопе это первое, что
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

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
        Положите снимки в <code className="font-mono text-stone-700">public/media</code> под именами{" "}
        <code className="font-mono text-stone-700">gallery-1.jpg</code> …{" "}
        <code className="font-mono text-stone-700">gallery-12.jpg</code> — они появятся здесь.
        Подробности в <code className="font-mono text-stone-700">public/media/README.md</code>.
      </p>
    );
  }

  return (
    <>
      <div className="grid auto-rows-[112px] grid-cols-2 gap-2.5 sm:auto-rows-[132px] sm:grid-cols-3 sm:gap-3 lg:auto-rows-[150px] lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setOpen(item)}
            aria-label={`Открыть: ${item.alt}`}
            className={`group relative overflow-hidden rounded-xl border border-stone-200/70 bg-stone-100 sm:rounded-2xl ${
              item.span ? SPAN_CLASS[item.span] : ""
            }`}
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/90 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.alt}
        >
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <img
              src={open.src}
              alt={open.alt}
              className="max-h-[78vh] w-full rounded-2xl object-contain"
            />
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-stone-300">{open.alt}</p>
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
