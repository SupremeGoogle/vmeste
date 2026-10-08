import type { Metadata } from "next";
import { EN_DESCRIPTION, EN_TITLE, LandingPage } from "../../(app)/_landing/landing-page";
import { LANDING_LANGUAGES } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: EN_TITLE },
  description: EN_DESCRIPTION,
  alternates: { canonical: "/en", languages: LANDING_LANGUAGES },
  openGraph: {
    url: "/en",
    title: EN_TITLE,
    description: EN_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["ru_RU"],
    images: [{ url: "/media/brand-hero.webp", alt: "Vmeste — wedding planning app" }],
  },
  twitter: { card: "summary_large_image", title: EN_TITLE, description: EN_DESCRIPTION, images: ["/media/brand-hero.webp"] },
};

/** Английская титульная: та же разметка, что у «/», тексты — по-английски. */
export default function EnglishHomePage() {
  return <LandingPage lang="en" />;
}
