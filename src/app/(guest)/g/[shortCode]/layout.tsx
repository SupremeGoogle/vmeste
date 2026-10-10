import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { findEventByShortCode } from "@/server/repositories/events";
import { db } from "@/server/db";
import { readGuestAppearance } from "@/lib/guest-appearance";
import { GuestAppearanceFrame } from "@/components/guest/appearance/guest-appearance";

/** The selected QR theme follows guests to their photos, gifts and seating. */
export default async function GuestAppearanceLayout({ children, params }: { children: ReactNode; params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const event = await findEventByShortCode(shortCode);
  if (!event) notFound();
  const settings = await db.event.findFirst({ where: { id: event.id, orgId: event.orgId }, select: { printDesign: true } });
  const theme = readGuestAppearance(settings?.printDesign);
  // Preserve all existing weddings until their organiser explicitly selects a design.
  return theme ? <GuestAppearanceFrame theme={theme}>{children}</GuestAppearanceFrame> : children;
}
