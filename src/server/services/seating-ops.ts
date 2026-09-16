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
import {
  COUPLE_MAX_SEATS, COUPLE_MIN_SEATS, COUPLE_TABLE_LABEL, HALL_MAX, HALL_MIN,
  clampToPlan, freeSpot, hallFits, tableBounds, tableSize, type Hall,
} from "@/lib/seating-geometry";
import { newGuestData } from "@/server/repositories/guests";

const coord = (max: number) => z.number().min(0).max(max);

export const seatingOpSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assign"), seatId: z.string(), guestId: z.string() }),
  z.object({ kind: z.literal("clear"), seatId: z.string() }),
  z.object({
    kind: z.literal("moveTable"),
    tableId: z.string(),
    // Точная граница — размер зала этого мероприятия, она проверяется в
    // транзакции. Здесь только отсекаем заведомую чушь.
    x: coord(HALL_MAX.width),
    y: coord(HALL_MAX.height),
  }),
  z.object({
    kind: z.literal("createTable"),
    label: z.string().trim().min(1).max(40),
    capacity: z.number().int().min(1).max(20),
    shape: z.enum(["ROUND", "RECT", "OVAL", "HEAD"]).optional(),
    x: coord(HALL_MAX.width).optional(),
    y: coord(HALL_MAX.height).optional(),
  }),
  z.object({ kind: z.literal("deleteTable"), tableId: z.string() }),
  z.object({
    kind: z.literal("renameTable"),
    tableId: z.string(),
    label: z.string().trim().min(1).max(40),
  }),
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
  /**
   * Размер зала. `shiftX/shiftY` — на сколько сдвинуть все столы: зал
   * растянули за левый или верхний край, и столы должны остаться у своих
   * стен, а не уехать вместе с началом координат.
   */
  z.object({
    kind: z.literal("resizeHall"),
    width: z.number().min(HALL_MIN.width).max(HALL_MAX.width),
    height: z.number().min(HALL_MIN.height).max(HALL_MAX.height),
    shiftX: z.number().min(-HALL_MAX.width).max(HALL_MAX.width).default(0),
    shiftY: z.number().min(-HALL_MAX.height).max(HALL_MAX.height).default(0),
  }),
  /** Гость, вписанный прямо в рассадке, — настоящий гость в общем списке. */
  z.object({
    kind: z.literal("createGuest"),
    displayName: z.string().trim().min(1).max(120),
    seatId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("createCoupleTable"),
    capacity: z.number().int().min(COUPLE_MIN_SEATS).max(COUPLE_MAX_SEATS),
    x: coord(HALL_MAX.width).optional(),
    y: coord(HALL_MAX.height).optional(),
  }),
]);

export type SeatingOp = z.input<typeof seatingOpSchema>;
type ParsedOp = z.output<typeof seatingOpSchema>;

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

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Отказ изнутри транзакции: откатывает всё сделанное и возвращается как результат. */
class OpFailure extends Error {
  constructor(readonly result: Extract<OpResult, { ok: false }>) {
    super("op failure");
  }
}

const fail = (reason: "gone" | "occupied" | "invalid", message: string): never => {
  throw new OpFailure({ ok: false, reason, message });
};

/** Округление до десятых: координаты едут в SVG и PDF, длинные дроби там ни к чему. */
const round = (value: number) => Math.round(value * 10) / 10;

async function eventTables(tx: Tx, ctx: EventContext) {
  return tx.seatTable.findMany({
    where: { eventId: ctx.eventId },
    select: {
      id: true, shape: true, x: true, y: true, width: true, height: true,
      capacity: true, isCouple: true,
    },
  });
}

/** Стоит ли стол целиком внутри зала — с местами и подписями. */
function insideHall(table: Parameters<typeof tableBounds>[0], hall: Hall): boolean {
  const { halfWidth, halfHeight } = tableBounds(table);
  return (
    table.x - halfWidth >= -0.5 && table.y - halfHeight >= -0.5 &&
    table.x + halfWidth <= hall.width + 0.5 && table.y + halfHeight <= hall.height + 0.5
  );
}

