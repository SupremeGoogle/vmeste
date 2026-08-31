/**
 * Пожелание от гостя, вошедшего по QR: он опознан гостевой cookie,
 * именной ссылки у него может не быть вовсе (PLAN.md §1.3).
 */
import { identifyBySlugSession } from "@/server/guest-access/identify";
import { createWish, listGuestWishes } from "@/server/services/wishes";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { wishPage } from "@/server/guest-html/wish-html";
import { getInviteTheme } from "@/server/repositories/invites";

export const dynamic = "force-dynamic";

const missing = () =>
  html(
    invitePage({
      title: "Не найдено",
      body: "<section><h1>Страница не найдена</h1></section>",
      noindex: true,
    }),
    { status: 404 },
  );

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const guest = await identifyBySlugSession(eventSlug);
  if (!guest) return missing();

  const url = new URL(request.url);
  const theme = await getInviteTheme(guest.eventId);
  const mine = await listGuestWishes({ eventId: guest.eventId, guestId: guest.guestId });

  return html(
    wishPage({
      theme,
      eventTitle: guest.eventTitle,
      authorName: guest.displayName,
      enabled: guest.wishesEnabled,
      mine,
      action: `/i/${eventSlug}/wish`,
      backHref: guest.photosEnabled ? `/i/${eventSlug}/photos` : `/i/${eventSlug}/wish`,
      backLabel: guest.photosEnabled ? "Загрузить фотографии" : "Обновить страницу",
      saved: url.searchParams.get("ok") === "1",
      error: url.searchParams.get("error"),
    }),
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const guest = await identifyBySlugSession(eventSlug);
  if (!guest) return missing();

  const form = await request.formData();
  const result = await createWish(
    { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.guestId },
    {
      authorName: String(form.get("authorName") ?? ""),
      text: String(form.get("text") ?? ""),
    },
  );

  const query = result.ok ? "?ok=1" : `?error=${encodeURIComponent(result.message)}`;
  return new Response(null, {
    status: 303,
    headers: { location: `/i/${eventSlug}/wish${query}` },
  });
}
