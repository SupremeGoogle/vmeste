/**
 * Тесты операций рассадки. Проверяется то, что ломается в день свадьбы:
 * перестановка гостя, конфликт двух вкладок, отмена, уменьшение стола
 * с сидящими людьми и попытки дотянуться до чужого мероприятия.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { applyOp } from "@/server/services/seating-ops";
import { normalizeName } from "@/lib/name-normalize";
import type { EventContext } from "@/server/context";

type World = {
  ctx: EventContext;
  eventId: string;
  tableId: string;
  seatIds: string[];
  guestIds: string[];
  version: number;
};

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug,
      shortCode: code, eventDate: new Date("2026-09-12"),
    },
  });

  const table = await testDb.seatTable.create({
    data: {
      orgId: org.id, eventId: event.id, label: "Стол 1", x: 300, y: 300, capacity: 4,
      seats: { create: Array.from({ length: 4 }, (_, index) => ({ orgId: org.id, index })) },
    },
    include: { seats: { orderBy: { index: "asc" } } },
  });

  const guestIds: string[] = [];
  for (const name of ["Анна Петрова", "Борис Смирнов", "Вера Иванова"]) {
    const guest = await testDb.guest.create({
      data: {
        orgId: org.id, eventId: event.id, displayName: name,
        searchKey: normalizeName(name),
        linkToken: randomBytes(16).toString("base64url"),
      },
    });
    guestIds.push(guest.id);
  }

  return {
    ctx: { kind: "org", userId: "u", orgId: org.id, role: "OWNER", eventId: event.id },
    eventId: event.id,
    tableId: table.id,
    seatIds: table.seats.map((s) => s.id),
    guestIds,
    version: 0,
  };
}

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("ops-a", "OPSAAA");
  b = await makeWorld("ops-b", "OPSBBB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

async function seatGuest(world: World, seatIndex: number, guestIndex: number, version: number) {
  return applyOp(
    world.ctx,
    { kind: "assign", seatId: world.seatIds[seatIndex], guestId: world.guestIds[guestIndex] },
    version,
  );
}

describe("посадка гостя", () => {
  it("сажает и поднимает версию плана", async () => {
    const res = await seatGuest(a, 0, 0, 0);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.version).toBe(1);

    const seat = await testDb.seat.findUnique({ where: { id: a.seatIds[0] } });
    expect(seat?.guestId).toBe(a.guestIds[0]);
  });

  it("перестановка освобождает прежнее место", async () => {
    await seatGuest(a, 0, 0, 0);
    const res = await seatGuest(a, 2, 0, 1);
    expect(res.ok).toBe(true);

    const [from, to] = await Promise.all([
      testDb.seat.findUnique({ where: { id: a.seatIds[0] } }),
      testDb.seat.findUnique({ where: { id: a.seatIds[2] } }),
    ]);
    expect(from?.guestId).toBeNull();
    expect(to?.guestId).toBe(a.guestIds[0]);
  });

  it("не сажает гостя чужого мероприятия", async () => {
    const res = await applyOp(
      a.ctx,
      { kind: "assign", seatId: a.seatIds[0], guestId: b.guestIds[0] },
      0,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("gone");
  });

  it("не сажает на место чужого мероприятия", async () => {
    const res = await applyOp(
      a.ctx,
      { kind: "assign", seatId: b.seatIds[0], guestId: a.guestIds[0] },
      0,
    );
    expect(res.ok).toBe(false);

    const seat = await testDb.seat.findUnique({ where: { id: b.seatIds[0] } });
    expect(seat?.guestId).toBeNull();
  });
});

describe("конфликт двух вкладок", () => {
  it("операция на устаревшей версии отклоняется", async () => {
    await seatGuest(a, 0, 0, 0); // версия стала 1

    // Вторая вкладка всё ещё думает, что версия 0.
    const stale = await seatGuest(a, 1, 1, 0);
    expect(stale.ok).toBe(false);
    if (!stale.ok && stale.reason === "conflict") expect(stale.version).toBe(1);

    // и ничего не записала
    const seat = await testDb.seat.findUnique({ where: { id: a.seatIds[1] } });
    expect(seat?.guestId).toBeNull();
  });

  it("та же операция на актуальной версии проходит", async () => {
    await seatGuest(a, 0, 0, 0);
    const res = await seatGuest(a, 1, 1, 1);
    expect(res.ok).toBe(true);
  });

  it("без версии (форма без JS) проверка пропускается", async () => {
    await seatGuest(a, 0, 0, 0);
    const res = await applyOp(
      a.ctx,
      { kind: "assign", seatId: a.seatIds[1], guestId: a.guestIds[1] },
      null,
    );
    expect(res.ok).toBe(true);
  });
});

describe("отмена последнего действия", () => {
  it("отмена посадки освобождает место", async () => {
    const res = await seatGuest(a, 0, 0, 0);
    expect(res.ok).toBe(true);
    if (!res.ok || !res.undo) throw new Error("нет обратной операции");

    const undone = await applyOp(a.ctx, res.undo, res.version);
    expect(undone.ok).toBe(true);

    const seat = await testDb.seat.findUnique({ where: { id: a.seatIds[0] } });
    expect(seat?.guestId).toBeNull();
  });

  it("отмена перестановки возвращает гостя на прежнее место", async () => {
    await seatGuest(a, 0, 0, 0);
    const moved = await seatGuest(a, 3, 0, 1);
    if (!moved.ok || !moved.undo) throw new Error("нет обратной операции");

    await applyOp(a.ctx, moved.undo, moved.version);

    const [first, last] = await Promise.all([
      testDb.seat.findUnique({ where: { id: a.seatIds[0] } }),
      testDb.seat.findUnique({ where: { id: a.seatIds[3] } }),
    ]);
    expect(first?.guestId).toBe(a.guestIds[0]);
    expect(last?.guestId).toBeNull();
  });

  it("отмена снятия сажает гостя обратно", async () => {
    await seatGuest(a, 0, 0, 0);
    const cleared = await applyOp(a.ctx, { kind: "clear", seatId: a.seatIds[0] }, 1);
    if (!cleared.ok || !cleared.undo) throw new Error("нет обратной операции");

    await applyOp(a.ctx, cleared.undo, cleared.version);
    const seat = await testDb.seat.findUnique({ where: { id: a.seatIds[0] } });
    expect(seat?.guestId).toBe(a.guestIds[0]);
  });

  it("отмена переноса стола возвращает координаты", async () => {
    const moved = await applyOp(
      a.ctx, { kind: "moveTable", tableId: a.tableId, x: 700, y: 500 }, 0,
    );
    if (!moved.ok || !moved.undo) throw new Error("нет обратной операции");

    await applyOp(a.ctx, moved.undo, moved.version);
    const table = await testDb.seatTable.findUnique({ where: { id: a.tableId } });
    expect(table?.x).toBe(300);
    expect(table?.y).toBe(300);
  });

  it("удаление стола отменить нельзя и это честно сказано", async () => {
    const res = await applyOp(a.ctx, { kind: "deleteTable", tableId: a.tableId }, 0);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.undo).toBeNull();
  });
});

describe("вместимость стола", () => {
  it("увеличение добавляет пустые места", async () => {
    const res = await applyOp(a.ctx, { kind: "setCapacity", tableId: a.tableId, capacity: 6 }, 0);
    expect(res.ok).toBe(true);

    const seats = await testDb.seat.findMany({ where: { tableId: a.tableId } });
    expect(seats).toHaveLength(6);
  });

  it("уменьшение убирает только пустые места", async () => {
    const res = await applyOp(a.ctx, { kind: "setCapacity", tableId: a.tableId, capacity: 2 }, 0);
    expect(res.ok).toBe(true);

    const seats = await testDb.seat.findMany({ where: { tableId: a.tableId } });
    expect(seats).toHaveLength(2);
  });

  it("не ссаживает гостя молча", async () => {
    await seatGuest(a, 3, 0, 0); // последнее место занято

    const res = await applyOp(a.ctx, { kind: "setCapacity", tableId: a.tableId, capacity: 2 }, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("occupied");

    const seats = await testDb.seat.findMany({ where: { tableId: a.tableId } });
    expect(seats).toHaveLength(4);
  });
});

describe("столы", () => {
  it("создание стола создаёт места", async () => {
    const res = await applyOp(
      a.ctx, { kind: "createTable", label: "Стол 2", capacity: 8 }, 0,
    );
    expect(res.ok).toBe(true);

    const table = await testDb.seatTable.findFirst({
      where: { eventId: a.eventId, label: "Стол 2" },
      include: { seats: true },
    });
    expect(table?.seats).toHaveLength(8);
  });

  it("удаление стола освобождает гостей, а не падает на внешнем ключе", async () => {
    await seatGuest(a, 0, 0, 0);
    const res = await applyOp(a.ctx, { kind: "deleteTable", tableId: a.tableId }, 1);
    expect(res.ok).toBe(true);

    const guest = await testDb.guest.findUnique({ where: { id: a.guestIds[0] } });
    expect(guest).not.toBeNull(); // гость жив, просто не рассажен
    expect(await testDb.seat.count({ where: { eventId: a.eventId } })).toBe(0);
  });

  it("нельзя двигать стол чужого мероприятия", async () => {
    const res = await applyOp(
      a.ctx, { kind: "moveTable", tableId: b.tableId, x: 100, y: 100 }, 0,
    );
    expect(res.ok).toBe(false);

    const table = await testDb.seatTable.findUnique({ where: { id: b.tableId } });
    expect(table?.x).toBe(300);
  });

  it("нельзя удалить стол чужого мероприятия", async () => {
    await applyOp(a.ctx, { kind: "deleteTable", tableId: b.tableId }, 0);
    expect(await testDb.seatTable.findUnique({ where: { id: b.tableId } })).not.toBeNull();
  });
});