/** Посадить гостя: прежнее место освобождается в той же транзакции,
 *  иначе уникальный индекс по guestId не даст сохранить перестановку. */
async function seatGuest(tx: Tx, ctx: EventContext, seatId: string, guestId: string) {
  await tx.seat.updateMany({
    where: { eventId: ctx.eventId, guestId },
    data: { guestId: null },
  });
  await tx.seat.updateMany({
    where: { id: seatId, eventId: ctx.eventId },
    data: { guestId },
  });
}

/**
 * Применить операцию.
 *
 * @param expectedVersion версия плана, которую видел клиент. `null` — не
 *        проверять (для действий из формы без JS, где версии просто нет).
 */
export async function applyOp(
  ctx: EventContext,
  rawOp: SeatingOp,
  expectedVersion: number | null,
): Promise<OpResult> {
  const parsed = seatingOpSchema.safeParse(rawOp);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "Непонятная операция" };
  const op = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: ctx.eventId, orgId: ctx.orgId },
        select: { seatingVersion: true, hallWidth: true, hallHeight: true },
      });
      if (!event) return fail("gone", "Мероприятие не найдено");

      if (expectedVersion !== null && event.seatingVersion !== expectedVersion) {
        return { ok: false, reason: "conflict", version: event.seatingVersion } as const;
      }

      const hall: Hall = { width: event.hallWidth, height: event.hallHeight };

      // Обратная операция считается ДО изменения — на ней строится отмена.
      const undo = await computeUndo(tx, ctx, op, hall);

      await runOp(tx, ctx, op, hall);

      const updated = await tx.event.update({
        where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
        data: { seatingVersion: { increment: 1 } },
        select: { seatingVersion: true },
      });

      return { ok: true, version: updated.seatingVersion, undo } as const;
    });
  } catch (error) {
    if (error instanceof OpFailure) return error.result;
    return { ok: false, reason: "invalid", message: humanError(error) };
  }
}

/** Сообщение для организатора вместо текста ошибки базы. */
function humanError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  const target = JSON.stringify((error as { meta?: unknown } | null)?.meta ?? "");
  if (code === "P2002") {
    if (target.includes("label")) return "Стол с таким названием уже есть";
    if (target.includes("couple") || target.includes("eventId")) return "Стол молодожёнов уже есть";
    return "Такая запись уже есть";
  }
  return "Не удалось сохранить";
}

