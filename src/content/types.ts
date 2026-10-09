/**
 * Типы открытых материалов сайта: статьи блога и поисковые лендинги.
 *
 * Тексты лежат данными (src/content/**), а разметку рисует один общий
 * макет — так у всех страниц одинаковые заголовки, микроразметка и
 * перелинковка, и новая статья — это один файл без вёрстки.
 *
 * Внутри строк — маленькая разметка: `**жирный**` и `[текст](/адрес)`.
 * Её разбирает `rich-text.tsx`; для JSON-LD она снимается функцией `plain`.
 */
import type { Lang } from "@/lib/i18n";

export type Block =
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  /** Примеры текстов (приглашений, сообщений): нумерованные карточки. */
  | { type: "examples"; items: { label: string; text: string }[] }
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  /** Врезка-совет. */
  | { type: "tip"; title: string; text: string }
  /** Призыв к действию посреди статьи. */
  | { type: "cta"; title: string; text: string; href: string; button: string };

export type FaqItem = { q: string; a: string };

export type Article = {
  lang: Lang;
  slug: string;
  /** Заголовок H1. */
  title: string;
  /** <title>, не длиннее 60 знаков. */
  metaTitle: string;
  /** meta description, не длиннее 160 знаков. */
  description: string;
  /** Короткий прямой ответ в начале статьи — для быстрых ответов поисковиков. */
  answer: string;
  /** Короткое название — для подвала, крошек и списков. */
  short: string;
  /** Подпись в списке статей. */
  excerpt: string;
  published: string;
  updated?: string;
  /** Тематика — плашка над заголовком. */
  topic: string;
  /** Пара на другом языке (slug) — для hreflang. */
  alternate?: string;
  blocks: Block[];
  faq: FaqItem[];
  /** Пути лендингов и slug-и статей того же языка, на которые стоит сослаться внизу. */
  related: string[];
};

export type LandingSection =
  | { kind: "cards"; id: string; kicker: string; title: string; intro?: string; cards: { title: string; text: string }[] }
  | { kind: "steps"; id: string; kicker: string; title: string; intro?: string; steps: { title: string; text: string }[] }
  | { kind: "text"; id: string; kicker: string; title: string; paragraphs: string[]; list?: string[] }
  | { kind: "table"; id: string; kicker: string; title: string; intro?: string; head: string[]; rows: string[][] };

export type Landing = {
  lang: Lang;
  /** Путь страницы: «/rassadka-gostej-onlajn», «/en/wedding-seating-chart». */
  path: string;
  /** Путь пары на другом языке. */
  alternate: string;
  metaTitle: string;
  description: string;
  /** Последний пункт хлебных крошек. */
  crumb: string;
  kicker: string;
  title: string;
  /** Короткий прямой ответ: что это и как работает. */
  lead: string;
  highlights: string[];
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  image: { src: string; alt: string; width: number; height: number };
  sections: LandingSection[];
  faq: FaqItem[];
  /** slug-и статей того же языка. */
  articles: string[];
  final: { title: string; text: string };
};
