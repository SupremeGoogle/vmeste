/**
 * Общий макет поискового лендинга (русского и английского): первый экран
 * с прямым ответом, секции возможностей и шагов, вопросы-ответы, статьи
 * по теме и JSON-LD (WebPage + BreadcrumbList + FAQPage).
 */
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Landing, LandingSection } from "@/content/types";
import { SEO_NAV } from "@/content/nav";
import { Breadcrumbs, SeoShell } from "./chrome";
import { FaqList, RelatedCards } from "./blocks-view";
import { Rich } from "./rich-text";
import { articleNode, breadcrumbList, faqPage, JsonLd, organization, pageMetadata } from "./schema";
import { SITE_URL } from "@/lib/site";

/** Дата публикации лендингов. */
export const LANDINGS_PUBLISHED = "2026-10-10";

function pairOf(landing: Landing) {
  return landing.lang === "en" ? { ru: landing.alternate, en: landing.path } : { ru: landing.path, en: landing.alternate };
}

export function landingMetadata(landing: Landing): Metadata {
  return pageMetadata({ lang: landing.lang, path: landing.path, title: landing.metaTitle, description: landing.description, pair: pairOf(landing) });
}

function Section({ section, index }: { section: LandingSection; index: number }) {
  const sand = index % 2 === 0;
  const head = (intro?: string) => (
    <div className="seo-head">
      <span className="home-kicker">{section.kicker}</span>
      <h2 id={`${section.id}-title`} className="seo-h2">{section.title}</h2>
      {intro ? <p className="home-lead"><Rich text={intro} /></p> : null}
    </div>
  );
  return (
    <section id={section.id} className={`seo-section${sand ? " seo-section--sand" : ""}`} aria-labelledby={`${section.id}-title`}>
      <div className="home-container">
        {section.kind === "cards" ? (
          <>
            {head(section.intro)}
            <ul className="seo-cards">
              {section.cards.map((card) => (
                <li key={card.title} className="seo-card">
                  <h3>{card.title}</h3>
                  <p><Rich text={card.text} /></p>
                </li>
              ))}
            </ul>
          </>
        ) : section.kind === "steps" ? (
          <>
            {head(section.intro)}
            <ol className="seo-steps">
              {section.steps.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p><Rich text={step.text} /></p>
                </li>
              ))}
            </ol>
          </>
        ) : section.kind === "table" ? (
          <>
            {head(section.intro)}
            <div className="seo-table-wrap">
              <table>
                <thead>
                  <tr>{section.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.join("|")}>{row.map((cell, i) => <td key={i}><Rich text={cell} /></td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="seo-text">
            {head()}
            {section.paragraphs.map((text) => <p key={text}><Rich text={text} /></p>)}
            {section.list ? (
              <ul className="seo-highlights">
                {section.list.map((item) => <li key={item}><Rich text={item} /></li>)}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

const TEXT = {
  ru: { faqKicker: "Вопросы и ответы", faq: "Частые вопросы", readKicker: "Статьи", read: "Полезно почитать", product: "Сервис «Вместе»" },
  en: { faqKicker: "Questions & answers", faq: "Frequently asked questions", readKicker: "Blog", read: "Helpful reading", product: "Vmeste" },
};

export function LandingView({ landing }: { landing: Landing }) {
  const { lang } = landing;
  const t = TEXT[lang];
  const nav = SEO_NAV[lang];
  const crumbs = [
    { name: nav.homeLabel, href: nav.home },
    { name: landing.crumb, href: landing.path },
  ];
  const page = articleNode({ lang, type: "WebPage", path: landing.path, headline: landing.metaTitle, description: landing.description, published: LANDINGS_PUBLISHED });
  const graph = [
    {
      ...page,
      about: { "@type": "WebApplication", name: t.product, url: lang === "en" ? `${SITE_URL}/en` : `${SITE_URL}/`, applicationCategory: "LifestyleApplication", operatingSystem: "Web", publisher: organization(lang) },
    },
    breadcrumbList(crumbs),
    faqPage(lang, landing.faq),
  ];

  return (
    <SeoShell lang={lang} alternate={landing.alternate}>
      <JsonLd graph={graph} />
      <main>
        <section className="seo-hero" aria-labelledby="hero-title">
          <div className="home-container">
            <Breadcrumbs lang={lang} items={crumbs} />
            <div className="seo-hero-grid">
              <div className="seo-hero-copy">
                <span className="home-kicker">{landing.kicker}</span>
                <h1 id="hero-title" className="seo-h1">{landing.title}</h1>
                <p className="seo-lead"><Rich text={landing.lead} /></p>
                <div className="seo-actions">
                  <Link href={landing.primary.href} className="home-button">{landing.primary.label} <span aria-hidden="true">→</span></Link>
                  <Link href={landing.secondary.href} className="home-link">{landing.secondary.label}</Link>
                </div>
                <ul className="seo-highlights">
                  {landing.highlights.map((item) => <li key={item}><Rich text={item} /></li>)}
                </ul>
              </div>
              <figure className="seo-hero-figure">
                <Image src={landing.image.src} alt={landing.image.alt} width={landing.image.width} height={landing.image.height} sizes="(min-width: 961px) 560px, 100vw" unoptimized priority />
              </figure>
            </div>
          </div>
        </section>

        {landing.sections.map((section, index) => <Section key={section.id} section={section} index={index} />)}

        <section id="faq" className={`seo-section${landing.sections.length % 2 === 0 ? " seo-section--sand" : ""}`} aria-labelledby="faq-title">
          <div className="home-container">
            <div className="seo-head">
              <span className="home-kicker">{t.faqKicker}</span>
              <h2 id="faq-title" className="seo-h2">{t.faq}</h2>
            </div>
            <div className="seo-faq"><FaqList items={landing.faq} /></div>
          </div>
        </section>

        {landing.articles.length ? (
          <section className={`seo-section${landing.sections.length % 2 === 1 ? " seo-section--sand" : ""}`} aria-labelledby="read-title">
            <div className="home-container">
              <div className="seo-head">
                <span className="home-kicker">{t.readKicker}</span>
                <h2 id="read-title" className="seo-h2">{t.read}</h2>
              </div>
              <RelatedCards lang={lang} refs={landing.articles} three />
            </div>
          </section>
        ) : null}

        <section className="seo-final" aria-labelledby="final-title">
          <div className="home-container">
            <span className="home-kicker">{nav.footer.brand}</span>
            <h2 id="final-title">{landing.final.title}</h2>
            <p>{landing.final.text}</p>
            <div className="seo-actions">
              <Link href={nav.register.href} className="home-button">{nav.register.label} <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>
      </main>
    </SeoShell>
  );
}
