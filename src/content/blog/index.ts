/**
 * Реестр статей блога. Порядок в списке — порядок на странице /blog
 * и в подвале (первые четыре).
 */
import type { Lang } from "@/lib/i18n";
import type { Article } from "../types";
import { invitationText } from "./ru/tekst-priglasheniya-na-svadbu";
import { seatingGuide } from "./ru/kak-rassadit-gostej-na-svadbe";
import { rsvpGuide } from "./ru/kak-sobrat-otvety-gostej";
import { guestList } from "./ru/spisok-gostej-na-svadbu";
import { weddingTiming } from "./ru/tajming-svadby";
import { paperOrDigital } from "./ru/elektronnoe-ili-bumazhnoe-priglashenie";
import { invitationWording } from "./en/wedding-invitation-wording";
import { seatingChartGuide } from "./en/how-to-make-a-wedding-seating-chart";
import { rsvpOnline } from "./en/how-to-collect-wedding-rsvps-online";

export const ARTICLES: Record<Lang, Article[]> = {
  ru: [invitationText, seatingGuide, rsvpGuide, guestList, weddingTiming, paperOrDigital],
  en: [invitationWording, seatingChartGuide, rsvpOnline],
};

export const BLOG_PATH: Record<Lang, string> = { ru: "/blog", en: "/en/blog" };

export function articlePath(lang: Lang, slug: string): string {
  return `${BLOG_PATH[lang]}/${slug}`;
}

export function getArticle(lang: Lang, slug: string): Article | undefined {
  return ARTICLES[lang].find((article) => article.slug === slug);
}
