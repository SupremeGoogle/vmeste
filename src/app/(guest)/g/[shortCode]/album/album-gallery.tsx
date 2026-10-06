"use client";

/**
 * Сетка снимков и полноэкранный просмотр с листанием стрелками.
 * Снимки идут через `/api/media`: бакет закрыт, а одобренное фото отдаётся всем,
 * у кого есть ссылка.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./album.module.css";

export function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </svg>
  );
}

type Photo = { id: string; width: number; height: number };

export function AlbumGallery({ eventId, photos }: { eventId: string; photos: Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = selected !== null;
  const active = selected === null ? null : photos[selected];
  const url = (id: string) => `/api/media/${eventId}/${id}`;

  useEffect(() => {
    const element = dialog.current;
    if (!isOpen || !element) return;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  function move(step: number) {
    setSelected((current) => (current === null ? null : (current + step + photos.length) % photos.length));
  }

  return (
    <>
      <ul className={`${styles.gallery} ${photos.length < 3 ? styles.smallGallery : ""}`} aria-label="Снимки">
        {photos.map((photo, index) => (
          <li key={photo.id} className={styles.frame}>
            <button type="button" onClick={() => setSelected(index)} className={styles.photoButton} aria-label={`Открыть снимок ${index + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- снимки идут через закрытый маршрут /api/media */}
              <img src={url(photo.id)} alt="" width={photo.width} height={photo.height} loading="lazy" className={styles.photo} />
            </button>
            <a href={`${url(photo.id)}?size=full&download=1`} className={styles.savePhoto} aria-label="Скачать снимок">
              <DownloadIcon />
            </a>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-label="Просмотр снимков"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
        }}
      >
        <div className={styles.viewerToolbar}>
          {active ? (
            <a href={`${url(active.id)}?size=full&download=1`} className={styles.viewerDownload}>
              <DownloadIcon />
              Скачать
            </a>
          ) : null}
          <button type="button" className={styles.viewerClose} onClick={() => dialog.current?.close()} aria-label="Закрыть" autoFocus>
            ×
          </button>
        </div>
        {active ? (
          <div className={styles.viewerStage}>
            {photos.length > 1 ? (
              <button type="button" className={`${styles.viewerArrow} ${styles.previous}`} onClick={() => move(-1)} aria-label="Предыдущий снимок">←</button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element -- полный размер через закрытый маршрут */}
            <img key={active.id} src={`${url(active.id)}?size=full`} alt={`Снимок ${(selected ?? 0) + 1} из ${photos.length}`} className={styles.viewerPhoto} />
            {photos.length > 1 ? (
              <button type="button" className={`${styles.viewerArrow} ${styles.next}`} onClick={() => move(1)} aria-label="Следующий снимок">→</button>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
