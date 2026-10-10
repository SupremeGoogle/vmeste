"use client";

/**
 * Галерея гостей: «кирпичная» раскладка, где каждый снимок стоит в своих
 * пропорциях, и просмотр на весь экран со свайпами и зумом.
 *
 * Раньше была квадратная сетка 3×N: каждое вертикальное фото обрезалось
 * до квадрата, и со свадьбы оставались одни лица без платьев. Раскладку
 * считает react-photo-album, просмотр — yet-another-react-lightbox: оба
 * работают в браузере гостя, серверу от них ничего не нужно.
 *
 * В сетке — уменьшенные копии, в просмотре — оригинал: на телефоне со
 * слабым интернетом лента из шестидесяти оригиналов не открылась бы.
 */
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

export type WallPhoto = { id: string; width: number; height: number };

export function PhotoWall({ eventId, photos, download = false }: {
  eventId: string;
  photos: WallPhoto[];
  /** Кнопка «скачать» в просмотре — в альбоме после свадьбы. */
  download?: boolean;
}) {
  const t = useT();
  const [index, setIndex] = useState(-1);
  const media = (id: string, full = false) => `/api/media/${eventId}/${id}${full ? "?size=full" : ""}`;
  // Без размеров (старое фото, сбой конвертации) — считаем квадратом,
  // иначе раскладка поделит на ноль.
  const sized = photos.map((photo) => ({
    key: photo.id,
    src: media(photo.id),
    width: photo.width > 0 ? photo.width : 1000,
    height: photo.height > 0 ? photo.height : 1000,
    alt: "",
    label: t("Открыть снимок", "Open photo"),
  }));

  return (
    <>
      <MasonryPhotoAlbum
        photos={sized}
        columns={(width) => (width < 420 ? 2 : 3)}
        spacing={(width) => (width < 420 ? 6 : 8)}
        onClick={({ index }) => setIndex(index)}
        componentsProps={{
          button: { className: "photo-wall-tile" },
          image: { loading: "lazy", decoding: "async", className: "photo-wall-image" },
        }}
      />
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        on={{ view: ({ index }) => setIndex(index) }}
        slides={sized.map((photo) => ({
          src: media(photo.key, true),
          width: photo.width,
          height: photo.height,
          ...(download ? { download: `${media(photo.key, true)}&download=1` } : {}),
        }))}
        plugins={download ? [Zoom, Counter, Download] : [Zoom, Counter]}
        controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
        carousel={{ finite: photos.length < 3 }}
        labels={{
          Previous: t("Предыдущее", "Previous"), Next: t("Следующее", "Next"), Close: t("Закрыть", "Close"),
          Download: t("Скачать", "Download"), "Zoom in": t("Приблизить", "Zoom in"), "Zoom out": t("Отдалить", "Zoom out"),
        }}
      />
    </>
  );
}
