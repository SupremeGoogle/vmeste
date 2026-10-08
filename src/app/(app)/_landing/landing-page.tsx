/**
 * Титульная страница — общая для «/» (русский) и «/en» (английский).
 * Разметка одна, различаются только тексты: так версии не разъезжаются.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser } from "@/server/auth/session";
import { Nav } from "./nav";
import { Reveal } from "./reveal";
import { FeatureTabs } from "./feature-tabs";
import { SeatingDemo } from "./seating-demo";
import { SeatFinder } from "./seat-finder";
import { Faq } from "./faq";
import { BrandLogo } from "@/components/brand";
import { ClayHero } from "./clay-hero";
import { LandingIntro } from "./landing-intro";
import { FeatureRibbons } from "./feature-ribbons";
import { InviteShowcase } from "./invite-showcase";
import { faqItems } from "./faq-items";
import { LegalLinks } from "../(legal)/_legal/links";
import { LangSwitch } from "@/components/lang-switch";
import { EN_LANDING_SCRIPT, RU_LANDING_SCRIPT, type Lang } from "@/lib/i18n";
import { OPERATOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./landing.css";
import "./home.css";
import "./clay.css";

export const EN_NAME = "Vmeste";
export const EN_TITLE = "Vmeste — wedding planning app for invitations, RSVPs and seating charts";
export const EN_DESCRIPTION =
  "Online wedding invitations, RSVPs, seating charts, QR check-in and a shared photo album — your whole wedding in one place.";

const FEATURE_LIST = {
  ru: [
    "Электронные приглашения на свадьбу по именной ссылке",
    "Сбор ответов гостей (RSVP): присутствие, меню, напитки",
    "Рассадка гостей по столам на плане зала",
    "Вход гостей по QR-коду и поиск своего места",
    "Фотографии гостей с ИИ-модерацией и общий альбом",
    "Список подарков без повторов",
    "Импорт гостей из Excel и CSV, печать в PDF",
  ],
  en: [
    "Online wedding invitations with a personal link for every guest",
    "RSVPs with attendance, meal and drink choices",
    "Seating chart: place guests at tables on your floor plan",
    "QR check-in that shows each guest their seat",
    "Guest photos with AI moderation and a shared photo album",
    "Gift list that prevents duplicate gifts",
    "Guest list import from Excel or CSV, PDF export for printing",
  ],
};

/**
 * Разметка для поисковиков и ИИ-поиска: кто мы (Organization), что за
 * сайт (WebSite), что за сервис (WebApplication) и вопросы-ответы
 * (FAQPage — те же тексты, что в блоке «Вопросы»).
 */
