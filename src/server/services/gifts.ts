/**
 * Виш-лист (список подарков) и конверт.
 *
 * Бронь «я беру этот подарок» держит уникальный индекс по подарку: двое,
 * нажавшие одновременно, не получат одну вещь на двоих. Второе правило —
 * один подарок на гостя: иначе один человек мог бы занять весь список.
 * Его проверка идёт под блокировкой гостя, как и квота фотографий.
 */
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import type { GuestIdentity } from "@/server/guest-access/identify";
import { envelopeInput, giftInput } from "@/lib/wedding-day";

export const GIFTS_PER_GUEST = 1;

type Result = { ok: boolean; message: string };

export async function saveEnvelope(ctx: EventContext, input: unknown): Promise<Result> {
  const parsed = envelopeInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { enabled, label, details, url } = parsed.data;
  await db.event.updateMany({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    data: { giftsEnabled: enabled, giftTransferLabel: label, giftTransferDetails: details, giftTransferUrl: url },
  });
  // Флаг и раздел приглашения — одно и то же (см. setWishlistShown).
  await db.inviteBlock.updateMany({ where: { eventId: ctx.eventId, orgId: ctx.orgId, type: "WISHLIST" }, data: { visible: enabled } });
  return { ok: true, message: "Сохранено" };
}

export async function saveGift(ctx: EventContext, id: string, input: unknown): Promise<Result> {
  const parsed = giftInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  // Картинка чужого мероприятия по подставленному адресу не пройдёт.
  if (parsed.data.imageUrl && !parsed.data.imageUrl.startsWith(`/api/asset/${ctx.eventId}/`)) {
    return { ok: false, message: "Выберите картинку из загруженных" };
  }
  if (id) {
    const updated = await db.gift.updateMany({ where: { id, eventId: ctx.eventId, orgId: ctx.orgId }, data: parsed.data });
    if (!updated.count) return { ok: false, message: "Подарок не найден" };
    return { ok: true, message: "Подарок сохранён" };
  }
  await db.gift.create({ data: { ...parsed.data, eventId: ctx.eventId, orgId: ctx.orgId } });
  return { ok: true, message: "Подарок добавлен" };
}

export async function reserveGift(guest: GuestIdentity, giftId: string, release: boolean): Promise<Result> {
  const event = await db.event.findFirst({
    where: { id: guest.eventId, orgId: guest.orgId, giftsEnabled: true, status: { not: "ARCHIVED" } },
    select: { id: true },
  });
  if (!event) return { ok: false, message: "Список подарков сейчас закрыт" };
  const gift = await db.gift.findFirst({ where: { id: giftId, eventId: guest.eventId }, select: { id: true } });
  if (!gift) return { ok: false, message: "Такого подарка в списке уже нет" };

  if (release) {
    const result = await db.giftReservation.deleteMany({ where: { eventId: guest.eventId, giftId, guestId: guest.guestId } });
    return result.count
      ? { ok: true, message: "Бронь снята, подарок снова свободен" }
      : { ok: false, message: "Этот подарок не был за вами" };
  }

  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${guest.guestId}))::text`;
      const mine = await tx.giftReservation.findMany({
        where: { eventId: guest.eventId, guestId: guest.guestId },
        select: { gift: { select: { title: true } } },
      });
      if (mine.length >= GIFTS_PER_GUEST) {
        return { ok: false, message: `Вы уже выбрали «${mine[0].gift.title}». Чтобы взять другой подарок, сначала снимите эту бронь.` };
      }
      await tx.giftReservation.create({
        data: { orgId: guest.orgId, eventId: guest.eventId, giftId, guestId: guest.guestId },
      });
      return { ok: true, message: "Готово, подарок за вами" };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { ok: false, message: "Этот подарок только что выбрал другой гость" };
    }
    throw error;
  }
}
