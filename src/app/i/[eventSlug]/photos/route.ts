/**
 * Фотографии гостя, вошедшего по QR: он опознан гостевой cookie.
 * Именной ссылки у него может не быть вовсе (PLAN.md §1.3).
 */
import { identifyBySlugSession } from "@/server/guest-access/identify";
import { guestQuota, listApprovedPhotos, listGuestPhotos } from "@/server/services/photos";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { photosPage } from "@/server/guest-html/photos-html";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const guest = await identifyBySlugSession(eventSlug);
  // Нет cookie — 404: подсказывать «здесь бывают чужие фото» незачем.
  if (!guest) {
    return html(
      invitePage({
        title: "Не найдено",
        body: "<section><h1>Страница не найдена</h1></section>",
        noindex: true,
      }),
      { status: 404 },
    );
  }

  const ref = { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.guestId };
  const [quota, mine, gallery] = await Promise.all([
    guestQuota(ref),
    listGuestPhotos(ref),
    listApprovedPhotos(guest.eventId, 60),
  ]);

  return html(
    photosPage({
      eventId: guest.eventId,
      eventTitle: guest.eventTitle,
      guestName: guest.displayName,
      token: null,
      enabled: quota.enabled,
      left: quota.left,
      limit: quota.limit,
      mine,
      gallery,
      wishHref: guest.wishesEnabled ? `/i/${eventSlug}/wish` : null,
      backHref: `/i/${eventSlug}/wish`,
      backLabel: "Написать пожелание",
    }),
    { headers: { "cache-control": "private, no-store" } },
  );
}
