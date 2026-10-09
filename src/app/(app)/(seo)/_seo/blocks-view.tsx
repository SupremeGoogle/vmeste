/**
 * Отрисовка блоков статьи, вопросов-ответов и карточек «читайте также».
 */
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { Block, FaqItem } from "@/content/types";
import { getArticle, articlePath } from "@/content/blog";
import { getLanding } from "@/content/landings";
import { readingMinutes } from "@/content/blocks";
import { Rich } from "./rich-text";

export function Blocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "h2":
        return <h2 key={index} id={block.id}><Rich text={block.text} /></h2>;
      case "h3":
        return <h3 key={index}><Rich text={block.text} /></h3>;
      case "p":
        return <p key={index}><Rich text={block.text} /></p>;
      case "ul":
        return <ul key={index}>{block.items.map((item) => <li key={item}><Rich text={item} /></li>)}</ul>;
      case "ol":
        return <ol key={index}>{block.items.map((item) => <li key={item}><Rich text={item} /></li>)}</ol>;
      case "examples":
        return (
          <ul key={index} className="seo-examples">
            {block.items.map((item) => (
              <li key={item.label} className="seo-example">
                <div className="seo-example-label">{item.label}</div>
                <blockquote className="seo-example-text">{item.text}</blockquote>
              </li>
            ))}
          </ul>
        );
      case "table":
        return (
          <div key={index} className="seo-table-wrap">
            <table>
              {block.caption ? <caption>{block.caption}</caption> : null}
              <thead>
                <tr>{block.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.join("|")}>{row.map((cell, i) => <td key={i}><Rich text={cell} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "tip":
        return (
          <aside key={index} className="seo-tip">
            <strong className="seo-tip-title">{block.title}</strong>
            <Rich text={block.text} />
          </aside>
        );
      case "cta":
        return (
          <aside key={index} className="seo-cta">
            <p className="seo-cta-title">{block.title}</p>
            <p>{block.text}</p>
            <Link href={block.href} className="home-button home-button--light">
              {block.button} <span aria-hidden="true">→</span>
            </Link>
          </aside>
        );
    }
  });
}

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="seo-faq-list">
      {items.map((item) => (
        <details key={item.q}>
          <summary><Rich text={item.q} /></summary>
          <p><Rich text={item.a} /></p>
        </details>
      ))}
    </div>
  );
}

/** Карточки статей и лендингов по списку: slug статьи или путь лендинга («/…»). */
export function RelatedCards({ lang, refs, three = false }: { lang: Lang; refs: string[]; three?: boolean }) {
  const minutes = lang === "en" ? "min read" : "мин чтения";
  const cards = refs.flatMap((ref) => {
    if (ref.startsWith("/")) {
      const landing = getLanding(ref);
      return landing ? [{ href: landing.path, topic: lang === "en" ? "Feature" : "Сервис", title: landing.crumb, text: landing.description, meta: lang === "en" ? "Open the feature →" : "Подробнее о возможности →" }] : [];
    }
    const article = getArticle(lang, ref);
    return article ? [{ href: articlePath(lang, article.slug), topic: article.topic, title: article.short, text: article.excerpt, meta: `${readingMinutes(article)} ${minutes}` }] : [];
  });
  return (
    <ul className={`seo-posts${three ? " seo-posts--three" : ""}`}>
      {cards.map((card) => (
        <li key={card.href}>
          <Link href={card.href} className="seo-post">
            <span className="seo-post-topic">{card.topic}</span>
            <span className="seo-post-title" role="heading" aria-level={3}>{card.title}</span>
            <p>{card.text}</p>
            <span className="seo-post-meta">{card.meta}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
