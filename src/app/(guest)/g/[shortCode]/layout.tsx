import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { findEventByShortCode } from "@/server/repositories/events";
import { db } from "@/server/db";
import { readGuestAppearance } from "@/lib/guest-appearance";
import { GuestAppearanceFrame } from "@/components/guest/appearance/guest-appearance";
import { I18nProvider } from "@/components/i18n-provider";
import { parseLang } from "@/lib/i18n";

/**
 * The selected QR theme follows guests to their photos, gifts and seating.
 * Язык гостевых страниц — язык мероприятия (Event.language), а не браузера:
 * клиентские компоненты берут его через useT().
 */
export default async function GuestAppearanceLayout({ children, params }: { children: ReactNode; params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();
  const settings = await db.event.findFirst({ where: { id: event.id, orgId: event.orgId }, select: { printDesign: true } });
  const theme = readGuestAppearance(settings?.printDesign);
  const lang = parseLang(event.language) ?? "ru";
  // Preserve all existing weddings until their organiser explicitly selects a design.
  const content = theme ? <GuestAppearanceFrame theme={theme}>{children}</GuestAppearanceFrame> : children;
  return <I18nProvider lang={lang}><div lang={lang} className="contents">{content}</div></I18nProvider>;
}
