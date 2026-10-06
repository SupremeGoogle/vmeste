import Link from "next/link";

export function LuxuryHero({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <section className="luxe-hero" aria-labelledby="luxe-title">
        <div className="luxe-hero-inner">
          <div className="luxe-hero-copy">
            <div className="luxe-eyebrow"><span className="luxe-eyebrow-line" /> ВАША ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ</div>
            <h1 id="luxe-title">Идеальная свадьба<br /><em>рождается вместе</em></h1>
            <p className="luxe-hero-description">Приглашения, гости, рассадка и самые красивые моменты праздника — в одном пространстве, созданном для вашего дня.</p>
            <div className="luxe-hero-actions">
              <Link href={signedIn ? "/app" : "/register"} className="luxe-primary-button">{signedIn ? "Перейти в кабинет" : "Создать свою свадьбу"}<span aria-hidden="true">↗</span></Link>
              <a href="#vozmozhnosti" className="luxe-text-link">Открыть возможности <span aria-hidden="true">→</span></a>
            </div>
            <p className="luxe-hero-note">Вся подготовка к свадьбе — в одном месте</p>
            <div className="luxe-hero-signature" aria-hidden="true">v<span>&</span>m <i>·</i> since your forever</div>
          </div>

          <div className="luxe-hero-visual">
            <div className="luxe-photo-frame">
              {/* Generated editorial photo is a content image, not a replaceable template background. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/luxury-reception.webp" alt="Камерный свадебный ужин при закате" fetchPriority="high" />
              <div className="luxe-photo-caption"><span>01 / 04</span><span>Тот самый день, в каждой детали</span></div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="luxe-hero-flowers" src="/media/luxury-flowers.png" alt="" aria-hidden="true" />
            <div className="luxe-vertical-label" aria-hidden="true">WITH LOVE · ВМЕСТЕ</div>
          </div>
        </div>
        <a className="luxe-scroll-cue" href="#luxe-story">ЛИСТАЙТЕ ВНИЗ <span aria-hidden="true">↓</span></a>
      </section>

      <section id="luxe-story" className="luxe-story" aria-labelledby="luxe-story-title">
        <div className="luxe-story-intro">
          <span className="luxe-kicker">МАЛЕНЬКИЕ ДЕТАЛИ. БОЛЬШАЯ ИСТОРИЯ.</span>
          <h2 id="luxe-story-title">Пусть в этот день<br /><em>всё будет о вас</em></h2>
          <p>От первого приглашения до последнего танца — все важные детали собраны в одном красивом и понятном месте.</p>
        </div>
        <div className="luxe-story-grid">
          <div className="luxe-story-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/luxury-invitation.webp" alt="Приглашения, кольца и свадебные цветы" loading="lazy" />
            <span>Красота начинается с приглашения</span>
          </div>
          <div className="luxe-story-card">
            <div className="luxe-story-card-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/luxury-wreath.png" alt="" aria-hidden="true" className="luxe-wreath" />
              <p className="luxe-kicker">С ЛЮБОВЬЮ К КАЖДОЙ ДЕТАЛИ</p>
              <h3>Всё готово<br />к вашему <em>«да»</em></h3>
              <p className="luxe-story-card-copy">Создайте приглашение, соберите ответы гостей, продумайте рассадку и сохраните мгновения праздника.</p>
              <a href="#demo" className="luxe-text-link">Посмотреть, как это работает <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
        <div className="luxe-benefits" aria-label="Возможности сервиса">
          <div><span>01</span><strong>Приглашения</strong><small>Личные ссылки и ответы гостей</small></div>
          <div><span>02</span><strong>План зала</strong><small>Рассадка без лишней суеты</small></div>
          <div><span>03</span><strong>Моменты</strong><small>Фотографии на экране в зале</small></div>
          <div><span>04</span><strong>Лёгкий вход</strong><small>Каждый гость на своём месте</small></div>
        </div>
      </section>
    </>
  );
}
