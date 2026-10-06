/**
 * Виш-лист переехал в «Приглашение»: он теперь раздел самого приглашения.
 * Старый адрес оставлен, чтобы закладки и ссылки из писем не вели в 404.
 */
import { redirect } from "next/navigation";

export default async function GiftsMoved({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(`/app/e/${eventId}/invite/wishlist`);
}