async function runOp(tx: Tx, ctx: EventContext, op: ParsedOp, hall: Hall): Promise<void> {
  switch (op.kind) {
    case "assign": {
      const seat = await tx.seat.findFirst({
        where: { id: op.seatId, eventId: ctx.eventId },
        select: { id: true },
      });
      if (!seat) return fail("gone", "Место не найдено");

      const guest = await tx.guest.findFirst({
        where: { id: op.guestId, eventId: ctx.eventId, archivedAt: null },
        select: { id: true },
      });
      if (!guest) return fail("gone", "Гость не найден");

      await seatGuest(tx, ctx, seat.id, guest.id);
      return;
    }

    case "clear": {
      await tx.seat.updateMany({
        where: { id: op.seatId, eventId: ctx.eventId },
        data: { guestId: null },
      });
      return;
    }

    case "moveTable": {
      const table = await tx.seatTable.findFirst({
        where: { id: op.tableId, eventId: ctx.eventId },
        select: { shape: true, width: true, height: true, capacity: true, isCouple: true },
      });
      if (!table) return fail("gone", "Стол не найден");
      if (!insideHall({ ...table, x: op.x, y: op.y }, hall)) {
        return fail("invalid", "Стол не помещается в зал в этом месте");
      }

      await tx.seatTable.updateMany({
        where: { id: op.tableId, eventId: ctx.eventId },
        data: { x: round(op.x), y: round(op.y) },
      });
      return;
    }

    case "createTable": {
      const shape = op.shape ?? "ROUND";
      const size = tableSize({ shape, capacity: op.capacity });
      const geometry = { shape, capacity: op.capacity, ...size };
      // Точку указали (стол бросили на план) — ставим туда. Нет — ищем
      // свободное место от центра зала, чтобы не накрыть соседний стол.
      const at =
        op.x !== undefined && op.y !== undefined
          ? clampToPlan({ ...geometry, x: 0, y: 0 }, { x: op.x, y: op.y }, hall)
          : freeSpot(geometry, await eventTables(tx, ctx), hall, { x: hall.width / 2, y: hall.height / 2 });

      await tx.seatTable.create({
        data: {
          orgId: ctx.orgId,
          eventId: ctx.eventId,
          label: op.label,
          shape,
          capacity: op.capacity,
          ...size,
          x: round(at.x),
          y: round(at.y),
          seats: {
            create: Array.from({ length: op.capacity }, (_, index) => ({
              orgId: ctx.orgId,
              index,
            })),
          },
        },
      });
      return;
    }

    case "deleteTable": {
      // Составной внешний ключ объявлен Restrict — сначала отвязываем гостей.
      await tx.seat.updateMany({
        where: { eventId: ctx.eventId, tableId: op.tableId },
        data: { guestId: null },
      });
      await tx.seatTable.deleteMany({ where: { id: op.tableId, eventId: ctx.eventId } });
      return;
    }

    case "renameTable": {
      const renamed = await tx.seatTable.updateMany({
        where: { id: op.tableId, eventId: ctx.eventId },
        data: { label: op.label },
      });
      if (renamed.count === 0) return fail("gone", "Стол не найден");
      return;
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
        select: { id: true, capacity: true, isCouple: true },
      });
      if (!table) return fail("gone", "Стол не найден");
      if (table.isCouple) return fail("invalid", "У стола молодожёнов своя форма");

      await tx.seatTable.updateMany({
        where: { id: op.tableId, eventId: ctx.eventId },
        data: { shape: op.shape, ...tableSize({ shape: op.shape, capacity: table.capacity }) },
      });
      return;
    }

    case "setCapacity": {
      const table = await tx.seatTable.findFirst({
        where: { id: op.tableId, eventId: ctx.eventId },
        select: {
          id: true, capacity: true, shape: true, isCouple: true,
          seats: { orderBy: { index: "asc" } },
        },
      });
      if (!table) return fail("gone", "Стол не найден");

      if (table.isCouple && (op.capacity < COUPLE_MIN_SEATS || op.capacity > COUPLE_MAX_SEATS)) {
        return fail(
          "invalid",
          `За столом молодожёнов от ${COUPLE_MIN_SEATS} до ${COUPLE_MAX_SEATS} мест`,
        );
      }

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
          return fail(
            "occupied",
            `Сначала освободите последние ${occupied.length} ${plural(
              occupied.length, "место", "места", "мест",
            )}`,
          );
        }
        await tx.seat.deleteMany({
          where: { id: { in: removed.map((s) => s.id) }, eventId: ctx.eventId },
        });
      }

      await tx.seatTable.update({
        where: { eventId_id: { eventId: ctx.eventId, id: table.id } },
        // Габариты идут за вместимостью: иначе двадцать мест вокруг
        // стола прежнего размера встают вплотную и план не читается.
        data: { capacity: op.capacity, ...tableSize({ ...table, capacity: op.capacity }) },
      });
      return;
    }

    case "resizeHall": {
      const next: Hall = { width: round(op.width), height: round(op.height) };
      const shift = { x: round(op.shiftX), y: round(op.shiftY) };
      const tables = await eventTables(tx, ctx);

      // Ужать зал так, чтобы столы оказались за стеной, нельзя: на плане
      // для гостя и в распечатке их просто не будет видно.
      if (!hallFits(tables, next, shift)) {
        return fail("invalid", "Столы не помещаются в зал такого размера — сначала передвиньте их");
      }

      if (shift.x !== 0 || shift.y !== 0) {
        await tx.seatTable.updateMany({
          where: { eventId: ctx.eventId },
          data: { x: { increment: shift.x }, y: { increment: shift.y } },
        });
      }
      await tx.event.update({
        where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } },
        data: { hallWidth: next.width, hallHeight: next.height },
      });
      return;
    }

    case "createGuest": {
      let seatId: string | null = null;
      if (op.seatId) {
        const seat = await tx.seat.findFirst({
          where: { id: op.seatId, eventId: ctx.eventId },
          select: { id: true, guestId: true },
        });
        if (!seat) return fail("gone", "Место не найдено");
        if (seat.guestId) return fail("occupied", "Место уже занято");
        seatId = seat.id;
      }

      const guest = await tx.guest.create({
        data: newGuestData(ctx, { displayName: op.displayName }),
        select: { id: true },
      });
      if (seatId) await seatGuest(tx, ctx, seatId, guest.id);
      return;
    }

    case "createCoupleTable": {
      const existing = await tx.seatTable.findFirst({
        where: { eventId: ctx.eventId, isCouple: true },
        select: { id: true },
      });
      if (existing) return fail("invalid", "Стол молодожёнов уже есть");

      const size = tableSize({ shape: "HEAD", capacity: op.capacity, isCouple: true });
      const geometry = { shape: "HEAD", capacity: op.capacity, isCouple: true, ...size };
      // По умолчанию — у верхней стены по центру, в ближайшем свободном
      // месте: так стол молодожёнов стоит почти в любом зале.
      const at =
        op.x !== undefined && op.y !== undefined
          ? clampToPlan({ ...geometry, x: 0, y: 0 }, { x: op.x, y: op.y }, hall)
          : freeSpot(geometry, await eventTables(tx, ctx), hall, { x: hall.width / 2, y: 0 });

      const table = await tx.seatTable.create({
        data: {
          orgId: ctx.orgId,
          eventId: ctx.eventId,
          label: COUPLE_TABLE_LABEL,
          shape: "HEAD",
          isCouple: true,
          capacity: op.capacity,
          ...size,
          x: round(at.x),
          y: round(at.y),
          seats: {
            create: Array.from({ length: op.capacity }, (_, index) => ({
              orgId: ctx.orgId,
              index,
            })),
          },
        },
        select: { seats: { orderBy: { index: "asc" }, select: { id: true } } },
      });

      // Молодые садятся сразу: места 0 и 1 — центр стола (см. `coupleSlot`).
      // Сначала невеста, потом жених; ролей бывает по две одинаковых —
      // тогда просто в порядке добавления. Если они уже сидели за другим
      // столом, пересаживаются: место молодых — здесь.
      const couple = await tx.guest.findMany({
        where: { eventId: ctx.eventId, archivedAt: null, role: { in: ["BRIDE", "GROOM"] } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        take: 2,
        select: { id: true },
      });
      for (const [index, guest] of couple.entries()) {
        await seatGuest(tx, ctx, table.seats[index].id, guest.id);
      }
      return;
    }
  }
}

/**
 * Операция, возвращающая план в прежнее состояние.
 *
 * Для создания и удаления стола отмена не строится: восстановить удалённый
 * стол вместе с рассадкой — это уже история изменений, а не отмена одного
 * действия. Гость, вписанный в рассадке, отменой тоже не удаляется:
 * убрать человека из списка гостей случайным «Отменить» слишком легко.
 */
async function computeUndo(
  tx: Tx,
  ctx: EventContext,
  op: ParsedOp,
  hall: Hall,
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

    case "resizeHall":
      return {
        kind: "resizeHall",
        width: hall.width,
        height: hall.height,
        shiftX: -op.shiftX,
        shiftY: -op.shiftY,
      };

    default:
      return null;
  }
}
