/**
 * Пожелание молодожёнам по именной ссылке.
 * GET рисует форму, POST принимает — без клиентского кода.
 */
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { createWish, listGuestWishes } from "@/server/services/wishes";
import { html } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import { wishPage } from "@/server/guest-html/wish-html";

export const dynamic = "force-dynamic";

const missing = () =>
  html(
    invitePage({
      title: "Не найдено",
      body: "<section><h1>Приглашение не найдено</h1></section>",
      noindex: true,
    }),
    { status: 404 },
  );

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return missing();
  }

  const url = new URL(request.url);
  const mine = await listGuestWishes({ eventId: guest.eventId, guestId: guest.id });

  return html(
    wishPage({
      eventTitle: guest.event.title,
      authorName: guest.displayName,
      enabled: guest.event.wishesEnabled,
      mine,
      action: `/i/${eventSlug}/${token}/wish`,
      backHref: `/i/${eventSlug}/${token}`,
      backLabel: "Вернуться к приглашению",
      saved: url.searchParams.get("ok") === "1",
      error: url.searchParams.get("error"),
    }),
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug || guest.event.status === "ARCHIVED") {
    return missing();
  }

  const form = await request.formData();
  const result = await createWish(
    { orgId: guest.orgId, eventId: guest.eventId, guestId: guest.id },
    {
      authorName: String(form.get("authorName") ?? ""),
      text: String(form.get("text") ?? ""),
    },
  );

  const query = result.ok ? "?ok=1" : `?error=${encodeURIComponent(result.message)}`;
  return new Response(null, {
    status: 303,
    headers: { location: `/i/${eventSlug}/${token}/wish${query}` },
  });
}
