import { findGuestByLinkToken } from "@/server/repositories/guests";
import { identifyByToken } from "@/server/guest-access/identify";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ eventSlug: string; token: string }> }) {
  const { eventSlug, token } = await params;
  const row = await findGuestByLinkToken(token);
  if (!row || row.event.slug !== eventSlug || row.event.status === "ARCHIVED") return new Response(null, { status: 404 });
  const guest = await identifyByToken(token);
  if (!guest) return new Response(null, { status: 404 });
  const event = await db.event.findFirst({ where: { id: guest.eventId, orgId: guest.orgId }, select: { shortCode: true } });
  if (!event) return new Response(null, { status: 404 });
  const section = new URL(request.url).searchParams.get("section");
  const path = `/g/${event.shortCode}${section === "album" || section === "gifts" ? `/${section}` : ""}`;
  return NextResponse.redirect(new URL(path, request.url), { status: 303, headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
}
