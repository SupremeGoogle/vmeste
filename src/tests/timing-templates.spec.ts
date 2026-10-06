import { describe, expect, it, vi, beforeEach } from "vitest";
import { localDateTime } from "@/lib/wedding-day";
import { timingTemplateSteps } from "@/lib/timing-templates";
import type { EventContext } from "@/server/context";

const mocks = vi.hoisted(() => ({ event: vi.fn(), existing: vi.fn(), create: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));
import { applyTimingTemplate } from "@/server/services/timing-templates";

const event = { eventDate: new Date("2026-12-31T20:00Z"), timezone: "Asia/Vladivostok" };
const ctx: EventContext = { kind: "org", eventId: "wedding-a", orgId: "org-a", userId: "owner", role: "OWNER" };

describe("готовые сценарии свадебного дня", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.event.mockResolvedValue(event);
    mocks.existing.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ count: 7 });
    mocks.transaction.mockImplementation((work) => work({ event: { findFirst: mocks.event }, dayStep: { findMany: mocks.existing, createMany: mocks.create } }));
  });
  it("выбирает календарный день площадки на границе года, а не UTC-день", () => {
    const stages = timingTemplateSteps("classic", event.eventDate, event.timezone)!;
    expect(localDateTime(stages[0].startsAt, event.timezone)).toBe("2027-01-01T15:00");
    expect(stages[0].startsAt.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
  it("дополняет существующий план, не изменяя этапы и не повторяя выбранный сценарий", async () => {
    const stages = timingTemplateSteps("classic", event.eventDate, event.timezone)!;
    mocks.existing.mockResolvedValue([{ title: "Мой особенный момент", startsAt: stages[0].startsAt }, stages[1]]);
    expect((await applyTimingTemplate(ctx, "classic")).ok).toBe(true);
    const additions = mocks.create.mock.calls[0][0].data;
    expect(additions).toHaveLength(6);
    expect(additions.every((stage: { eventId: string; orgId: string }) => stage.eventId === ctx.eventId && stage.orgId === ctx.orgId)).toBe(true);
    expect(mocks.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "Serializable" });
    mocks.existing.mockResolvedValue(stages);
    mocks.create.mockClear();
    expect((await applyTimingTemplate(ctx, "classic")).message).toContain("уже есть");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("не записывает чужое мероприятие или неизвестный сценарий", async () => {
    expect((await applyTimingTemplate(ctx, "invented")).ok).toBe(false);
    mocks.event.mockResolvedValue(null);
    expect((await applyTimingTemplate(ctx, "classic")).ok).toBe(false);
    expect(mocks.event.mock.calls[0][0].where).toEqual({ id: ctx.eventId, orgId: ctx.orgId });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("сообщает о конкурирующем изменении плана без частичного добавления", async () => {
    mocks.transaction.mockRejectedValue({ code: "P2034" });
    expect(await applyTimingTemplate(ctx, "classic")).toMatchObject({ ok: false, message: expect.stringContaining("ещё раз") });
  });
});
