/**
 * Публикация приглашения: снимок черновика уходит гостям, статус —
 * «опубликовано». Общая для редактора приглашения и страницы после
 * оплаты. Неоплаченную свадьбу не опубликует: `setEventStatus` пропускает
 * PUBLISHED только при `paidAt` (server/billing.ts). Сброс кеша — за
 * вызывающим: `updateTag` разрешён только в server action.
 */
import type { EventContext } from "@/server/context";
import { getEvent, setEventStatus } from "@/server/repositories/events";
import { saveSnapshot } from "@/server/repositories/invite-draft";
import { notifyPublished } from "@/server/notify/events";

export async function publishEvent(ctx: EventContext): Promise<{ slug: string } | null> {
  if (!(await saveSnapshot(ctx))) return null;
  if (!(await setEventStatus(ctx, ctx.eventId, "PUBLISHED"))) return null;
  const published = await getEvent(ctx, ctx.eventId);
  if (!published) return null;
  notifyPublished(published.title, `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/i/${published.slug}`);
  return { slug: published.slug };
}
