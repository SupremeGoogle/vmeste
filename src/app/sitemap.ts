import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ARTICLES, BLOG_PATH, articlePath } from "@/content/blog";
import { LANDINGS } from "@/content/landings";

/** Пара страниц на двух языках → alternates для hreflang (x-default — русская). */
const pair = (ru: string, en: string) => ({
  languages: { ru: `${SITE_URL}${ru}`, en: `${SITE_URL}${en}`, "x-default": `${SITE_URL}${ru}` },
});

/** Русская и английская титульные — пара hreflang для поисковиков. */
const LANDING_ALTERNATES = pair("/", "/en");

/** Дата правки статьи: для статей она известна точно. */
const articleDate = (article: { published: string; updated?: string }) => new Date(`${article.updated ?? article.published}T12:00:00Z`);

/**
 * Открытые страницы — те же, что разрешены в robots.ts.
 *
 * `lastModified` только там, где дата правки настоящая (статьи и списки
 * статей). Раньше каждой странице ставилось время генерации sitemap — то
 * есть «изменено сейчас» при каждом обходе, а Google такие даты учится
 * игнорировать для всего сайта.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  });

  // Поисковые лендинги: у каждого есть пара на другом языке.
  const landings = (["ru", "en"] as const).flatMap((lang) =>
    LANDINGS[lang].map((landing) => ({
      ...page(landing.path, lang === "ru" ? 0.8 : 0.7, "monthly"),
      alternates: lang === "ru" ? pair(landing.path, landing.alternate) : pair(landing.alternate, landing.path),
    })),
  );

  // Блог: списки статей — пара, статьи — пара, только если есть перевод.
  const blog = (["ru", "en"] as const).flatMap((lang) => [
    {
      ...page(BLOG_PATH[lang], 0.6, "weekly"),
      ...(ARTICLES[lang].length ? { lastModified: new Date(Math.max(...ARTICLES[lang].map((article) => articleDate(article).getTime()))) } : {}),
      alternates: pair(BLOG_PATH.ru, BLOG_PATH.en),
    },
    ...ARTICLES[lang].map((article) => {
      const entry = { ...page(articlePath(lang, article.slug), 0.6, "monthly"), lastModified: articleDate(article) };
      if (!article.alternate) return entry;
      const other = articlePath(lang === "ru" ? "en" : "ru", article.alternate);
      const self = articlePath(lang, article.slug);
      return { ...entry, alternates: lang === "ru" ? pair(self, other) : pair(other, self) };
    }),
  ]);

  return [
    { ...page("/", 1, "weekly"), alternates: LANDING_ALTERNATES },
    { ...page("/en", 0.9, "weekly"), alternates: LANDING_ALTERNATES },
    ...landings,
    ...blog,
    page("/register", 0.6, "monthly"),
    page("/login", 0.3, "yearly"),
    page("/offer", 0.2, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/consent", 0.1, "yearly"),
    page("/cookies", 0.1, "yearly"),
  ];
}
