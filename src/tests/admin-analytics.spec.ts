/** Аналитика суперадмина: запросы живые и считают то, что обещают. */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import { dailyMetrics, guestBehaviour, liveliestEvents, organizerFunnel, templateConversion } from "@/server/admin/analytics";

beforeEach(() => resetDb());
afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("аналитика платформы", () => {
  it("воронка, дни, гости, живые свадьбы и шаблоны", async () => {
    const org = await testDb.organization.create({ data: { name: "a", slug: "a" } });
    const user = await testDb.user.create({ data: { email: "a@a.ru", name: "А" } });
    await testDb.membership.create({ data: { orgId: org.id, userId: user.id, role: "OWNER" } });
    const event = await testDb.event.create({
      data: { orgId: org.id, title: "Свадьба", slug: "s", shortCode: "ANLTCS", status: "PUBLISHED", eventDate: new Date(), inviteTheme: { template: "pearl" } },
    });
    await testDb.guest.create({
      data: { orgId: org.id, eventId: event.id, displayName: "Гость", searchKey: "гость", linkToken: "an-1", rsvpStatus: "ACCEPTED", rsvpAt: new Date(), linkOpenedAt: new Date() },
    });

    const funnel = await organizerFunnel();
    expect(funnel.map((step) => step.value)).toEqual([1, 1, 1, 1, 1, 1, 0]);

    const days = await dailyMetrics(30);
    expect(days).toHaveLength(6);
    expect(days[0].days).toHaveLength(30);
    expect(days.find((metric) => metric.key === "rsvps")?.total).toBe(1);

    expect(await guestBehaviour()).toMatchObject({ guests: 1, opened: 1, answered: 1 });
    expect((await liveliestEvents()).map((row) => row.title)).toEqual(["Свадьба"]);
    expect(await templateConversion()).toEqual([{ template: "pearl", events: 1, published: 1 }]);
  });
});
