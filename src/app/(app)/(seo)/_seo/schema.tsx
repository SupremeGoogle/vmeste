/**
 * Метаданные и микроразметка (JSON-LD) открытых материалов: одна точка,
 * чтобы canonical, hreflang, Open Graph и schema.org совпадали на всех
 * лендингах и статьях.
 */
import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { plain } from "@/content/blocks";
import type { FaqItem } from "@/content/types";

export const OG_IMAGE = { url: "/media/brand-hero.webp", width: 1672, height: 941 };
const BRAND: Record<Lang, string> = { ru: SITE_NAME, en: "Vmeste" };

/** Пара страниц на двух языках: hreflang и x-default (русская версия). */
export type Pair = { ru: string; en: string };

export function pageMetadata(options: {
  lang: Lang;
  path: string;
  title: string;
  description: string;
  pair?: Pair;
  article?: { published: string; modified?: string };
}): Metadata {
  const { lang, path, title, description, pair, article } = options;
  const en = lang === "en";
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      ...(pair ? { languages: { ru: pair.ru, en: pair.en, "x-default": pair.ru } } : {}),
    },
    openGraph: {
      type: article ? "article" : "website",
      url: path,
      title,
      description,
      siteName: BRAND[lang],
      locale: en ? "en_US" : "ru_RU",
      ...(pair ? { alternateLocale: [en ? "ru_RU" : "en_US"] } : {}),
      images: [{ ...OG_IMAGE, alt: en ? "Vmeste — wedding planning app" : "Вместе — сервис для организации свадьбы" }],
      ...(article ? { publishedTime: article.published, modifiedTime: article.modified ?? article.published } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

const abs = (path: string) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`);

export function organization(lang: Lang) {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: BRAND[lang],
    ...(lang === "en" ? { alternateName: SITE_NAME } : {}),
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
  };
}

export function breadcrumbList(items: { name: string; href: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: abs(item.href) })),
  };
}

export function faqPage(lang: Lang, items: FaqItem[]) {
  return {
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: items.map((item) => ({ "@type": "Question", name: plain(item.q), acceptedAnswer: { "@type": "Answer", text: plain(item.a) } })),
  };
}

export function articleNode(options: {
  lang: Lang;
  type?: "Article" | "WebPage";
  path: string;
  headline: string;
  description: string;
  published: string;
  modified?: string;
  words?: number;
}) {
  const { lang, type = "Article", path, headline, description, published, modified, words } = options;
  const org = organization(lang);
  return {
    "@type": type,
    "@id": `${abs(path)}#page`,
    ...(type === "Article" ? { headline } : { name: headline }),
    description,
    inLanguage: lang,
    url: abs(path),
    mainEntityOfPage: abs(path),
    image: `${SITE_URL}${OG_IMAGE.url}`,
    datePublished: published,
    dateModified: modified ?? published,
    author: org,
    publisher: org,
    ...(words ? { wordCount: words } : {}),
  };
}

/** `<script type="application/ld+json">` с экранированным `<`. */
export function JsonLd({ graph }: { graph: object[] }) {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** «9 октября 2026» / «October 9, 2026». */
export function formatDate(lang: Lang, iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).replace(/\s?г\.$/, "");
}
