"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const VISUALS = {
  invite: { title: "Приглашение", alt: "Настоящий экран шаблона «Признание» в приложении «Вместе»", width: 780, height: 1688 },
  rsvp: { title: "Ответы гостей", alt: "Скриншот кабинета: ответы гостей, меню и список приглашённых", width: 1264, height: 1100 },
  seating: { title: "Рассадка", alt: "Настоящий заполненный план: 32 гостя и молодожёны за столами разной формы", width: 2560, height: 2080 },
  qr: { title: "Вход по QR", alt: "Скриншот редактора печатной таблички с настоящим QR-кодом", width: 1264, height: 1280 },
  photos: { title: "Фото и альбом", alt: "Галерея свадебных фотографий с интеллектуальным анализом", width: 1000, height: 900 },
  raffle: { title: "Розыгрыш", alt: "Настоящий пример розыгрыша: 12 участников, победитель Анастасия Петрова", width: 1264, height: 730 },
};

export function FeatureVisual({ kind, onOpen }: { kind: keyof typeof VISUALS; onOpen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (kind === "photos") {
    return <div className="feature-photo-gallery" aria-label="Пример галереи свадебных фотографий">
      <div className="feature-photo-heading"><span>Фотографии свадьбы</span><span className="feature-photo-badge">Фото гостей</span></div>
      <div className="feature-photo-grid">
        <figure><Image src="/media/brand-hero.webp" alt="Свадебный ужин на открытой террасе" width={640} height={800} unoptimized sizes="(max-width: 560px) 40vw, 230px" /><figcaption>Моменты вашего дня</figcaption></figure>
        <figure><Image src="/media/brand-evening.webp" alt="Вечерняя атмосфера свадебного праздника" width={640} height={800} unoptimized sizes="(max-width: 560px) 40vw, 230px" /><figcaption>Воспоминания гостей</figcaption></figure>
      </div>
      <div className="feature-photo-filter"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" stroke="currentColor" strokeWidth="1.5"/><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><div><strong>Интеллектуальный анализ</strong><p>Фильтр проверяет снимки перед публикацией. Подозрительные кадры отправляются на проверку организатору.</p></div></div>
    </div>;
  }
  if (kind === "invite") {
    return (
      <Link href="/templates/priznanie" onClick={onOpen} className="feature-invite-phone home-phone" aria-label="Открыть приглашение «Признание»">
        <span className="home-phone-screen">
          <Image src="/media/landing-invites/priznanie-vd.webp" alt="Настоящее приглашение Валерии и Давида на экране телефона" width={780} height={1688} unoptimized sizes="(max-width: 560px) 140px, 250px" className="block h-auto w-full" />
        </span>
      </Link>
    );
  }
  const visual = VISUALS[kind];
  const file = kind === "raffle" ? "raffle-demo" : kind === "seating" ? "seating-filled-hd" : kind;
  const src = `/media/feature-screens/${file}.webp`;
  return (
    <>
      <button type="button" className="feature-screen-preview group relative block w-full cursor-zoom-in overflow-hidden rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900" aria-label={`Рассмотреть скриншот: ${visual.title}`} onClick={() => { onOpen(); dialog.current?.showModal(); }}>
        <Image src={src} alt={visual.alt} width={visual.width} height={visual.height} unoptimized sizes="(max-width: 860px) 92vw, 780px" className="h-auto w-full" />
        <span aria-hidden="true" className="absolute right-3 bottom-3 rounded-full border border-stone-200 bg-white/95 px-3 py-1.5 text-[11px] text-stone-700 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">Увеличить ↗</span>
      </button>
      <dialog ref={dialog} aria-label={`Скриншот: ${visual.title}`} className="m-auto w-[min(1200px,94vw)] max-w-none overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdfa] p-0 text-stone-900 shadow-2xl backdrop:bg-black/55" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3"><p className="font-serif text-xl">{visual.title}</p><button type="button" aria-label="Закрыть скриншот" className="rounded-full px-3 py-1 text-xl hover:bg-stone-100" onClick={() => dialog.current?.close()}>×</button></div>
        <div className="feature-screen-full max-h-[80dvh] overflow-auto"><Image src={src} alt={visual.alt} width={visual.width} height={visual.height} unoptimized sizes="94vw" className="h-auto w-full" /></div>
      </dialog>
    </>
  );
}
