/**
 * Список статей блога (/blog и /en/blog) с разметкой Blog + BreadcrumbList.
 */
import Link from "next/link";
import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";
import { ARTICLES, BLOG_PATH, articlePath } from "@/content/blog";
import { SEO_NAV } from "@/content/nav";
import { SITE_URL } from "@/lib/site";
import { Breadcrumbs, SeoShell } from "./chrome";
import { RelatedCards } from "./blocks-view";
import { breadcrumbList, JsonLd, organization, pageMetadata } from "./schema";

const TEXT = {
  ru: {
    metaTitle: "Статьи о подготовке к свадьбе — блог «Вместе»",
    description: "Практичные статьи о свадьбе: тексты приглашений, список гостей, рассадка, тайминг дня и сбор ответов гостей. Советы без воды и готовые примеры.",
    kicker: "Блог",
    title: "Статьи о подготовке к свадьбе",
    lead: "Разбираем то, на чём чаще всего спотыкаются при подготовке: кого звать, как пригласить, как собрать ответы, рассадить гостей и расписать день по часам.",
    services: "Инструменты сервиса",
  },
  en: {
    metaTitle: "Wedding planning articles — the Vmeste blog",
    description: "Practical wedding planning guides: invitation wording, seating charts and collecting RSVPs online. Clear steps and ready-to-use examples.",
    kicker: "Blog",
    title: "Wedding planning articles",
    lead: "Practical guides to the parts of wedding planning that trip people up most: what to write on the invitation, how to collect RSVPs and how to seat everyone.",
    services: "Tools in Vmeste",
  },
};

const PAIR = { ru: BLOG_PATH.ru, en: BLOG_PATH.en };

export function blogIndexMetadata(lang: Lang): Metadata {
  const t = TEXT[lang];
  return pageMetadata({ lang, path: BLOG_PATH[lang], title: t.metaTitle, description: t.description, pair: PAIR });
}

export function BlogIndexView({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const nav = SEO_NAV[lang];
  const articles = ARTICLES[lang];
  const crumbs = [
    { name: nav.homeLabel, href: nav.home },
    { name: nav.blog.label, href: BLOG_PATH[lang] },
  ];
  const graph = [
    {
      "@type": "Blog",
      "@id": `${SITE_URL}${BLOG_PATH[lang]}#blog`,
      name: t.title,
      description: t.description,
      url: `${SITE_URL}${BLOG_PATH[lang]}`,
      inLanguage: lang,
      publisher: organization(lang),
      blogPost: articles.map((article) => ({
        "@type": "BlogPosting",
        headline: article.title,
        url: `${SITE_URL}${articlePath(lang, article.slug)}`,
        datePublished: article.published,
        author: organization(lang),
      })),
    },
    breadcrumbList(crumbs),
  ];

  return (
    <SeoShell lang={lang} alternate={BLOG_PATH[lang === "en" ? "ru" : "en"]}>
      <JsonLd graph={graph} />
      <main>
        <section className="seo-hero" aria-labelledby="blog-title">
          <div className="home-container">
            <Breadcrumbs lang={lang} items={crumbs} />
            <div className="seo-head" style={{ marginTop: 26 }}>
              <span className="home-kicker">{t.kicker}</span>
              <h1 id="blog-title" className="seo-h1">{t.title}</h1>
              <p className="seo-lead">{t.lead}</p>
            </div>
            <RelatedCards lang={lang} refs={articles.map((article) => article.slug)} three />
          </div>
        </section>
        <section className="seo-section seo-section--sand" aria-labelledby="tools-title">
          <div className="home-container">
            <div className="seo-head">
              <span className="home-kicker">{nav.footer.product}</span>
              <h2 id="tools-title" className="seo-h2">{t.services}</h2>
            </div>
            <RelatedCards lang={lang} refs={nav.landings.map((link) => link.href)} three />
            <div className="seo-actions">
              <Link href={nav.register.href} className="home-button">{nav.register.label} <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>
      </main>
    </SeoShell>
  );
}
