"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const VISUALS_RU = {
  invite: { title: "Приглашение", alt: "Настоящий экран шаблона «Признание» в приложении «Вместе»", width: 780, height: 1688 },
  rsvp: { title: "Ответы гостей", alt: "Скриншот кабинета: ответы гостей, меню и список приглашённых", width: 1264, height: 1100 },
  seating: { title: "Рассадка", alt: "Настоящий заполненный план: 32 гостя и молодожёны за столами разной формы", width: 2560, height: 2080 },
  qr: { title: "Вход по QR", alt: "Скриншот редактора печатной таблички с настоящим QR-кодом", width: 1264, height: 1280 },
  photos: { title: "Фото и альбом", alt: "Галерея свадебных фотографий гостей", width: 1000, height: 900 },
  raffle: { title: "Розыгрыш", alt: "Настоящий пример розыгрыша: 12 участников, победитель Анастасия Петрова", width: 1264, height: 730 },
};

const VISUALS_EN: typeof VISUALS_RU = {
  invite: { title: "Invitations", alt: "The “Love Confession” template as it looks in Vmeste", width: 780, height: 1688 },
  rsvp: { title: "RSVPs", alt: "Dashboard screenshot: RSVPs, meal choices and the guest list", width: 1264, height: 1100 },
  seating: { title: "Seating chart", alt: "A real seating chart: 32 guests and the couple at tables of different shapes", width: 2560, height: 2080 },
  qr: { title: "QR check-in", alt: "Screenshot of the printable sign editor with a real QR code", width: 1264, height: 1280 },
  photos: { title: "Photo album", alt: "A gallery of guests’ wedding photos", width: 1000, height: 900 },
  raffle: { title: "Raffle", alt: "A real raffle: 12 entrants, with Anastasia Petrova as the winner", width: 1264, height: 730 },
};

const TEXT = {
  ru: {
    gallery: "Пример галереи свадебных фотографий", heading: "Фотографии свадьбы", badge: "Фото гостей",
    photos: ["Жених и невеста под фатой в поле на закате", "Жених целует невесту в лоб вечером под гирляндами", "Поцелуй молодожёнов на лужайке в лучах закатного солнца", "Пара с букетом на деревянной пристани у озера"],
    inviteLink: "Открыть приглашение «Признание»", inviteAlt: "Настоящее приглашение Валерии и Давида на экране телефона",
    zoom: "Рассмотреть скриншот: ", enlarge: "Увеличить ↗", dialog: "Скриншот: ", close: "Закрыть скриншот",
  },
  en: {
    gallery: "Sample gallery of wedding photos", heading: "Wedding photos", badge: "Guest photos",
    photos: ["A bride and groom under her veil in a field at sunset", "A groom kissing his bride’s forehead under string lights", "Newlyweds kissing on a lawn in the golden sunset light", "A couple with a bouquet on a wooden dock by a lake"],
    inviteLink: "Open the “Love Confession” invitation", inviteAlt: "Valeria and David’s real invitation on a phone screen",
    zoom: "Enlarge screenshot: ", enlarge: "Enlarge ↗", dialog: "Screenshot: ", close: "Close screenshot",
  },
};

export function FeatureVisual({ kind, onOpen, lang = "ru" }: { kind: keyof typeof VISUALS_RU; onOpen: () => void; lang?: "ru" | "en" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = TEXT[lang];
  if (kind === "photos") {
    return <div className="feature-photo-gallery" aria-label={t.gallery}>
      <div className="feature-photo-heading"><span>{t.heading}</span><span className="feature-photo-badge">{t.badge}</span></div>
      {/* Живые кадры со свадьбы без подписей поверх. Все вертикальные и в
          одном формате 4:5: на телефоне и на компьютере кадр режется
          одинаково, и пара в центре снимка остаётся целой. */}
      <div className="feature-photo-grid">
        <Image src="/media/landing-real/veil.webp" alt={t.photos[0]} width={960} height={1200} unoptimized sizes="(max-width: 560px) 42vw, 240px" />
        <Image src="/media/landing-real/lights.webp" alt={t.photos[1]} width={960} height={1200} unoptimized sizes="(max-width: 560px) 42vw, 240px" />
        <Image src="/media/landing-real/sunset.webp" alt={t.photos[2]} width={960} height={1200} unoptimized sizes="(max-width: 560px) 42vw, 240px" />
        <Image src="/media/landing-real/dock.webp" alt={t.photos[3]} width={960} height={1200} unoptimized sizes="(max-width: 560px) 42vw, 240px" />
      </div>
    </div>;
  }
  if (kind === "invite") {
    return (
      <Link href="/templates/priznanie" onClick={onOpen} className="feature-invite-phone home-phone" aria-label={t.inviteLink}>
        <span className="home-phone-screen">
          <Image src="/media/landing-invites/priznanie-vd.webp" alt={t.inviteAlt} width={780} height={1688} unoptimized sizes="(max-width: 560px) 140px, 250px" className="block h-auto w-full" />
        </span>
      </Link>
    );
  }
  const visual = (lang === "en" ? VISUALS_EN : VISUALS_RU)[kind];
  const file = kind === "raffle" ? "raffle-demo" : kind === "seating" ? "seating-filled-hd" : kind;
  const src = `/media/feature-screens/${file}.webp`;
  return (
    <>
      <button type="button" className="feature-screen-preview group relative block w-full cursor-zoom-in overflow-hidden rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900" aria-label={`${t.zoom}${visual.title}`} onClick={() => { onOpen(); dialog.current?.showModal(); }}>
        <Image src={src} alt={visual.alt} width={visual.width} height={visual.height} unoptimized sizes="(max-width: 860px) 92vw, 780px" className="h-auto w-full" />
        <span aria-hidden="true" className="absolute right-3 bottom-3 rounded-full border border-stone-200 bg-white/95 px-3 py-1.5 text-[11px] text-stone-700 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">{t.enlarge}</span>
      </button>
      <dialog ref={dialog} aria-label={`${t.dialog}${visual.title}`} className="m-auto w-[min(1200px,94vw)] max-w-none overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdfa] p-0 text-stone-900 shadow-2xl backdrop:bg-black/55" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3"><p className="font-serif text-xl">{visual.title}</p><button type="button" aria-label={t.close} className="rounded-full px-3 py-1 text-xl hover:bg-stone-100" onClick={() => dialog.current?.close()}>×</button></div>
        <div className="feature-screen-full max-h-[80dvh] overflow-auto"><Image src={src} alt={visual.alt} width={visual.width} height={visual.height} unoptimized sizes="94vw" className="h-auto w-full" /></div>
      </dialog>
    </>
  );
}
