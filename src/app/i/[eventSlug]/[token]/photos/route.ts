/**
 * Фотографии гостя, пришедшего по именной ссылке.
 */
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { guestQuota, listApprovedPhotos, listGuestPhotos } from "@/server/services/photos";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { photosPage } from "@/server/guest-html/photos-html";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return html(
      invitePage({
        title: "Не найдено",
        body: "<section><h1>Приглашение не найдено</h1></section>",
        noindex: true,
      }),
      { status: 404 },
    );
  }

  const ref = { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.id };
  const [quota, mine, gallery] = await Promise.all([
    guestQuota(ref),
    listGuestPhotos(ref),
    listApprovedPhotos(guest.eventId, 60),
  ]);

  return html(
    photosPage({
      eventId: guest.eventId,
      eventTitle: guest.event.title,
      guestName: guest.displayName,
      token,
      enabled: quota.enabled,
      left: quota.left,
      limit: quota.limit,
      mine,
      gallery,
      wishHref: guest.event.wishesEnabled ? `/i/${eventSlug}/${token}/wish` : null,
      backHref: `/i/${eventSlug}/${token}`,
      backLabel: "Вернуться к приглашению",
    }),
    { headers: { "cache-control": "private, no-store" } },
  );
}
