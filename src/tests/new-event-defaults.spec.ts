/**
 * Новая свадьба открывается готовой к работе: шаблон «Лилия» и три стола
 * в рассадке — молодожёнов, квадратный и круглый.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import { applyTemplate } from "@/server/repositories/invites";
import { seedDefaultSeating } from "@/server/services/seating-defaults";

async function freshEvent(language: "ru" | "en" = "ru") {
  const org = await testDb.organization.create({ data: { name: "defaults", slug: `defaults-${language}` } });
  const event = await testDb.event.create({
    data: { orgId: org.id, title: "Аня и Миша", slug: `defaults-${language}`, shortCode: language === "en" ? "DEFEN1" : "DEFRU1", eventDate: new Date(), language },
  });
  return { kind: "org" as const, userId: "u", orgId: org.id, role: "OWNER" as const, eventId: event.id };
}

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("новая свадьба", () => {
  it("три стола: молодожёнов на 2, квадратный и круглый на 8, не друг на друге", async () => {
    const ctx = await freshEvent();
    await seedDefaultSeating(ctx, "ru");
    const tables = await testDb.seatTable.findMany({
      where: { eventId: ctx.eventId },
      include: { _count: { select: { seats: true } } },
      orderBy: { label: "asc" },
    });
    expect(tables).toHaveLength(3);
    const couple = tables.find((t) => t.isCouple)!;
    expect(couple._count.seats).toBe(2);
    expect(tables.find((t) => t.label === "Стол 1")).toMatchObject({ shape: "RECT", capacity: 8 });
    expect(tables.find((t) => t.label === "Стол 2")).toMatchObject({ shape: "ROUND", capacity: 8 });
    const spots = new Set(tables.map((t) => `${Math.round(t.x)}:${Math.round(t.y)}`));
    expect(spots.size).toBe(3);
  });

  it("на английской свадьбе столы называются Table", async () => {
    const ctx = await freshEvent("en");
    await seedDefaultSeating(ctx, "en");
    const labels = (await testDb.seatTable.findMany({ where: { eventId: ctx.eventId, isCouple: false } })).map((t) => t.label).sort();
    expect(labels).toEqual(["Table 1", "Table 2"]);
  });

  it("шаблон «Лилия» применяется с блоками", async () => {
    const ctx = await freshEvent();
    expect(await applyTemplate(ctx, "lily")).toBe(true);
    const event = await testDb.event.findUniqueOrThrow({ where: { id: ctx.eventId } });
    expect((event.inviteTheme as { template?: string }).template).toBe("lily");
    expect(await testDb.inviteBlock.count({ where: { eventId: ctx.eventId } })).toBeGreaterThan(0);
  });
});
