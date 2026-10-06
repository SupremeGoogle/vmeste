import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "./hero-video";

export function ClayHero({ destination, cta }: { destination: string; cta: string }) {
  return (
    <section className="clay-hero" aria-labelledby="home-title">
      <div className="home-container clay-hero-grid">
        <div className="clay-hero-copy">
          <h1 id="home-title">Ваш день.<br />Ваши люди.<br /><em>Всё вместе.</em></h1>
          <p className="clay-hero-lead">Приглашайте гостей, собирайте ответы и планируйте рассадку — в одном месте. А сами наслаждайтесь подготовкой.</p>
          <div className="clay-hero-actions">
            <Link href={destination} className="home-button">{cta}<span aria-hidden="true">↗</span></Link>
            <Link href="/templates/priznanie" prefetch={false} className="clay-preview-link"><span className="clay-preview-icon" aria-hidden="true">↗</span>Посмотреть пример</Link>
          </div>
        </div>

        <div className="clay-mascot">
          <div className="clay-mascot-media">
            <Image src="/media/mascot/mascot-ivory-poster.webp" alt="Маскот «Вместе» — белая птичка с бордовым бантом и приглашением" fill preload unoptimized sizes="(max-width: 560px) 90vw, 480px" />
            <HeroVideo src="/media/mascot/mascot-ivory.mp4" poster="/media/mascot/mascot-ivory-poster.webp" />
          </div>
        </div>
      </div>

    </section>
  );
}
