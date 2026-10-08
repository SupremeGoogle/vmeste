import type { Metadata } from "next";
import { LandingPage } from "./_landing/landing-page";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { LANDING_LANGUAGES } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/", languages: LANDING_LANGUAGES },
  openGraph: {
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/media/brand-hero.webp", alt: "Вместе — сервис для организации свадьбы" }],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: ["/media/brand-hero.webp"] },
};

/** Русская титульная; английская — на /en, разметка у них общая (_landing/landing-page). */
export default function HomePage() {
  return <LandingPage lang="ru" />;
}
