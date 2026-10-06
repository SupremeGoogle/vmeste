import { beforeEach, expect, it, vi } from "vitest";
import { defaultTheme } from "@/lib/invite-theme";
import { applyTemplate } from "@/server/repositories/invites";
import type { EventContext } from "@/server/context";

const mocks = vi.hoisted(() => ({
  event: { findFirst: vi.fn(), updateMany: vi.fn() },
  inviteBlock: { count: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/server/db", () => ({ db: { ...mocks, $transaction: (fn: (tx: typeof mocks) => unknown) => fn(mocks) } }));
const ctx = { eventId: "event", orgId: "org" } as EventContext;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.event.findFirst.mockResolvedValue({ inviteTheme: { ...defaultTheme(), template: "silk", musicUrl: "/media/test/song.mp3" } });
  mocks.inviteBlock.count.mockResolvedValue(5);
  mocks.inviteBlock.findMany.mockResolvedValue([]);
});

it("смена дизайна не удаляет и не пересоздаёт заполненные блоки", async () => {
  expect(await applyTemplate(ctx, "prism")).toBe(true);
  expect(mocks.inviteBlock.deleteMany).not.toHaveBeenCalled();
  expect(mocks.inviteBlock.create).not.toHaveBeenCalled();
  expect(mocks.event.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { inviteTheme: expect.objectContaining({ template: "prism", previousTemplate: "silk", musicUrl: "/media/test/song.mp3" }) } }));
});

it("несуществующий шаблон ничего не меняет", async () => {
  expect(await applyTemplate(ctx, "missing")).toBe(false);
  expect(mocks.event.updateMany).not.toHaveBeenCalled();
  expect(mocks.inviteBlock.deleteMany).not.toHaveBeenCalled();
});

it("смена дизайна дополняет примером только незаполненные места", async () => {
  mocks.inviteBlock.findMany.mockResolvedValue([
    { id: "cover", type: "COVER", content: { v: 1, names: "Аня и Миша", title: "тили ~ тили тесто", imageUrl: "", subtitle: "" } },
  ]);
  await applyTemplate(ctx, "prism");
  expect(mocks.inviteBlock.deleteMany).not.toHaveBeenCalled();
  expect(mocks.inviteBlock.create).not.toHaveBeenCalled();
  const call = mocks.inviteBlock.updateMany.mock.calls[0][0];
  expect(call.where).toMatchObject({ id: "cover", eventId: "event", orgId: "org" });
  expect(call.data.content).toMatchObject({ names: "Аня и Миша", title: "Любовь в преломлении" });
  expect(call.data.content.imageUrl).toBeTruthy();
});
