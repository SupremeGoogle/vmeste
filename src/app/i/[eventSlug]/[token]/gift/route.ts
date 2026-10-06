/**
 * Бронь подарка прямо из приглашения: «Я подарю это» в разделе «Виш-лист».
 *
 * Обычный POST без скриптов, как и анкета: гость возвращается к тому же
 * разделу с сообщением о результате. Личность — токен именной ссылки.
 */
import { tooManyFromClient } from "@/server/rate-limit/client-key";
import { identifyByToken } from "@/server/guest-access/identify";
import { findGuestByLinkToken } from "@/server/repositories/guests";
import { reserveGift } from "@/server/services/gifts";
import { signNote } from "@/server/guest-html/flash";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string; token: string }> },
) {
  const limited = tooManyFromClient(request, "gift", 60);
  if (limited) return limited;
  const { eventSlug, token } = await params;
  const guest = await findGuestByLinkToken(token);
  if (!guest || guest.event.slug !== eventSlug) return new Response("Не найдено", { status: 404 });
  const identity = await identifyByToken(token);
  if (!identity) return new Response("Не найдено", { status: 404 });

  const form = await request.formData();
  const result = await reserveGift(identity, String(form.get("giftId") ?? ""), form.get("release") === "1");
  return new Response(null, {
    status: 303,
    // Текст результата подписан: иначе на странице пары можно было бы
    // показать гостям что угодно, прислав им ссылку с «?gift=…».
    headers: { location: `/i/${eventSlug}/${token}/wishlist?${new URLSearchParams({ gift: result.message, gsig: signNote(guest.event.guestLinkSecret, "gift", result.message) })}` },
  });
}
