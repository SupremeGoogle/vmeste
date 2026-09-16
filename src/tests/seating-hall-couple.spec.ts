/**
 * Размер зала, гости, вписанные прямо в рассадке, и стол молодожёнов.
 *
 * Проверяется то, из-за чего план на экране разойдётся с распечаткой и
 * планом для гостя: столы за стеной после ужатия зала, гость, которого
 * вписали у места, но не завели в списке, и два стола молодожёнов.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { applyOp } from "@/server/services/seating-ops";
import { getEditorPlan } from "@/server/repositories/seating";
import { normalizeName } from "@/lib/name-normalize";
import {
  COUPLE_TABLE_LABEL, coupleSlot, freeSpot, hallFits, seatPosition, tableSize,
} from "@/lib/seating-geometry";
import type { EventContext } from "@/server/context";

type World = { ctx: EventContext; eventId: string; tableId: string; seatIds: string[] };

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: code,
      eventDate: new Date("2026-09-12"),
    },
  });
  const size = tableSize({ shape: "ROUND", capacity: 4 });
  const table = await testDb.seatTable.create({
    data: {
      orgId: org.id, eventId: event.id, label: "Стол 1", x: 300, y: 300, capacity: 4, ...size,
      seats: { create: Array.from({ length: 4 }, (_, index) => ({ orgId: org.id, index })) },
    },
    include: { seats: { orderBy: { index: "asc" } } },
  });
  return {
    ctx: { kind: "org", userId: "u", orgId: org.id, role: "OWNER", eventId: event.id },
    eventId: event.id,
    tableId: table.id,
    seatIds: table.seats.map((seat) => seat.id),
  };
}

async function addGuest(world: World, name: string, role: "GUEST" | "BRIDE" | "GROOM" = "GUEST") {
  return testDb.guest.create({
    data: {
      orgId: world.ctx.orgId, eventId: world.eventId, displayName: name, role,
      searchKey: normalizeName(name), linkToken: randomBytes(16).toString("base64url"),
    },
  });
}

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("hall-a", "HALLAA");
  b = await makeWorld("hall-b", "HALLBB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("размер зала", () => {
  it("растягивается и сохраняется в мероприятии", async () => {
    const res = await applyOp(a.ctx, { kind: "resizeHall", width: 1600, height: 900 }, 0);
    expect(res.ok).toBe(true);

    const event = await testDb.event.findUniqueOrThrow({ where: { id: a.eventId } });
    expect([event.hallWidth, event.hallHeight]).toEqual([1600, 900]);
  });

  it("не ужимается так, чтобы стол оказался за стеной", async () => {
    // Стол стоит в x=300: сдвиг всех столов на 250 влево выталкивает его
    // за левую стену.
    const res = await applyOp(
      a.ctx, { kind: "resizeHall", width: 600, height: 700, shiftX: -250 }, 0,
    );
    expect(res).toMatchObject({ ok: false, reason: "invalid" });

    const event = await testDb.event.findUniqueOrThrow({ where: { id: a.eventId } });
    expect(event.hallWidth).toBe(1000);
  });

  it("растягивание за левый край сдвигает столы вместе со стеной, отмена возвращает", async () => {
    const res = await applyOp(
      a.ctx, { kind: "resizeHall", width: 1200, height: 700, shiftX: 200 }, 0,
    );
    expect(res.ok).toBe(true);
    let table = await testDb.seatTable.findUniqueOrThrow({ where: { id: a.tableId } });
    expect(table.x).toBe(500);

    if (!res.ok || !res.undo) throw new Error("нет отмены");
    expect((await applyOp(a.ctx, res.undo, res.version)).ok).toBe(true);
    table = await testDb.seatTable.findUniqueOrThrow({ where: { id: a.tableId } });
    const event = await testDb.event.findUniqueOrThrow({ where: { id: a.eventId } });
    expect([table.x, event.hallWidth]).toEqual([300, 1000]);
  });

  it("сдвиг столов не задевает чужое мероприятие", async () => {
    await applyOp(a.ctx, { kind: "resizeHall", width: 1200, height: 700, shiftX: 200 }, 0);
    const foreign = await testDb.seatTable.findUniqueOrThrow({ where: { id: b.tableId } });
    expect(foreign.x).toBe(300);
  });

  it("стол нельзя поставить за пределы зала этого мероприятия", async () => {
    // В зале по умолчанию (1000) x=1400 — за стеной, хотя схема операции
    // такие числа в принципе допускает.
    const res = await applyOp(a.ctx, { kind: "moveTable", tableId: a.tableId, x: 1400, y: 300 }, 0);
    expect(res).toMatchObject({ ok: false, reason: "invalid" });

    await applyOp(a.ctx, { kind: "resizeHall", width: 1600, height: 700 }, 0);
    const moved = await applyOp(a.ctx, { kind: "moveTable", tableId: a.tableId, x: 1400, y: 300 }, 1);
    expect(moved.ok).toBe(true);
  });

  it("проверка вместимости зала одна и та же для клиента и сервера", () => {
    const table = {
      shape: "ROUND", capacity: 4, x: 300, y: 300, ...tableSize({ shape: "ROUND", capacity: 4 }),
    };
    expect(hallFits([table], { width: 1000, height: 700 })).toBe(true);
    expect(hallFits([table], { width: 600, height: 700 }, { x: -250, y: 0 })).toBe(false);
    expect(hallFits([], { width: 400, height: 300 })).toBe(false); // меньше минимума
  });
});

describe("гость, вписанный в рассадке", () => {
  it("становится настоящим гостем с ключом поиска и уменьшительными именами", async () => {
    const res = await applyOp(a.ctx, { kind: "createGuest", displayName: "  Анастасия Петрова " }, 0);
    expect(res.ok).toBe(true);

    const guest = await testDb.guest.findFirstOrThrow({
      where: { eventId: a.eventId, displayName: "Анастасия Петрова" },
      include: { aliases: true },
    });
    expect(guest.searchKey).toBe(normalizeName("Анастасия Петрова"));
    expect(guest.linkToken.length).toBeGreaterThan(10);
    expect(guest.aliases.length).toBeGreaterThan(0);
  });

  it("сразу садится на выбранное место", async () => {
    await applyOp(a.ctx, { kind: "createGuest", displayName: "Борис Смирнов", seatId: a.seatIds[2] }, 0);
    const seat = await testDb.seat.findUniqueOrThrow({
      where: { id: a.seatIds[2] }, include: { guest: true },
    });
    expect(seat.guest?.displayName).toBe("Борис Смирнов");
  });

  it("на занятое место не садится и в список не попадает", async () => {
    const taken = await addGuest(a, "Вера Иванова");
    await testDb.seat.update({ where: { id: a.seatIds[0] }, data: { guestId: taken.id } });

    const res = await applyOp(a.ctx, { kind: "createGuest", displayName: "Гоша", seatId: a.seatIds[0] }, 0);
    expect(res).toMatchObject({ ok: false, reason: "occupied" });
    expect(await testDb.guest.count({ where: { eventId: a.eventId, displayName: "Гоша" } })).toBe(0);
  });

  it("не садится на место чужого мероприятия", async () => {
    const res = await applyOp(a.ctx, { kind: "createGuest", displayName: "Гоша", seatId: b.seatIds[0] }, 0);
    expect(res).toMatchObject({ ok: false, reason: "gone" });
    expect(await testDb.guest.count({ where: { eventId: a.eventId, displayName: "Гоша" } })).toBe(0);
  });

  it("пустое имя не принимается", async () => {
    const res = await applyOp(a.ctx, { kind: "createGuest", displayName: "   " }, 0);
    expect(res).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("стол молодожёнов", () => {
  it("создаётся с невестой и женихом в центре", async () => {
    const groom = await addGuest(a, "Михаил Ветров", "GROOM");
    const bride = await addGuest(a, "Анна Ветрова", "BRIDE");

    const res = await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 4 }, 0);
    expect(res.ok).toBe(true);

    const table = await testDb.seatTable.findFirstOrThrow({
      where: { eventId: a.eventId, isCouple: true },
      include: { seats: { orderBy: { index: "asc" } } },
    });
    expect(table.label).toBe(COUPLE_TABLE_LABEL);
    expect(table.seats.map((seat) => seat.guestId)).toEqual([bride.id, groom.id, null, null]);

    // Места 0 и 1 — середина ряда, невеста левее жениха.
    expect([coupleSlot(0, 4), coupleSlot(1, 4)]).toEqual([1, 2]);
    expect(seatPosition(table, 0).x).toBeLessThan(seatPosition(table, 1).x);
  });

  it("пересаживает молодых, если они уже сидели за другим столом", async () => {
    const bride = await addGuest(a, "Анна Ветрова", "BRIDE");
    await testDb.seat.update({ where: { id: a.seatIds[1] }, data: { guestId: bride.id } });

    await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 2 }, 0);
    const old = await testDb.seat.findUniqueOrThrow({ where: { id: a.seatIds[1] } });
    expect(old.guestId).toBeNull();
  });

  it("молодых можно снять с места, и сами они обратно не садятся", async () => {
    await addGuest(a, "Анна Ветрова", "BRIDE");
    await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 3 }, 0);
    const table = await testDb.seatTable.findFirstOrThrow({
      where: { eventId: a.eventId, isCouple: true },
      include: { seats: { orderBy: { index: "asc" } } },
    });

    expect((await applyOp(a.ctx, { kind: "clear", seatId: table.seats[0].id }, 1)).ok).toBe(true);
    // Следующая операция со столом не возвращает невесту на место.
    expect((await applyOp(a.ctx, { kind: "setCapacity", tableId: table.id, capacity: 4 }, 2)).ok).toBe(true);
    const seats = await testDb.seat.findMany({ where: { tableId: table.id } });
    expect(seats).toHaveLength(4);
    expect(seats.every((seat) => seat.guestId === null)).toBe(true);
  });

  it("второй стол молодожёнов не создаётся", async () => {
    expect((await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 2 }, 0)).ok).toBe(true);
    const res = await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 2 }, 1);
    expect(res).toMatchObject({ ok: false, reason: "invalid" });
    expect(await testDb.seatTable.count({ where: { eventId: a.eventId, isCouple: true } })).toBe(1);
  });

  it("база сама не даёт завести второй, даже мимо проверки в коде", async () => {
    await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 2 }, 0);
    await expect(
      testDb.seatTable.create({
        data: {
          orgId: a.ctx.orgId, eventId: a.eventId, label: "Ещё один", x: 500, y: 500, isCouple: true,
        },
      }),
    ).rejects.toThrow();
  });

  it("меньше двух мест и смену формы не принимает", async () => {
    expect(await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 1 }, 0)).toMatchObject({
      ok: false, reason: "invalid",
    });
    await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 2 }, 0);
    const table = await testDb.seatTable.findFirstOrThrow({
      where: { eventId: a.eventId, isCouple: true },
    });

    expect(await applyOp(a.ctx, { kind: "setCapacity", tableId: table.id, capacity: 1 }, 1))
      .toMatchObject({ ok: false, reason: "invalid" });
    expect(await applyOp(a.ctx, { kind: "setShape", tableId: table.id, shape: "ROUND" }, 1))
      .toMatchObject({ ok: false, reason: "invalid" });
  });

  it("встаёт в свободное место, а не поверх стола у верхней стены", async () => {
    // Президиум ровно там, куда по умолчанию просится стол молодожёнов.
    const head = tableSize({ shape: "HEAD", capacity: 4 });
    await testDb.seatTable.create({
      data: {
        orgId: a.ctx.orgId, eventId: a.eventId, label: "Президиум", shape: "HEAD",
        x: 500, y: 90, capacity: 4, ...head,
      },
    });
    await applyOp(a.ctx, { kind: "createCoupleTable", capacity: 4 }, 0);

    const tables = await testDb.seatTable.findMany({ where: { eventId: a.eventId } });
    const couple = tables.find((t) => t.isCouple)!;
    const others = tables.filter((t) => !t.isCouple);
    expect(freeSpot(couple, others, { width: 1000, height: 700 }, couple)).toEqual({
      x: couple.x, y: couple.y,
    });
  });

  it("пара остаётся в центре ряда при любом числе мест", () => {
    for (const count of [2, 3, 4, 5, 8, 12]) {
      const slots = Array.from({ length: count }, (_, index) => coupleSlot(index, count));
      expect([...slots].sort((x, y) => x - y)).toEqual(Array.from({ length: count }, (_, i) => i));
      // Середина пары отстоит от середины ряда не больше чем на полместа.
      expect(Math.abs((slots[0] + slots[1]) / 2 - (count - 1) / 2)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe("снимок плана для редактора", () => {
  it("содержит размер зала, столы, нерассаженных и версию", async () => {
    await addGuest(a, "Вера Иванова");
    await applyOp(a.ctx, { kind: "resizeHall", width: 1300, height: 800 }, 0);

    const plan = await getEditorPlan(a.ctx);
    expect(plan?.hall).toEqual({ width: 1300, height: 800 });
    expect(plan?.version).toBe(1);
    expect(plan?.tables).toHaveLength(1);
    expect(plan?.unseated).toHaveLength(1);
  });

  it("название стола-дубля объясняется словами, а не ошибкой базы", async () => {
    const res = await applyOp(a.ctx, { kind: "createTable", label: "Стол 1", capacity: 4 }, 0);
    expect(res).toMatchObject({ ok: false, message: "Стол с таким названием уже есть" });
  });
});