function jsonLd(lang: Lang) {
  const en = lang === "en";
  const name = en ? EN_NAME : SITE_NAME;
  const url = en ? `${SITE_URL}/en` : SITE_URL;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        ...(en ? { alternateName: EN_NAME } : {}),
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        email: OPERATOR.email,
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: OPERATOR.email, availableLanguage: en ? ["ru", "en"] : "ru" },
      },
      { "@type": "WebSite", "@id": `${url}/#site`, name, url, inLanguage: lang, publisher: { "@id": `${SITE_URL}/#org` } },
      {
        "@type": "WebApplication",
        name,
        url,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: lang,
        description: en ? EN_DESCRIPTION : SITE_DESCRIPTION,
        featureList: FEATURE_LIST[lang],
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "FAQPage",
        inLanguage: lang,
        mainEntity: faqItems(lang).map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

const PHOTO = {
  terrace: "/media/brand-hero.webp",
  evening: "/media/brand-evening.webp",
};

type Copy = {
  cta: (signedIn: boolean) => string;
  register: string;
  login: string;
  features: { kicker: string; title: ReactNode; lead: string };
  invites: { kicker: string; title: ReactNode; lead: string };
  seating: { kicker: string; title: ReactNode; lead: string; step1: string; step2: string; steps: [string, string][] };
  faq: { kicker: string; title: ReactNode; lead: string };
  final: { kicker: string; title: ReactNode; lead: string };
  footer: { tagline: string; product: string; featuresLink: string; seatingLink: string; account: string; myAccount: string; signIn: string; create: string; faq: string; legal: string; brand: string; motto: string };
};

const COPY: Record<Lang, Copy> = {
  ru: {
    cta: (signedIn) => (signedIn ? "Перейти в кабинет" : "Создать свадьбу"),
    register: "/register",
    login: "/login",
    features: {
      kicker: "Возможности",
      title: <>Всё для свадьбы <em>в одном месте</em></>,
      lead: "От первого приглашения до последнего танца: инструменты, которые работают с одним списком гостей и не теряют ни одной детали.",
    },
    invites: {
      kicker: "Приглашения",
      title: <>Приглашение, которое <em>хочется сохранить</em></>,
      lead: "Дизайнерские шаблоны, в которых уже продуманы шрифты, цвета и детали. Гость откроет приглашение с любого телефона и ответит в одно касание.",
    },
    seating: {
      kicker: "Рассадка и вход по QR",
      title: <>У каждого гостя <em>своё место</em></>,
      lead: "Вы рассаживаете гостей на плане зала, а в день свадьбы каждый сам находит свой стол по QR-коду на входе — без распорядителя со списком.",
      step1: "Вы рассаживаете: нажмите на гостя, затем на свободное место",
      step2: "В день свадьбы гость находит себя сам",
      steps: [
        ["Сканирует QR-код", "Камерой телефона, на табличке у входа."],
        ["Вводит своё имя", "Поиск понимает «Настя» вместо «Анастасия» и опечатки."],
        ["Видит стол и место", "И схему зала, где этот стол подсвечен."],
      ],
    },
    faq: {
      kicker: "Вопросы и ответы",
      title: <>Мы рядом <em>на каждом шаге</em></>,
      lead: "Собрали то, о чём спрашивают чаще всего. Остальное проще попробовать в своём кабинете.",
    },
    final: {
      kicker: "Вместе",
      title: <>Пусть этот день будет <em>только о вас</em></>,
      lead: "Создайте свадьбу сейчас — пригласить гостей можно уже сегодня вечером.",
    },
    footer: {
      tagline: "Приглашения, гости, рассадка и фотографии — всё для свадьбы в одном месте.",
      product: "Сервис",
      featuresLink: "Возможности",
      seatingLink: "Рассадка",
      account: "Кабинет",
      myAccount: "Личный кабинет",
      signIn: "Войти",
      create: "Создать свадьбу",
      faq: "Вопросы",
      legal: "Документы",
      brand: "Вместе",
      motto: "Ваш день. Ваша история.",
    },
  },
  en: {
    cta: (signedIn) => (signedIn ? "Go to my account" : "Create your wedding"),
    register: "/register?lang=en",
    login: "/login?lang=en",
    features: {
      kicker: "Features",
      title: <>Everything for your wedding, <em>all in one place</em></>,
      lead: "From the first invitation to the last dance — every tool works from one guest list, so no detail slips through.",
    },
    invites: {
      kicker: "Invitations",
      title: <>An invitation <em>worth keeping</em></>,
      lead: "Designer templates with the fonts, colors and details already worked out. Guests open their invitation on any phone and RSVP in one tap.",
    },
    seating: {
      kicker: "Seating & QR check-in",
      title: <>A place for <em>every guest</em></>,
      lead: "Seat your guests on the floor plan, and on the day everyone finds their own table by scanning a QR code at the entrance — no usher with a clipboard required.",
      step1: "You plan the seating: tap a guest, then an empty seat",
      step2: "On the day, guests find their own seats",
      steps: [
        ["They scan the QR code", "With their phone camera, on the sign at the entrance."],
        ["They type their name", "Search understands “Nastya” for “Anastasia” — and typos, too."],
        ["They see their table and seat", "Plus a floor plan with their table highlighted."],
      ],
    },
    faq: {
      kicker: "Questions & answers",
      title: <>We’re with you <em>every step of the way</em></>,
      lead: "Here’s what couples ask us most. For everything else, the quickest answer is to try it in your account.",
    },
    final: {
      kicker: "Vmeste",
      title: <>Let this day be <em>all about you</em></>,
      lead: "Create your wedding now and start inviting guests as soon as tonight.",
    },
    footer: {
      tagline: "Invitations, guest list, seating and photos — your whole wedding in one place.",
      product: "Product",
      featuresLink: "Features",
      seatingLink: "Seating",
      account: "Account",
      myAccount: "My account",
      signIn: "Sign in",
      create: "Create your wedding",
      faq: "FAQ",
      legal: "Legal",
      brand: "Vmeste",
      motto: "Your day. Your story.",
    },
  },
};

/** Документы есть только по-русски — английская версия честно об этом говорит. */
const LEGAL_EN = [
  { href: "/offer", title: "Terms of Service" },
  { href: "/privacy", title: "Privacy Policy" },
  { href: "/consent", title: "Consent to Data Processing" },
  { href: "/cookies", title: "Cookie Policy" },
];

export async function LandingPage({ lang }: { lang: Lang }) {
  const user = await getSessionUser();
  const t = COPY[lang];
  const destination = user ? "/app" : t.register;
  const cta = t.cta(Boolean(user));

  return (
    <>
      {/* Язык — до всего остального: уйти на нужную версию раньше отрисовки. */}
      <script dangerouslySetInnerHTML={{ __html: lang === "en" ? EN_LANDING_SCRIPT : RU_LANDING_SCRIPT }} />
      <script
        type="application/ld+json"
        // `<` экранирован: текст ответа не может закрыть тег script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(lang)).replace(/</g, "\\u003c") }}
      />
      <LandingIntro lang={lang} />
      <Nav userName={user?.name ?? null} lang={lang} />
      <main className="home home--clay">
        <ClayHero destination={destination} cta={cta} lang={lang} />
        <FeatureRibbons lang={lang} />

        <section id="vozmozhnosti" className="home-section home-section--sand">
          <div className="home-container">
            <Reveal className="home-head">
              <div>
                <span className="home-kicker">{t.features.kicker}</span>
                <h2 className="home-h2">{t.features.title}</h2>
              </div>
              <p className="home-lead">{t.features.lead}</p>
            </Reveal>
            <Reveal delay={120} className="home-panel">
              <FeatureTabs lang={lang} />
            </Reveal>
          </div>
        </section>

        <section id="priglasheniya" className="home-section home-invite" aria-labelledby="home-invite-title">
          <div className="home-container">
            <Reveal className="home-head">
              <div>
                <span className="home-kicker">{t.invites.kicker}</span>
                <h2 id="home-invite-title" className="home-h2">{t.invites.title}</h2>
              </div>
              <p className="home-lead">{t.invites.lead}</p>
            </Reveal>
          </div>

          <InviteShowcase lang={lang} />
        </section>

        <section id="demo" className="home-section home-section--sand" aria-labelledby="home-seat-title">
          <div className="home-container">
            <Reveal className="home-head home-head--center">
              <span className="home-kicker">{t.seating.kicker}</span>
              <h2 id="home-seat-title" className="home-h2">{t.seating.title}</h2>
              <p className="home-lead" style={{ marginTop: 22 }}>{t.seating.lead}</p>
            </Reveal>

            {/* Две стороны одной рассадки: сначала организатор, потом гость. */}
            <Reveal className="home-seat-plan">
              <p className="home-seat-label">
                <span>1</span>
                {t.seating.step1}
              </p>
              <div className="home-panel">
                <SeatingDemo lang={lang} />
              </div>
            </Reveal>

            <div className="home-seat-guest">
              <Reveal>
                <p className="home-seat-label">
                  <span>2</span>
                  {t.seating.step2}
                </p>
                <ol className="home-seat-steps">
                  {t.seating.steps.map(([title, text]) => (
                    <li key={title}><strong>{title}</strong><p>{text}</p></li>
                  ))}
                </ol>
              </Reveal>
              <Reveal delay={120}>
                <SeatFinder lang={lang} />
              </Reveal>
            </div>
          </div>
        </section>

        <section id="voprosy" className="home-section">
          <div className="home-container home-faq">
            <Reveal className="home-faq-aside">
              <span className="home-kicker">{t.faq.kicker}</span>
              <h2 className="home-h2">{t.faq.title}</h2>
              <p className="home-lead">{t.faq.lead}</p>
              <Link href={destination} className="home-link">{cta} <span aria-hidden="true">→</span></Link>
            </Reveal>
            <Reveal delay={100} className="home-faq-list">
              <Faq lang={lang} />
            </Reveal>
          </div>
        </section>

        <section className="home-final" aria-labelledby="home-final-title">
          <Image src={PHOTO.evening} alt="" fill sizes="100vw" />
          <div className="home-container">
            <Reveal>
              <span className="home-kicker">{t.final.kicker}</span>
              <h2 id="home-final-title">{t.final.title}</h2>
              <p className="home-lead">{t.final.lead}</p>
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
              <Link href={lang === "en" ? "/en" : "/"} className="home-brand">
                <BrandLogo size={52} adaptive={false} />
              </Link>
              <p>{t.footer.tagline}</p>
            </div>
            <div>
              <h4>{t.footer.product}</h4>
              <ul>
                <li><a href="#vozmozhnosti">{t.footer.featuresLink}</a></li>
                <li><a href="#demo">{t.footer.seatingLink}</a></li>
              </ul>
            </div>
            <div>
              <h4>{t.footer.account}</h4>
              <ul>
                {user ? (
                  <li><Link href="/app">{t.footer.myAccount}</Link></li>
                ) : (
                  <>
                    <li><Link href={t.login}>{t.footer.signIn}</Link></li>
                    <li><Link href={t.register}>{t.footer.create}</Link></li>
                  </>
                )}
                <li><a href="#voprosy">{t.footer.faq}</a></li>
              </ul>
            </div>
            <div>
              <h4>{t.footer.legal}</h4>
              <ul>
                {lang === "en" ? (
                  LEGAL_EN.map((doc) => (
                    <li key={doc.href}>
                      <Link href={doc.href} hrefLang="ru">{doc.title} <span className="opacity-70">(in Russian)</span></Link>
                    </li>
                  ))
                ) : (
                  <LegalLinks />
                )}
              </ul>
            </div>
          </div>
          <div className="home-footer-bottom">
            <span>© {new Date().getFullYear()} {t.footer.brand}</span>
            <LangSwitch current={lang} />
            <span>{t.footer.motto}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
