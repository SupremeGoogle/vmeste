"use client";

/**
 * Экран в зале.
 *
 * Три требования определяют устройство компонента:
 *
 * 1. **Не перезагружаться весь вечер.** Состояние живёт здесь; поток
 *    событий только сообщает, что что-то изменилось, а данные экран
 *    перечитывает снимком. Это осознанный размен: снимок — сорок строк,
 *    а событий за вечер сотни, зато путь обновления один и тот же для
 *    первой загрузки, обычного события и восстановления после обрыва.
 *    Один путь — один набор ошибок.
 *
 * 2. **Пережить обрыв связи.** При разрыве экран продолжает показывать
 *    последний известный набор: на проекторе ничего не должно мигать.
 *    Переподключением занимается сам браузер (`EventSource`), а индикатор
 *    в углу показывает координатору правду о связи.
 *
 * 3. **Не зависеть от таймеров.** Вкладка в фоне душит `setInterval`
 *    (PLAN.md §5.6), поэтому смена кадров идёт по `requestAnimationFrame`
 *    с проверкой реального времени: если вкладку придушили и вернули,
 *    экран просто перескочит на нужный кадр, а не «догонит» сотню.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreenSnapshot } from "@/server/services/screen";

/** Сколько кадр держится на экране. */
const PHOTO_MS = 8000;
const WISH_MS = 9000;

type Connection = "online" | "reconnecting" | "revoked";

export function ScreenView({
  token,
  eventId,
  initial,
}: {
  token: string;
  eventId: string;
  initial: ScreenSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<Connection>("online");
  const [slide, setSlide] = useState(0);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/screen/${token}/state`, { cache: "no-store" });
      if (!response.ok) return;
      setSnapshot(await response.json());
    } catch {
      // Сеть отвалилась — оставляем на экране то, что уже показано.
    }
  }, [token]);

  /** События приходят пачками (модератор жмёт пробел десять раз подряд),
   *  поэтому снимок перечитывается не чаще раза в 400 мс. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void refresh();
    }, 400);
  }, [refresh]);

  useEffect(() => {
    const source = new EventSource(`/api/screen/${token}/stream`);

    const onChange = () => {
      setConnection("online");
      scheduleRefresh();
    };

    source.addEventListener("photo", onChange);
    source.addEventListener("wish", onChange);
    source.addEventListener("mode", onChange);
    source.addEventListener("raffle", onChange);
    source.addEventListener("resync", onChange);

    // Организатор отозвал ссылку — гасим экран сами и больше не стучимся.
    source.addEventListener("revoked", () => {
      setConnection("revoked");
      source.close();
    });
    source.onopen = () => setConnection("online");
    source.onerror = () => setConnection("reconnecting");

    return () => {
      source.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [token, scheduleRefresh]);

  // Смена кадров без setInterval: вкладка в фоне душит таймеры, а rAF
  // просто не вызывается — и после возврата экран встаёт на нужный кадр.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const period = snapshot.mode === "WISHES" ? WISH_MS : PHOTO_MS;
      if (now - last >= period) {
        last = now;
        setSlide((prev) => prev + 1);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [snapshot.mode]);

  if (connection === "revoked") {
    return (
      <main className="flex h-screen w-screen items-center justify-center">
        <p className="text-3xl text-white/50">Экран отключён организатором</p>
      </main>
    );
  }

  const { mode, photos, wishes, raffle } = snapshot;

  const photo = photos.length > 0 ? photos[slide % photos.length] : null;
  const wish = wishes.length > 0 ? wishes[slide % wishes.length] : null;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {mode === "IDLE" ? <Idle title={snapshot.eventTitle} /> : null}

      {mode === "RAFFLE" && raffle ? <Raffle raffle={raffle} /> : null}

      {(mode === "PHOTOS" || mode === "MIXED") && photo ? (
        <Photo key={photo.id} eventId={eventId} photo={photo} />
      ) : null}

      {mode === "WISHES" && wish ? <Wish key={wish.id} wish={wish} /> : null}

      {/* В смешанном режиме пожелание идёт полосой поверх фотографии:
          так гости видят и снимки, и слова, не дожидаясь смены режима. */}
      {mode === "MIXED" && wish ? (
        <div key={wish.id} className="screen-fade absolute inset-x-0 bottom-0 bg-black/70 p-8">
          <p className="text-center text-3xl leading-snug">«{wish.text}»</p>
          <p className="mt-2 text-center text-xl text-white/60">{wish.authorName}</p>
        </div>
      ) : null}

      {isEmpty(snapshot) ? <Idle title={snapshot.eventTitle} /> : null}

      <Indicator connection={connection} />
    </main>
  );
}

function isEmpty(snapshot: ScreenSnapshot): boolean {
  if (snapshot.mode === "IDLE") return false;
  if (snapshot.mode === "RAFFLE") return !snapshot.raffle;
  if (snapshot.mode === "WISHES") return snapshot.wishes.length === 0;
  if (snapshot.mode === "PHOTOS") return snapshot.photos.length === 0;
  return snapshot.photos.length === 0 && snapshot.wishes.length === 0;
}

function Photo({
  eventId,
  photo,
}: {
  eventId: string;
  photo: ScreenSnapshot["photos"][number];
}) {
  return (
    <div className="screen-fade absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/media/${eventId}/${photo.id}?size=full`}
        alt=""
        className="h-full w-full object-contain"
      />
      {photo.guestName ? (
        <p className="absolute bottom-6 left-8 text-xl text-white/70">{photo.guestName}</p>
      ) : null}
    </div>
  );
}

