/**
 * Реестр поисковых лендингов. Путь — ключ: по нему лендинг находят
 * страницы, карточки «читайте также», sitemap и llms.txt.
 */
import type { Lang } from "@/lib/i18n";
import type { Landing } from "../types";
import { invitationsRu } from "./ru/elektronnoe-priglashenie-na-svadbu";
import { seatingRu } from "./ru/rassadka-gostej-onlajn";
import { rsvpRu } from "./ru/anketa-gostya-na-svadbu";
import { invitationsEn } from "./en/wedding-invitations";
import { seatingEn } from "./en/wedding-seating-chart";
import { rsvpEn } from "./en/wedding-rsvp";

export const LANDINGS: Record<Lang, Landing[]> = {
  ru: [invitationsRu, seatingRu, rsvpRu],
  en: [invitationsEn, seatingEn, rsvpEn],
};

export function getLanding(path: string): Landing | undefined {
  return [...LANDINGS.ru, ...LANDINGS.en].find((landing) => landing.path === path);
}

/** Лендинг по пути — для страниц: путь известен заранее, отсутствие — ошибка сборки. */
export function landingAt(path: string): Landing {
  const landing = getLanding(path);
  if (!landing) throw new Error(`Нет лендинга ${path}`);
  return landing;
}
