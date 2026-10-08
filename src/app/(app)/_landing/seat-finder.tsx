import Image from "next/image";
import { BrandLogo } from "@/components/brand";

const TEXT = {
  ru: {
    sign: "Открыть пример страницы гостя", kicker: "Добро пожаловать", title: "Найдите своё место", qr: "QR-код — открыть пример страницы гостя",
    note: "Наведите камеру телефона", link: "Или открыть пример ↗", phone: "Открыть настоящую страницу гостя",
    shot: "Настоящий экран страницы гостя: свадьба Ани и Миши, поиск своего места", caption: "Настоящая страница гостя — так она выглядит на телефоне",
  },
  en: {
    sign: "Open a sample guest page", kicker: "Welcome", title: "Find your seat", qr: "QR code — open a sample guest page",
    note: "Point your phone camera here", link: "Or open the sample ↗", phone: "Open the real guest page",
    shot: "The actual guest page for Anya and Misha’s wedding, with seat search", caption: "The actual guest page, exactly as it looks on a phone",
  },
};

/** Реальный снимок страницы гостя; табличка открывает интерактивный пример. */
export function SeatFinder({ lang = "ru" }: { lang?: "ru" | "en" }) {
  const t = TEXT[lang];
  return (
    <div className="seat-finder seat-finder--live">
      <a href="/demo/guest-entry" target="_blank" rel="noopener noreferrer" className="seat-finder-sign" aria-label={t.sign}>
        <BrandLogo size={30} adaptive={false} />
        <span className="seat-finder-sign-kicker">{t.kicker}</span>
        <span className="seat-finder-sign-title">{t.title}</span>
        <Image src="/api/demo/guest-entry/qr" alt={t.qr} width={160} height={160} unoptimized className="seat-finder-real-qr" />
        <span className="seat-finder-sign-note">{t.note}</span>
        <span className="seat-finder-sign-link">{t.link}</span>
      </a>

      <div className="seat-finder-device">
        <a href="/demo/guest-entry" target="_blank" rel="noopener noreferrer" className="seat-finder-phone" aria-label={t.phone}>
          <div className="seat-finder-live-screen seat-finder-photo">
              <span className="seat-finder-photo-frame seat-finder-photo-frame--real">
                <Image
                  src="/media/feature-screens/guest-entry-phone-hd.webp"
                  alt={t.shot}
                  width={780}
                  height={1560}
                  unoptimized
                  sizes="310px"
                />
              </span>
          </div>
        </a>
        <p className="seat-finder-caption">{t.caption}</p>
      </div>
    </div>
  );
}
