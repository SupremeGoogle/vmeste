/**
 * Рассадка. На этапе 1 без перетаскивания — назначение гостя на место
 * формой. Задача этапа: наполнить данные, чтобы работал вход в зал.
 * Конструктор с drag-n-drop — этап 3, модель данных для него уже готова.
 *
 * Операции атомарные и по одной (assign / unassign / move), а не «сохранить
 * весь план»: иначе две открытые вкладки затирают работу друг друга
 * (PLAN.md §5.4).
 */
import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { seatingTag } from "@/lib/cache-tags";
import type { EventContext } from "@/server/context";

export async function listTables(ctx: EventContext) {
  return db.seatTable.findMany({
    where: { eventId: ctx.eventId },
    orderBy: { label: "asc" },
    include: {
      seats: {
        orderBy: { index: "asc" },
        include: { guest: { select: { id: true, displayName: true } } },
      },
    },
  });
}

/** Гости, которым место ещё не назначено. */
/**
 * Нерассаженные гости.
 *
 * Отказавшиеся не исчезают из списка, но уходят в конец и помечаются:
 * посадить человека, который написал «не приду», — ошибка, которую
 * инструмент должен делать заметной, а не невозможной. Иногда гость
 * передумывает по телефону, и координатору проще посадить его сразу,
 * чем сначала править ответ.
 */
export async function listUnseatedGuests(ctx: EventContext) {
  const guests = await db.guest.findMany({
    where: { eventId: ctx.eventId, archivedAt: null, seat: null },
    orderBy: { searchKey: "asc" },
    select: { id: true, displayName: true, rsvpStatus: true },
  });

  const weight = (status: string) => (status === "ACCEPTED" ? 0 : status === "PENDING" ? 1 : 2);
  return guests
    .sort((a, b) => weight(a.rsvpStatus) - weight(b.rsvpStatus))
    .map((guest) => ({
      id: guest.id,
      displayName:
        guest.rsvpStatus === "DECLINED"
          ? `${guest.displayName} (не придёт)`
          : guest.rsvpStatus === "PENDING"
            ? `${guest.displayName} (не ответил)`
            : guest.displayName,
      rsvpStatus: guest.rsvpStatus,
    }));
}

export async function createTable(
  ctx: EventContext,
  input: { label: string; capacity: number; x?: number; y?: number },
) {
  return db.$transaction(async (tx) => {
    const table = await tx.seatTable.create({
      data: {
        orgId: ctx.orgId,
        eventId: ctx.eventId,
        label: input.label,
        capacity: input.capacity,
        // Координаты в условных единицах плана 1000×700 (PLAN.md §4.7).
        x: input.x ?? 500,
        y: input.y ?? 350,
        seats: {
          create: Array.from({ length: input.capacity }, (_, index) => ({
            orgId: ctx.orgId,
            index,
          })),
        },
      },
    });

    await tx.event.update({
      where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
      data: { seatingVersion: { increment: 1 } },
    });

    return table;
  });
}

export async function deleteTable(ctx: EventContext, tableId: string) {
  return db.$transaction(async (tx) => {
    // Места ссылаются на гостей как Restrict — сначала отвязываем.
    await tx.seat.updateMany({
      where: { eventId: ctx.eventId, tableId },
      data: { guestId: null },
    });
    await tx.seatTable.delete({ where: { eventId_id: { eventId: ctx.eventId, id: tableId } } });
    await tx.event.update({
      where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
      data: { seatingVersion: { increment: 1 } },
    });
  });
}

/**
 * Посадить гостя. Гость сидит ровно в одном месте, поэтому старое место
 * освобождается в той же транзакции — иначе уникальный индекс по guestId
 * не даст сохранить перестановку.
 */
export async function assignSeat(ctx: EventContext, seatId: string, guestId: string) {
  return db.$transaction(async (tx) => {
    await tx.seat.updateMany({
      where: { eventId: ctx.eventId, guestId },
      data: { guestId: null },
    });

    const seat = await tx.seat.updateMany({
      where: { id: seatId, eventId: ctx.eventId },
      data: { guestId },
    });
    if (seat.count === 0) throw new Error("Место не найдено в этом мероприятии");

    await tx.event.update({
      where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
      data: { seatingVersion: { increment: 1 } },
    });
  });
}

export async function clearSeat(ctx: EventContext, seatId: string) {
  return db.$transaction(async (tx) => {
    await tx.seat.updateMany({
      where: { id: seatId, eventId: ctx.eventId },
      data: { guestId: null },
    });
    await tx.event.update({
      where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
      data: { seatingVersion: { increment: 1 } },
    });
  });
}

/** Данные для плана зала и для PDF: столы, места, имена. */
export async function getSeatingPlan(ctx: EventContext) {
  const [event, tables] = await Promise.all([
    db.event.findFirst({
      where: { id: ctx.eventId, orgId: ctx.orgId },
      select: { title: true, eventDate: true, venueName: true, seatingVersion: true },
    }),
    listTables(ctx),
  ]);

  return { event, tables };
}


export type PublicPlanTable = {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  taken: number;
};

/**
 * План зала для гостевой страницы.
 *
 * Кешируется по тегу `seating:{eventId}` (PLAN.md §2.1): в день свадьбы
 * рассадка почти не меняется, а на план заходят десятки человек сразу,
 * стоя в дверях. Сбрасывает тег любая операция рассадки — иначе гость
 * увидит стол, с которого его пересадили пять минут назад.
 *
 * Имён гостей здесь нет вовсе: гостю нужно «где стол», а не «кто где
 * сидит», а список имён на публичной странице — это выгрузка списка
 * гостей для любого, кто знает код.
 */
export function getPublicPlan(eventId: string): Promise<PublicPlanTable[]> {
  return unstable_cache(
    async () => {
      const tables = await db.seatTable.findMany({
        where: { eventId },
        orderBy: { label: "asc" },
        select: {
          id: true, label: true, shape: true, x: true, y: true,
          width: true, height: true, capacity: true,
          _count: { select: { seats: { where: { guestId: { not: null } } } } },
        },
      });

      return tables.map((table) => ({
        id: table.id,
        label: table.label,
        shape: table.shape,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        capacity: table.capacity,
        taken: table._count.seats,
      }));
    },
    ["public-plan", eventId],
    { tags: [seatingTag(eventId)], revalidate: 60 },
  )();
}
