/** Подарки по именной ссылке: здесь гость отмечает «Я подарю это». */
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { getInviteBlocks, getInviteTheme } from "@/server/repositories/invites";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { loadWishlist } from "@/server/guest-html/wishlist";
import { wishlistPage } from "@/server/guest-html/wishlist-page";
import { verifiedNote } from "@/server/guest-html/flash";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  const missing = () => html(invitePage({ title: "Не найдено", body: "<section><h1>Виш-лист не найден</h1></section>", noindex: true }), { status: 404 });
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") return missing();

  const url = new URL(request.url);
  const [blocks, theme, wishlist] = await Promise.all([
    getInviteBlocks(guest.eventId),
    getInviteTheme(guest.eventId),
    loadWishlist(guest.eventId, {
      guestId: guest.id,
      reserveAction: `/i/${eventSlug}/${token}/gift`,
      message: verifiedNote(guest.event.guestLinkSecret, "gift", url.searchParams.get("gift"), url.searchParams.get("gsig")),
    }),
  ]);
  const page = wishlistPage({
    title: guest.event.title, theme, blocks, wishlist,
    eventDate: guest.event.eventDate, timezone: guest.event.timezone,
    back: `/i/${eventSlug}/${token}`,
  });
  return page ? html(page, { headers: { "cache-control": "private, no-store" } }) : missing();
}