function Wish({ wish }: { wish: ScreenSnapshot["wishes"][number] }) {
  return (
    <div className="screen-fade absolute inset-0 flex flex-col items-center justify-center px-24 text-center">
      <p className="text-5xl leading-snug">«{wish.text}»</p>
      <p className="mt-8 text-2xl text-white/60">{wish.authorName}</p>
    </div>
  );
}

/**
 * Розыгрыш на экране.
 *
 * Пока победителя нет — крутится барабан из имён участников. Смена имени
 * идёт по `requestAnimationFrame` с проверкой реального времени, а не по
 * таймеру: в фоне таймеры душат, а кадры браузер и так не рисует. Заодно
 * это ровно то, что нужно для «60 fps на слабом ноутбуке»: за кадр
 * меняется одна строка текста, без анимации размеров и теней.
 *
 * Когда победитель объявлен, барабан останавливается на его имени —
 * событие о розыгрыше приходит тем же потоком, что и всё остальное.
 */
function Raffle({ raffle }: { raffle: NonNullable<ScreenSnapshot["raffle"]> }) {
  const [tick, setTick] = useState(0);
  const spinning = !raffle.winnerLabel && raffle.entryLabels.length > 0;

  useEffect(() => {
    if (!spinning) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      if (now - last >= 90) {
        last = now;
        setTick((prev) => prev + 1);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spinning]);

  const rolling = spinning
    ? raffle.entryLabels[tick % raffle.entryLabels.length]
    : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <p className="text-3xl text-white/60">{raffle.title}</p>

      {raffle.winnerLabel ? (
        <>
          <p className="screen-fade mt-8 text-7xl font-semibold">{raffle.winnerLabel}</p>
          <p className="mt-6 text-2xl text-white/40">
            из {raffle.entries} участников
          </p>
        </>
      ) : rolling ? (
        <>
          <p className="mt-8 text-6xl font-semibold text-white/90">{rolling}</p>
          <p className="mt-6 text-2xl text-white/40">Участников: {raffle.entries}</p>
        </>
      ) : (
        <p className="mt-8 text-4xl text-white/70">Участников: {raffle.entries}</p>
      )}
    </div>
  );
}

function Idle({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-5xl text-white/80">{title}</p>
    </div>
  );
}

/** Индикатор связи. Маленький и в углу: координатору он нужен, гостям — нет. */
function Indicator({ connection }: { connection: Connection }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-white/40">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          connection === "online" ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      {connection === "online" ? "" : "нет связи"}
    </div>
  );
}
