/**
 * Формы столов и отметки молодожёнов.
 *
 * Две вещи, которые видит гость в зале: круглый стол должен выглядеть
 * круглым и вмещать свои места без наложений, а места невесты и жениха —
 * быть заметны без объяснений.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { testDb, resetDb } from "./helpers/db";
import { applyOp } from "@/server/services/seating-ops";
import { setGuestRole } from "@/server/repositories/guests";
import { SEAT_RADIUS, SHAPES, seatPosition, shapeSize } from "@/lib/seating-geometry";
import { markFor, hasCouple } from "@/lib/couple-marks";
import { floorPlanSvg } from "@/server/guest-html/floor-plan-svg";
import { normalizeName } from "@/lib/name-normalize";
import type { EventContext } from "@/server/context";

type World = { ctx: EventContext; eventId: string; guestId: string };

async function makeWorld(slug: string, code: string): Promise<World> {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: code,
      eventDate: new Date("2026-09-12"),
    },
  });
  const guest = await testDb.guest.create({
    data: {
      orgId: org.id, eventId: event.id, displayName: "Анна Петрова",
      searchKey: normalizeName("Анна Петрова"),
      linkToken: randomBytes(16).toString("base64url"),
    },
  });
  return {
    ctx: { kind: "org", userId: "u1", orgId: org.id, role: "OWNER", eventId: event.id },
    eventId: event.id,
    guestId: guest.id,
  };
}

let a: World;
let b: World;

beforeEach(async () => {
  await resetDb();
  a = await makeWorld("shape-a", "SHAPEA");
  b = await makeWorld("shape-b", "SHAPEB");
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("размер стола следует за формой и вместимостью", () => {
  it("места на круглом столе не налезают друг на друга", () => {
    for (const capacity of [4, 8, 12, 20]) {
      const size = shapeSize("ROUND", capacity);
      const table = { shape: "ROUND", x: 500, y: 350, capacity, ...size };
      const first = seatPosition(table, 0);
      const second = seatPosition(table, 1);
      const gap = Math.hypot(first.x - second.x, first.y - second.y);
      expect(gap).toBeGreaterThan(SEAT_RADIUS * 2);
    }
  });

  it("прямоугольный стол растёт в длину, а не в ширину", () => {
    const small = shapeSize("RECT", 4);
    const large = shapeSize("RECT", 16);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBe(small.height);
  });

  it("президиум длинный и неглубокий — гости сидят с одной стороны", () => {
    const head = shapeSize("HEAD", 6);
    expect(head.width).toBeGreaterThan(head.height * 2);
  });

  it("у всех форм есть размер, ни одна не нулевая", () => {
    for (const shape of SHAPES) {
      const size = shapeSize(shape, 8);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    }
  });
});

describe("форма стола в операциях", () => {
  it("стол создаётся выбранной формы и с подходящими габаритами", async () => {
    const result = await applyOp(
      a.ctx,
      { kind: "createTable", label: "Президиум", capacity: 4, shape: "HEAD" },
      null,
    );
    expect(result.ok).toBe(true);

    const table = await testDb.seatTable.findFirstOrThrow({ where: { eventId: a.eventId } });
    expect(table.shape).toBe("HEAD");
    expect(table.width).toBe(shapeSize("HEAD", 4).width);
  });

  it("смена формы меняет и габариты", async () => {
    await applyOp(a.ctx, { kind: "createTable", label: "Стол 1", capacity: 8 }, null);
    const before = await testDb.seatTable.findFirstOrThrow({ where: { eventId: a.eventId } });

    await applyOp(a.ctx, { kind: "setShape", tableId: before.id, shape: "RECT" }, null);
    const after = await testDb.seatTable.findFirstOrThrow({ where: { id: before.id } });

    expect(after.shape).toBe("RECT");
    expect(after.height).not.toBe(before.height);
  });

  it("смена формы отменяется", async () => {
    await applyOp(a.ctx, { kind: "createTable", label: "Стол 1", capacity: 8 }, null);
    const table = await testDb.seatTable.findFirstOrThrow({ where: { eventId: a.eventId } });

    const changed = await applyOp(a.ctx, { kind: "setShape", tableId: table.id, shape: "HEAD" }, null);
    expect(changed.ok && changed.undo).toEqual({
      kind: "setShape", tableId: table.id, shape: "ROUND",
    });
  });

  it("форму чужого стола не сменить", async () => {
    await applyOp(b.ctx, { kind: "createTable", label: "Чужой", capacity: 4 }, null);
    const foreign = await testDb.seatTable.findFirstOrThrow({ where: { eventId: b.eventId } });

    const result = await applyOp(a.ctx, { kind: "setShape", tableId: foreign.id, shape: "HEAD" }, null);
    expect(result).toMatchObject({ ok: false, reason: "gone" });
  });

  it("увеличение вместимости увеличивает стол", async () => {
    await applyOp(a.ctx, { kind: "createTable", label: "Стол 1", capacity: 4 }, null);
    const table = await testDb.seatTable.findFirstOrThrow({ where: { eventId: a.eventId } });

    await applyOp(a.ctx, { kind: "setCapacity", tableId: table.id, capacity: 16 }, null);
    const after = await testDb.seatTable.findFirstOrThrow({ where: { id: table.id } });
    expect(after.width).toBeGreaterThan(table.width);
  });
});

describe("отметки молодожёнов", () => {
  it("у невесты и жениха разные значки, у гостя — никакого", () => {
    expect(markFor("BRIDE")?.petals).toBeDefined();
    expect(markFor("GROOM")?.bow).toBeDefined();
    expect(markFor("GUEST")).toBeNull();
  });

  it("роль ставится и снимается", async () => {
    expect(await setGuestRole(a.ctx, a.guestId, "BRIDE")).toBe(true);
    let guest = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    expect(guest.role).toBe("BRIDE");

    await setGuestRole(a.ctx, a.guestId, "GUEST");
    guest = await testDb.guest.findUniqueOrThrow({ where: { id: a.guestId } });
    expect(guest.role).toBe("GUEST");
  });

  it("роль чужого гостя не поменять", async () => {
    expect(await setGuestRole(a.ctx, b.guestId, "GROOM")).toBe(false);
  });

  it("на плане для гостя значок рисуется вместо кружка места", () => {
    const table = {
      id: "t1", label: "Президиум", shape: "HEAD" as const,
      x: 500, y: 200, width: 240, height: 76, capacity: 2, taken: 2,
      roles: ["BRIDE", "GROOM"] as const,
    };
    const svg = floorPlanSvg([{ ...table, roles: [...table.roles] }]);

    expect(svg).toContain('aria-label="невеста"');
    expect(svg).toContain('aria-label="жених"');
    // Легенда: без неё букет и бабочка — просто два кружка.
    expect(svg).toContain("невеста</span>");
  });

  it("значок на месте подписан, а в легенде — декоративный", () => {
    // Иначе экранный диктор читает «невеста невеста»: один раз значок,
    // второй — слово рядом с ним в легенде.
    const svg = floorPlanSvg([
      {
        id: "t1", label: "Президиум", shape: "HEAD", x: 500, y: 200,
        width: 240, height: 76, capacity: 2, taken: 2, roles: ["BRIDE", "GROOM"],
      },
    ]);
    const plan = svg.slice(0, svg.indexOf("</svg>"));
    const legend = svg.slice(svg.indexOf("</svg>"));

    expect(plan).toContain('aria-label="невеста"');
    expect(legend).not.toContain('aria-label="невеста"');
    expect(legend).toContain('aria-hidden="true"');
  });

  it("без молодожёнов легенды нет", () => {
    const svg = floorPlanSvg([
      {
        id: "t1", label: "Стол 1", shape: "ROUND", x: 300, y: 300,
        width: 120, height: 120, capacity: 4, taken: 1, roles: ["GUEST", "GUEST", "GUEST", "GUEST"],
      },
    ]);
    expect(svg).not.toContain("class=\"legend\"");
    expect(hasCouple(["GUEST", "GUEST"])).toBe(false);
  });
});
