/**
 * Операции рассадки.
 *
 * Сохраняется НЕ весь план, а по одному действию. Причина в PLAN.md §5.4:
 * организатор открывает рассадку на ноутбуке и на планшете, и «сохранить
 * план целиком» означает, что последнее сохранение затрёт чужую работу
 * молча. Здесь каждое действие несёт версию, на которой оно было задумано,
 * и при расхождении получает отказ, а не тихо перетирает.
 *
 * Полноценный CRDT для MVP не нужен: конфликт редкий, а понятное
 * «изменено в другом окне» решает задачу.
 */
import { z } from "zod";
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import { PLAN_HEIGHT, PLAN_WIDTH, shapeSize } from "@/lib/seating-geometry";

export const seatingOpSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assign"), seatId: z.string(), guestId: z.string() }),
  z.object({ kind: z.literal("clear"), seatId: z.string() }),
  z.object({
    kind: z.literal("moveTable"),
    tableId: z.string(),
    x: z.number().min(0).max(PLAN_WIDTH),
    y: z.number().min(0).max(PLAN_HEIGHT),
  }),
  z.object({
    kind: z.literal("createTable"),
    label: z.string().min(1).max(40),
    capacity: z.number().int().min(1).max(20),
    shape: z.enum(["ROUND", "RECT", "OVAL", "HEAD"]).optional(),
    x: z.number().min(0).max(PLAN_WIDTH).optional(),
    y: z.number().min(0).max(PLAN_HEIGHT).optional(),
  }),
  z.object({ kind: z.literal("deleteTable"), tableId: z.string() }),
  z.object({ kind: z.literal("renameTable"), tableId: z.string(), label: z.string().min(1).max(40) }),
  z.object({
    kind: z.literal("setShape"),
    tableId: z.string(),
    shape: z.enum(["ROUND", "RECT", "OVAL", "HEAD"]),
  }),
  z.object({
    kind: z.literal("setCapacity"),
    tableId: z.string(),
    capacity: z.number().int().min(1).max(20),
  }),
]);

export type SeatingOp = z.infer<typeof seatingOpSchema>;

/** Русское склонение после числительного: 1 место, 2 места, 5 мест. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export type OpResult =
  | { ok: true; version: number; undo: SeatingOp | null }
  | { ok: false; reason: "conflict"; version: number }
  | { ok: false; reason: "gone" | "occupied" | "invalid"; message: string };

/**
 * Применить операцию.
 *
 * @param expectedVersion версия плана, которую видел клиент. `null` — не
 *        проверять (для действий из формы без JS, где версии просто нет).
 */
