/**
 * Общий макет статьи блога (русской и английской): крошки, H1, короткий
 * ответ, оглавление, текст, вопросы-ответы, «читайте также» и JSON-LD
 * (Article + BreadcrumbList + FAQPage).
 */
import Link from "next/link";
import type { Metadata } from "next";
import type { Article } from "@/content/types";
import { articlePath, BLOG_PATH } from "@/content/blog";
import { readingMinutes, wordCount, plain } from "@/content/blocks";
import { SEO_NAV } from "@/content/nav";
import { Breadcrumbs, SeoShell } from "./chrome";
import { Blocks, FaqList, RelatedCards } from "./blocks-view";
import { Rich } from "./rich-text";
import { articleNode, breadcrumbList, faqPage, formatDate, JsonLd, pageMetadata, type Pair } from "./schema";

function pairOf(article: Article): Pair | undefined {
  if (!article.alternate) return undefined;
  return article.lang === "en"
    ? { ru: articlePath("ru", article.alternate), en: articlePath("en", article.slug) }
    : { ru: articlePath("ru", article.slug), en: articlePath("en", article.alternate) };
}

export function articleMetadata(article: Article): Metadata {
  return pageMetadata({
    lang: article.lang,
    path: articlePath(article.lang, article.slug),
    title: article.metaTitle,
    description: article.description,
    pair: pairOf(article),
    article: { published: article.published, modified: article.updated },
  });
}

const TEXT = {
  ru: { answer: "Коротко", toc: "Содержание", faq: "Частые вопросы", related: "Читайте также", minutes: "мин чтения", by: "Редакция «Вместе»", updated: "обновлено", final: "Соберите свадьбу в одном месте", finalText: "Приглашения с именной ссылкой, ответы гостей, рассадка на плане зала и вход по QR-коду — в одном кабинете." },
  en: { answer: "Short answer", toc: "Contents", faq: "FAQ", related: "Keep reading", minutes: "min read", by: "The Vmeste team", updated: "updated", final: "Plan your whole wedding in one place", finalText: "Invitations with a personal link for every guest, RSVPs, a seating chart on your floor plan and QR check-in — all in one dashboard." },
};

export function ArticleView({ article }: { article: Article }) {
  const { lang } = article;
  const t = TEXT[lang];
  const nav = SEO_NAV[lang];
  const path = articlePath(lang, article.slug);
  const pair = pairOf(article);
  const toc = article.blocks.flatMap((block) => (block.type === "h2" ? [block] : []));
  const crumbs = [
    { name: nav.homeLabel, href: nav.home },
    { name: nav.blog.label, href: BLOG_PATH[lang] },
    { name: article.short, href: path },
  ];
  const graph = [
    articleNode({ lang, path, headline: article.title, description: article.description, published: article.published, modified: article.updated, words: wordCount(article) }),
    breadcrumbList(crumbs),
    ...(article.faq.length ? [faqPage(lang, article.faq)] : []),
  ];

  return (
    <SeoShell lang={lang} alternate={pair ? (lang === "en" ? pair.ru : pair.en) : BLOG_PATH[lang === "en" ? "ru" : "en"]}>
      <JsonLd graph={graph} />
      <main className="home-container seo-article-wrap">
        <article className="seo-article">
          <Breadcrumbs lang={lang} items={crumbs} />
          <header className="seo-article-head">
            <span className="home-kicker">{article.topic}</span>
            <h1>{article.title}</h1>
            <p className="seo-meta">
              <span>{t.by}</span>
              <time dateTime={article.published}>{formatDate(lang, article.published)}</time>
              {article.updated && article.updated !== article.published ? (
                <span>{t.updated} <time dateTime={article.updated}>{formatDate(lang, article.updated)}</time></span>
              ) : null}
              <span>{readingMinutes(article)} {t.minutes}</span>
            </p>
            <div className="seo-answer">
              <span className="seo-answer-label">{t.answer}</span>
              <Rich text={article.answer} />
            </div>
          </header>

          <nav className="seo-toc" aria-labelledby="toc-title">
            <div id="toc-title" className="seo-toc-title">{t.toc}</div>
            <ol>
              {toc.map((block) => (
                <li key={block.id}><a href={`#${block.id}`}>{plain(block.text)}</a></li>
              ))}
              {article.faq.length ? <li><a href="#faq">{t.faq}</a></li> : null}
            </ol>
          </nav>

          <div className="seo-prose">
            <Blocks blocks={article.blocks} />
          </div>

          {article.faq.length ? (
            <section className="seo-faq" aria-labelledby="faq">
              <h2 id="faq" className="seo-faq-title">{t.faq}</h2>
              <FaqList items={article.faq} />
            </section>
          ) : null}

          {article.related.length ? (
            <section className="seo-related" aria-labelledby="related">
              <h2 id="related" className="seo-related-title">{t.related}</h2>
              <RelatedCards lang={lang} refs={article.related} />
            </section>
          ) : null}
        </article>
      </main>

      <section className="seo-final" aria-labelledby="final-title">
        <div className="home-container">
          <span className="home-kicker">{nav.footer.brand}</span>
          <h2 id="final-title">{t.final}</h2>
          <p>{t.finalText}</p>
          <div className="seo-actions">
            <Link href={nav.register.href} className="home-button">{nav.register.label} <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </SeoShell>
  );
}
