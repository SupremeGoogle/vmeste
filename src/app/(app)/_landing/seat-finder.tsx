import Image from "next/image";
import { BrandLogo } from "@/components/brand";

/** Реальный снимок страницы гостя; табличка открывает интерактивный пример. */
export function SeatFinder() {
  return (
    <div className="seat-finder seat-finder--live">
      <a href="/demo/guest-entry" target="_blank" rel="noopener noreferrer" className="seat-finder-sign" aria-label="Открыть пример страницы гостя">
        <BrandLogo size={30} adaptive={false} />
        <span className="seat-finder-sign-kicker">Добро пожаловать</span>
        <span className="seat-finder-sign-title">Найдите своё место</span>
        <Image src="/api/demo/guest-entry/qr" alt="QR-код — открыть пример страницы гостя" width={160} height={160} unoptimized className="seat-finder-real-qr" />
        <span className="seat-finder-sign-note">Наведите камеру телефона</span>
        <span className="seat-finder-sign-link">Или открыть пример ↗</span>
      </a>

      <div className="seat-finder-device">
        <a href="/demo/guest-entry" target="_blank" rel="noopener noreferrer" className="seat-finder-phone" aria-label="Открыть настоящую страницу гостя">
          <div className="seat-finder-live-screen seat-finder-photo">
              <span className="seat-finder-photo-frame seat-finder-photo-frame--real">
                <Image
                  src="/media/feature-screens/guest-entry-phone-hd.webp"
                  alt="Настоящий экран страницы гостя: свадьба Ани и Миши, поиск своего места"
                  width={780}
                  height={1560}
                  unoptimized
                  sizes="310px"
                />
              </span>
          </div>
        </a>
        <p className="seat-finder-caption">Настоящая страница гостя — так она выглядит на телефоне</p>
      </div>
    </div>
  );
}
