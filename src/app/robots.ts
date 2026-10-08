import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Поисковикам открыт лендинг, регистрация и юридические страницы. Кабинет,
 * API и всё гостевое (приглашения пар, именные ссылки, альбомы) закрыто:
 * это чужие свадьбы, им не место в выдаче.
 *
 * ИИ-роботов (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) не
 * выделяем: открытая часть сайта — реклама сервиса, и чем больше моделей
 * о нём знает, тем чаще его советуют в ответах.
 */
const PRIVATE = ["/app$", "/app/", "/api/", "/admin", "/i/", "/e/", "/g/", "/team/", "/screen", "/demo", "/editorial-qa", "/forgot", "/reset"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
