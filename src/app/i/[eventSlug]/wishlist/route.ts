/**
 * Подарки по общей ссылке. Смотреть можно всем, выбрать подарок — после
 * ответа на приглашение: тогда у гостя появляется своя именная ссылка.
 */
import { getInviteBySlug } from "@/server/repositories/invites";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { loadWishlist } from "@/server/guest-html/wishlist";
import { wishlistPage } from "@/server/guest-html/wishlist-page";
import { themeInLang, withGuestLang } from "@/server/guest-html/guest-lang";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const invite = await getInviteBySlug(eventSlug);
  const missing = () => html(invitePage({ title: "Не найдено", body: "<section><h1>Виш-лист не найден</h1></section>" }), { status: 404 });
  if (!invite) return missing();
  const wishlist = await loadWishlist(invite.event.id, { joinHref: `/i/${eventSlug}/join` });
  const page = withGuestLang(invite.event.language, () => wishlistPage({
    title: invite.event.title, theme: themeInLang(invite.theme, invite.event.language), blocks: invite.blocks, wishlist,
    eventDate: invite.event.eventDate, timezone: invite.event.timezone,
    back: `/i/${eventSlug}`,
  }));
  return page ? html(page) : missing();
}
