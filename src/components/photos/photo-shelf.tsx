"use client";

/**
 * Уже разобранные фото: опубликованные или отклонённые.
 *
 * Сетка миниатюр, а по нажатию — снимок на весь экран, листается
 * стрелками и клавишами. Отклонённые раньше просто исчезали из панели:
 * передумать было не на чем, и случайно отклонённый кадр терялся. Теперь
 * их видно здесь же, и любой можно вернуть.
 *
 * Решения — обычные серверные действия через форму: без скриптов
 * кнопки тоже работают, а страница после них перерисовывается сама.
 */
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";

export type ShelfPhoto = { id: string; guestName: string | null };

type Props = {
  eventId: string;
  photos: ShelfPhoto[];
  /** approved — «снять» уводит в отклонённые; rejected — «вернуть» публикует. */
  kind: "approved" | "rejected";
  setStatus: (form: FormData) => Promise<void>;
  remove: (form: FormData) => Promise<void>;
};

export function PhotoShelf({ eventId, photos, kind, setStatus, remove }: Props) {
  const t = useT();
  // По id, а не по номеру: снятое фото уходит из списка, и номер
  // показал бы соседнее, хотя решение принимали про другое.
  const [openId, setOpenId] = useState<string | null>(null);
  const found = openId ? photos.findIndex((photo) => photo.id === openId) : -1;
  const open = found >= 0 ? found : null;
  const setOpen = (index: number | null) => setOpenId(index === null ? null : photos[index]?.id ?? null);
  const media = (id: string, full = false) => `/api/media/${eventId}/${id}${full ? "?size=full" : ""}`;
  const step = useCallback((delta: number) => {
    setOpenId((id) => {
      const index = photos.findIndex((photo) => photo.id === id);
      return index < 0 ? null : photos[(index + delta + photos.length) % photos.length].id;
    });
  }, [photos]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = open !== null ? photos[open] : undefined;

  const actions = (photo: ShelfPhoto, large = false) => (
    <div className={`flex justify-center gap-3 ${large ? "text-sm" : "mt-1 text-xs"}`}>
      <form action={setStatus}>
        <input type="hidden" name="photoId" value={photo.id} />
        <input type="hidden" name="status" value={kind === "approved" ? "REJECTED" : "APPROVED"} />
        <button className={large ? "rounded-lg bg-white/15 px-4 py-2 text-white hover:bg-white/25" : "text-stone-500 underline"}>
          {kind === "approved" ? t("снять", "unpublish") : t("вернуть", "restore")}
        </button>
      </form>
      <form action={remove} onSubmit={(event) => { if (!window.confirm(t("Удалить фото насовсем? Вернуть его будет нельзя.", "Delete this photo for good? It can't be restored."))) event.preventDefault(); }}>
        <input type="hidden" name="photoId" value={photo.id} />
        <button className={large ? "rounded-lg px-4 py-2 text-white/70 hover:text-white" : "text-stone-400 hover:text-red-700"}>{t("удалить", "delete")}</button>
      </form>
    </div>
  );

  return (
    <>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((photo, index) => (
          <li key={photo.id} className="text-center">
            <button type="button" onClick={() => setOpen(index)} className="block w-full overflow-hidden rounded-lg" aria-label={t(`Открыть фото ${index + 1}`, `Open photo ${index + 1}`)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- снимки отдаёт своё API */}
              <img src={media(photo.id)} alt="" loading="lazy" className={`aspect-square w-full object-cover ${kind === "rejected" ? "opacity-70 grayscale-[35%]" : ""}`} />
            </button>
            <span className="mt-1 block truncate text-xs text-stone-500">{photo.guestName ?? "—"}</span>
            {actions(photo)}
          </li>
        ))}
      </ul>

      {current ? (
        <div role="dialog" aria-label={t("Фотография", "Photo")} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4" onClick={() => setOpenId(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- см. выше */}
          <img src={media(current.id, true)} alt="" className="max-h-[78dvh] max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
          <div className="flex flex-col items-center gap-2 text-white" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm text-white/70">{current.guestName ?? t("Гость не указан", "Guest not specified")} · {t(`${open! + 1} из ${photos.length}`, `${open! + 1} of ${photos.length}`)}</p>
            {actions(current, true)}
          </div>
          {photos.length > 1 ? (
            <>
              <button type="button" aria-label={t("Предыдущее", "Previous")} onClick={(event) => { event.stopPropagation(); step(-1); }} className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">‹</button>
              <button type="button" aria-label={t("Следующее", "Next")} onClick={(event) => { event.stopPropagation(); step(1); }} className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">›</button>
            </>
          ) : null}
          <button type="button" aria-label={t("Закрыть", "Close")} className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white">×</button>
        </div>
      ) : null}
    </>
  );
}
