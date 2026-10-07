import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/server/auth/session";
import { Nav } from "./_landing/nav";
import { Reveal } from "./_landing/reveal";
import { FeatureTabs } from "./_landing/feature-tabs";
import { SeatingDemo } from "./_landing/seating-demo";
import { SeatFinder } from "./_landing/seat-finder";
import { Faq } from "./_landing/faq";
import { BrandLogo } from "@/components/brand";
import { ClayHero } from "./_landing/clay-hero";
import { LandingIntro } from "./_landing/landing-intro";
import { FeatureRibbons } from "./_landing/feature-ribbons";
import { InviteShowcase } from "./_landing/invite-showcase";
import "./_landing/landing.css";
import "./_landing/home.css";
import "./_landing/clay.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вместе — свадьба, продуманная до мелочей",
  description:
    "Приглашения, ответы гостей, рассадка и фотографии праздника — всё для свадьбы в одном месте.",
};

const PHOTO = {
  terrace: "/media/brand-hero.webp",
  evening: "/media/brand-evening.webp",
};

export default async function HomePage() {
  const user = await getSessionUser();
  const destination = user ? "/app" : "/register";
  const cta = user ? "Перейти в кабинет" : "Создать свадьбу";

  return (
    <>
      <LandingIntro />
      <Nav userName={user?.name ?? null} />
      <main className="home home--clay">
        <ClayHero destination={destination} cta={cta} />
        <FeatureRibbons />

        <section id="vozmozhnosti" className="home-section home-section--sand">
          <div className="home-container">
            <Reveal className="home-head">
              <div>
                <span className="home-kicker">Возможности</span>
                <h2 className="home-h2">Всё для свадьбы <em>в одном месте</em></h2>
              </div>
              <p className="home-lead">
                От первого приглашения до последнего танца: инструменты, которые работают
                с одним списком гостей и не теряют ни одной детали.
              </p>
            </Reveal>
            <Reveal delay={120} className="home-panel">
              <FeatureTabs />
            </Reveal>
          </div>
        </section>

        <section id="priglasheniya" className="home-section home-invite" aria-labelledby="home-invite-title">
          <div className="home-container">
            <Reveal className="home-head">
              <div>
                <span className="home-kicker">Приглашения</span>
                <h2 id="home-invite-title" className="home-h2">
                  Приглашение, которое <em>хочется сохранить</em>
                </h2>
              </div>
              <p className="home-lead">
                Дизайнерские шаблоны, в которых уже продуманы шрифты, цвета и детали. Гость
                откроет приглашение с любого телефона и ответит в одно касание.
              </p>
            </Reveal>
          </div>

          <InviteShowcase />
        </section>

        <section id="demo" className="home-section home-section--sand" aria-labelledby="home-seat-title">
          <div className="home-container">
            <Reveal className="home-head home-head--center">
              <span className="home-kicker">Рассадка и вход по QR</span>
              <h2 id="home-seat-title" className="home-h2">У каждого гостя <em>своё место</em></h2>
              <p className="home-lead" style={{ marginTop: 22 }}>
                Вы рассаживаете гостей на плане зала, а в день свадьбы каждый сам находит
                свой стол по QR-коду на входе — без распорядителя со списком.
              </p>
            </Reveal>

            {/* Две стороны одной рассадки: сначала организатор, потом гость. */}
            <Reveal className="home-seat-plan">
              <p className="home-seat-label">
                <span>1</span>
                Вы рассаживаете: нажмите на гостя, затем на свободное место
              </p>
              <div className="home-panel">
                <SeatingDemo />
              </div>
            </Reveal>

            <div className="home-seat-guest">
              <Reveal>
                <p className="home-seat-label">
                  <span>2</span>
                  В день свадьбы гость находит себя сам
                </p>
                <ol className="home-seat-steps">
                  <li><strong>Сканирует QR-код</strong><p>Камерой телефона, на табличке у входа.</p></li>
                  <li><strong>Вводит своё имя</strong><p>Поиск понимает «Настя» вместо «Анастасия» и опечатки.</p></li>
                  <li><strong>Видит стол и место</strong><p>И схему зала, где этот стол подсвечен.</p></li>
                </ol>
              </Reveal>
              <Reveal delay={120}>
                <SeatFinder />
              </Reveal>
            </div>
          </div>
        </section>

        <section id="voprosy" className="home-section">
          <div className="home-container home-faq">
            <Reveal className="home-faq-aside">
              <span className="home-kicker">Вопросы и ответы</span>
              <h2 className="home-h2">Мы рядом <em>на каждом шаге</em></h2>
              <p className="home-lead">
                Собрали то, о чём спрашивают чаще всего. Остальное проще попробовать
                в своём кабинете.
              </p>
              <Link href={destination} className="home-link">{cta} <span aria-hidden="true">→</span></Link>
            </Reveal>
            <Reveal delay={100} className="home-faq-list">
              <Faq />
            </Reveal>
          </div>
        </section>

        <section className="home-final" aria-labelledby="home-final-title">
          <Image src={PHOTO.evening} alt="" fill sizes="100vw" />
          <div className="home-container">
            <Reveal>
              <span className="home-kicker">Вместе</span>
              <h2 id="home-final-title">Пусть этот день будет <em>только о вас</em></h2>
              <p className="home-lead">
                Создайте свадьбу сейчас — пригласить гостей можно уже сегодня вечером.
              </p>
              <Link href={destination} className="home-button home-button--light">
                {cta} <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="home-footer home home--clay">
        <div className="home-container">
          <div className="home-footer-grid">
            <div>
              <Link href="/" className="home-brand">
                <BrandLogo size={52} adaptive={false} />
              </Link>
              <p>Приглашения, гости, рассадка и фотографии — всё для свадьбы в одном месте.</p>
            </div>
            <div>
              <h4>Сервис</h4>
              <ul>
                <li><a href="#vozmozhnosti">Возможности</a></li>
                <li><a href="#demo">Рассадка</a></li>
              </ul>
            </div>
            <div>
              <h4>Кабинет</h4>
              <ul>
                {user ? (
                  <li><Link href="/app">Личный кабинет</Link></li>
                ) : (
                  <>
                    <li><Link href="/login">Войти</Link></li>
                    <li><Link href="/register">Создать свадьбу</Link></li>
                  </>
                )}
                <li><a href="#voprosy">Вопросы</a></li>
              </ul>
            </div>
          </div>
          <div className="home-footer-bottom">
            <span>© {new Date().getFullYear()} Вместе</span>
            <span>Ваш день. Ваша история.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