export async function applyOp(
  ctx: EventContext,
  op: SeatingOp,
  expectedVersion: number | null,
): Promise<OpResult> {
  try {
    return await db.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: ctx.eventId, orgId: ctx.orgId },
        select: { seatingVersion: true },
      });
      if (!event) return { ok: false, reason: "gone", message: "Мероприятие не найдено" };

      if (expectedVersion !== null && event.seatingVersion !== expectedVersion) {
        return { ok: false, reason: "conflict", version: event.seatingVersion };
      }

      // Обратная операция считается ДО изменения — на ней строится отмена.
      const undo = await computeUndo(tx, ctx, op);

      switch (op.kind) {
        case "assign": {
          const seat = await tx.seat.findFirst({
            where: { id: op.seatId, eventId: ctx.eventId },
            select: { id: true, guestId: true },
          });
          if (!seat) return { ok: false, reason: "gone", message: "Место не найдено" };

          const guest = await tx.guest.findFirst({
            where: { id: op.guestId, eventId: ctx.eventId, archivedAt: null },
            select: { id: true },
          });
          if (!guest) return { ok: false, reason: "gone", message: "Гость не найден" };

          // Гость сидит ровно в одном месте: старое освобождаем здесь же,
          // иначе уникальный индекс не даст сохранить перестановку.
          await tx.seat.updateMany({
            where: { eventId: ctx.eventId, guestId: op.guestId },
            data: { guestId: null },
          });
          await tx.seat.updateMany({
            where: { id: seat.id, eventId: ctx.eventId },
            data: { guestId: op.guestId },
          });
          break;
        }

        case "clear": {
          await tx.seat.updateMany({
            where: { id: op.seatId, eventId: ctx.eventId },
            data: { guestId: null },
          });
          break;
        }

        case "moveTable": {
          const moved = await tx.seatTable.updateMany({
            where: { id: op.tableId, eventId: ctx.eventId },
            data: { x: op.x, y: op.y },
          });
          if (moved.count === 0) return { ok: false, reason: "gone", message: "Стол не найден" };
          break;
        }

        case "createTable": {
          await tx.seatTable.create({
            data: {
              orgId: ctx.orgId,
              eventId: ctx.eventId,
              label: op.label,
              shape: op.shape ?? "ROUND",
              capacity: op.capacity,
              ...shapeSize(op.shape ?? "ROUND", op.capacity),
              x: op.x ?? PLAN_WIDTH / 2,
              y: op.y ?? PLAN_HEIGHT / 2,
              seats: {
                create: Array.from({ length: op.capacity }, (_, index) => ({
                  orgId: ctx.orgId,
                  index,
                })),
              },
            },
          });
          break;
        }

        case "deleteTable": {
          // Составной внешний ключ объявлен Restrict — сначала отвязываем гостей.
          await tx.seat.updateMany({
            where: { eventId: ctx.eventId, tableId: op.tableId },
            data: { guestId: null },
          });
          await tx.seatTable.deleteMany({ where: { id: op.tableId, eventId: ctx.eventId } });
          break;
        }

        case "renameTable": {
          await tx.seatTable.updateMany({
            where: { id: op.tableId, eventId: ctx.eventId },
            data: { label: op.label },
          });
          break;
        }

        /**
         * Форма стола — не украшение: круглый стол сажает гостей лицом
         * друг к другу, прямоугольный вдоль сторон, президиум только с
         * одной стороны. Поэтому смена формы меняет и габариты, иначе
         * восьмиместный «квадрат» получается размером с круглый и места
         * налезают друг на друга.
         */
        case "setShape": {
          const table = await tx.seatTable.findFirst({
            where: { id: op.tableId, eventId: ctx.eventId },
            select: { id: true, capacity: true },
          });
          if (!table) return { ok: false, reason: "gone", message: "Стол не найден" };

          await tx.seatTable.updateMany({
            where: { id: op.tableId, eventId: ctx.eventId },
            data: { shape: op.shape, ...shapeSize(op.shape, table.capacity) },
          });
          break;
        }

        case "setCapacity": {
          const table = await tx.seatTable.findFirst({
            where: { id: op.tableId, eventId: ctx.eventId },
            select: { id: true, capacity: true, shape: true, seats: { orderBy: { index: "asc" } } },
          });
          if (!table) return { ok: false, reason: "gone", message: "Стол не найден" };

          if (op.capacity > table.capacity) {
            await tx.seat.createMany({
              data: Array.from({ length: op.capacity - table.capacity }, (_, i) => ({
                orgId: ctx.orgId,
                eventId: ctx.eventId,
                tableId: table.id,
                index: table.capacity + i,
              })),
            });
          } else if (op.capacity < table.capacity) {
            const removed = table.seats.slice(op.capacity);
            // Убираем только пустые места: молча ссаживать гостя нельзя.
            const occupied = removed.filter((seat) => seat.guestId);
            if (occupied.length > 0) {
              return {
                ok: false,
                reason: "occupied",
                message: `Сначала освободите последние ${occupied.length} ${plural(
                  occupied.length, "место", "места", "мест",
                )}`,
              };
            }
            await tx.seat.deleteMany({
              where: { id: { in: removed.map((s) => s.id) }, eventId: ctx.eventId },
            });
          }

          await tx.seatTable.update({
            where: { eventId_id: { eventId: ctx.eventId, id: table.id } },
            // Габариты идут за вместимостью: иначе двадцать мест вокруг
            // стола прежнего размера встают вплотную и план не читается.
            data: { capacity: op.capacity, ...shapeSize(table.shape, op.capacity) },
          });
          break;
        }
      }

      const updated = await tx.event.update({
        where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
        data: { seatingVersion: { increment: 1 } },
        select: { seatingVersion: true },
      });

      return { ok: true, version: updated.seatingVersion, undo };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить";
    return { ok: false, reason: "invalid", message };
  }
}

/**
 * Операция, возвращающая план в прежнее состояние.
 *
 * Для создания и удаления стола отмена не строится: восстановить удалённый
 * стол вместе с рассадкой — это уже история изменений, а не отмена одного
 * действия. Организатору честно показывается, что отменить нельзя.
 */
async function computeUndo(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  ctx: EventContext,
  op: SeatingOp,
): Promise<SeatingOp | null> {
  switch (op.kind) {
    case "assign": {
      // Куда гость сидел до этого — туда и вернём.
      const previous = await tx.seat.findFirst({
        where: { eventId: ctx.eventId, guestId: op.guestId },
        select: { id: true },
      });
      if (previous) return { kind: "assign", seatId: previous.id, guestId: op.guestId };
      return { kind: "clear", seatId: op.seatId };
    }

    case "clear": {
      const seat = await tx.seat.findFirst({
        where: { id: op.seatId, eventId: ctx.eventId },
        select: { guestId: true },
      });
      if (!seat?.guestId) return null;
      return { kind: "assign", seatId: op.seatId, guestId: seat.guestId };
    }

    case "moveTable": {
      const table = await tx.seatTable.findFirst({
        where: { id: op.tableId, eventId: ctx.eventId },
        select: { x: true, y: true },
      });
      if (!table) return null;
      return { kind: "moveTable", tableId: op.tableId, x: table.x, y: table.y };
    }

    case "renameTable": {
      const table = await tx.seatTable.findFirst({
        where: { id: op.tableId, eventId: ctx.eventId },
        select: { label: true },
      });
      if (!table) return null;
      return { kind: "renameTable", tableId: op.tableId, label: table.label };
    }

    case "setShape": {
      const table = await tx.seatTable.findFirst({
        where: { id: op.tableId, eventId: ctx.eventId },
        select: { shape: true },
      });
      if (!table) return null;
      return { kind: "setShape", tableId: op.tableId, shape: table.shape };
    }

    case "setCapacity": {
      const table = await tx.seatTable.findFirst({
        where: { id: op.tableId, eventId: ctx.eventId },
        select: { capacity: true },
      });
      if (!table) return null;
      return { kind: "setCapacity", tableId: op.tableId, capacity: table.capacity };
    }

    default:
      return null;
  }
}
