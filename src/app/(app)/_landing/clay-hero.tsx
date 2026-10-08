import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "./hero-video";

export function ClayHero({ destination, cta, lang = "ru" }: { destination: string; cta: string; lang?: "ru" | "en" }) {
  const en = lang === "en";
  return (
    <section className="clay-hero" aria-labelledby="home-title">
      <div className="home-container clay-hero-grid">
        <div className="clay-hero-copy">
          {en ? (
            <>
              <h1 id="home-title">Your day.<br />Your people.<br /><em>All together.</em></h1>
              <p className="clay-hero-lead">Invite your guests, collect RSVPs and plan the seating — all in one place. And actually enjoy getting ready.</p>
            </>
          ) : (
            <>
              <h1 id="home-title">Ваш день.<br />Ваши люди.<br /><em>Всё вместе.</em></h1>
              <p className="clay-hero-lead">Приглашайте гостей, собирайте ответы и планируйте рассадку — в одном месте. А сами наслаждайтесь подготовкой.</p>
            </>
          )}
        </div>

        <div className="clay-mascot">
          <div className="clay-mascot-media">
            <Image src="/media/mascot/mascot-ivory-poster.webp" alt={en ? "The Vmeste mascot — a little white bird with a burgundy bow and an invitation" : "Маскот «Вместе» — белая птичка с бордовым бантом и приглашением"} fill preload unoptimized sizes="(max-width: 560px) 48vw, 400px" />
            <HeroVideo src="/media/mascot/mascot-ivory.mp4" poster="/media/mascot/mascot-ivory-poster.webp" />
          </div>
        </div>
        <div className="clay-hero-actions">
          <Link href={destination} className="home-button">{cta}<span aria-hidden="true">↗</span></Link>
          <Link href="/templates/priznanie" prefetch={false} className="clay-preview-link"><span className="clay-preview-icon" aria-hidden="true">↗</span>{en ? "See an example" : "Посмотреть пример"}</Link>
        </div>
      </div>

    </section>
  );
}
