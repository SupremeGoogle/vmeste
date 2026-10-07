import { beforeEach, expect, it, vi } from "vitest";
import { defaultTheme, type InviteTheme } from "@/lib/invite-theme";
import { weddingSchema } from "@/lib/invite-personalization";
import { duplicateBlock, updateInlineBlockField } from "@/server/repositories/invites";
import type { EventContext } from "@/server/context";

const state = vi.hoisted(() => ({ theme: {} as Record<string, unknown>, blockExists: true, eventExists: true }));
const mocks = vi.hoisted(() => ({
  event: { findFirst: vi.fn(), updateMany: vi.fn() },
  inviteBlock: { findFirst: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("@/server/db", () => ({ db: { ...mocks, $transaction: (fn: (tx: typeof mocks) => unknown) => fn(mocks) } }));
const ctx = { eventId: "event", orgId: "org" } as EventContext;
beforeEach(() => {
  vi.clearAllMocks();
  state.theme = { ...defaultTheme(), labels: { "gazette.city": "Наш город" }, wedding: weddingSchema.parse({ names: "Аня и Миша", city: "", venueName: "Наш ресторан", venueAddress: "Наш адрес", mapUrl: "" }) };
  state.blockExists = true;
  state.eventExists = true;
  mocks.event.findFirst.mockImplementation(async () => state.eventExists ? { inviteTheme: state.theme, venueName: "Наш ресторан", venueAddr: "Наш адрес", rsvpDeadline: null } : null);
  mocks.event.updateMany.mockImplementation(async ({ data }) => { state.theme = data.inviteTheme; return { count: 1 }; });
  mocks.inviteBlock.findFirst.mockImplementation(async () => state.blockExists ? { id: "venue", type: "VENUE", content: { title: "Место", mapUrl: "https://example.com/map" }, order: 0, visible: true } : null);
  mocks.inviteBlock.findMany.mockResolvedValue([{ id: "venue" }]);
  mocks.inviteBlock.create.mockResolvedValue({ id: "copy" });
});

it("сохраняет удаление и восстановление, не изменяя содержимое и общие данные", async () => {
  expect(await updateInlineBlockField(ctx, "venue", "component:link:mapUrl", "remove")).toEqual({ ok: true });
  expect(state.theme.removedComponents).toEqual({ venue: ["link:mapUrl"] });
  expect((state.theme as InviteTheme).wedding?.venueName).toBe("Наш ресторан");
  expect(state.theme.labels).toEqual({ "gazette.city": "Наш город" });
  expect(mocks.inviteBlock.updateMany).not.toHaveBeenCalled();
  expect(await updateInlineBlockField(ctx, "venue", "component:link:mapUrl", "restore")).toEqual({ ok: true });
  expect(state.theme.removedComponents).toEqual({});
});

it("несколько элементов сохраняются независимо; повторное удаление не создаёт копий", async () => {
  for (const key of ["field:title", "link:mapUrl", "field:title"]) expect((await updateInlineBlockField(ctx, "venue", `component:${key}`, "remove")).ok).toBe(true);
  await updateInlineBlockField(ctx, "venue", "component:field:title", "restore");
  expect(state.theme.removedComponents).toEqual({ venue: ["link:mapUrl"] });
});

it("чужой раздел, неверный ключ и неверное действие не сохраняются", async () => {
  for (const [path, value] of [["component:../../bad", "remove"], ["component:field:title", "bad"], ["component:__proto__", "remove"]]) expect((await updateInlineBlockField(ctx, "venue", path, value)).ok).toBe(false);
  state.blockExists = false;
  expect((await updateInlineBlockField(ctx, "foreign", "component:field:title", "remove")).ok).toBe(false);
  expect(mocks.event.updateMany).not.toHaveBeenCalled();
});

it("проверяет доступ к мероприятию и для декора шаблона", async () => {
  state.eventExists = false;
  expect((await updateInlineBlockField(ctx, "__template", "component:label:gazette.city", "remove")).ok).toBe(false);
  expect(mocks.event.updateMany).not.toHaveBeenCalled();
});

it("копия раздела наследует удаления, но восстановление в копии не меняет оригинал", async () => {
  await updateInlineBlockField(ctx, "venue", "component:link:mapUrl", "remove");
  expect(await duplicateBlock(ctx, "venue")).toBe("copy");
  expect(state.theme.removedComponents).toEqual({ venue: ["link:mapUrl"], copy: ["link:mapUrl"] });
  await updateInlineBlockField(ctx, "copy", "component:link:mapUrl", "restore");
  expect(state.theme.removedComponents).toEqual({ venue: ["link:mapUrl"] });
});
