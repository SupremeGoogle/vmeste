/**
 * Ссылки шапки и подвала открытых материалов (лендинги и блог) на двух языках.
 */
import type { Lang } from "@/lib/i18n";

export type NavLink = { href: string; label: string };

export const SEO_NAV: Record<
  Lang,
  {
    home: string;
    homeLabel: string;
    blog: NavLink;
    landings: NavLink[];
    register: NavLink;
    login: NavLink;
    sections: string;
    crumbs: string;
    otherLang: { label: string; name: string; fallback: string };
    footer: { tagline: string; product: string; articles: string; account: string; legal: string; features: string; motto: string; brand: string };
    legal: NavLink[];
  }
> = {
  ru: {
    home: "/",
    homeLabel: "Главная",
    blog: { href: "/blog", label: "Статьи" },
    landings: [
      { href: "/elektronnoe-priglashenie-na-svadbu", label: "Приглашения" },
      { href: "/rassadka-gostej-onlajn", label: "Рассадка" },
      { href: "/anketa-gostya-na-svadbu", label: "Анкета гостя" },
    ],
    register: { href: "/register", label: "Создать свадьбу" },
    login: { href: "/login", label: "Войти" },
    sections: "Разделы",
    crumbs: "Навигационная цепочка",
    otherLang: { label: "EN", name: "English version", fallback: "/en" },
    footer: {
      tagline: "Приглашения, гости, рассадка и фотографии — всё для свадьбы в одном месте.",
      product: "Сервис",
      articles: "Статьи",
      account: "Кабинет",
      legal: "Документы",
      features: "Все возможности",
      motto: "Ваш день. Ваша история.",
      brand: "Вместе",
    },
    legal: [
      { href: "/offer", label: "Публичная оферта" },
      { href: "/privacy", label: "Политика конфиденциальности" },
      { href: "/cookies", label: "Политика cookie" },
    ],
  },
  en: {
    home: "/en",
    homeLabel: "Home",
    blog: { href: "/en/blog", label: "Blog" },
    landings: [
      { href: "/en/wedding-invitations", label: "Invitations" },
      { href: "/en/wedding-seating-chart", label: "Seating chart" },
      { href: "/en/wedding-rsvp", label: "RSVP" },
    ],
    register: { href: "/register?lang=en", label: "Create your wedding" },
    login: { href: "/login?lang=en", label: "Sign in" },
    sections: "Sections",
    crumbs: "Breadcrumb",
    otherLang: { label: "RU", name: "Русская версия", fallback: "/" },
    footer: {
      tagline: "Invitations, guest list, seating and photos — your whole wedding in one place.",
      product: "Product",
      articles: "Blog",
      account: "Account",
      legal: "Legal",
      features: "All features",
      motto: "Your day. Your story.",
      brand: "Vmeste",
    },
    legal: [
      { href: "/offer", label: "Terms of Service (in Russian)" },
      { href: "/privacy", label: "Privacy Policy (in Russian)" },
      { href: "/cookies", label: "Cookie Policy (in Russian)" },
    ],
  },
};
