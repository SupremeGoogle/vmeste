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

it("смена дизайна сохраняет удаления отдельных элементов", async () => {
  mocks.event.findFirst.mockResolvedValue({ inviteTheme: { ...defaultTheme(), template: "gazette", removedComponents: { venue: ["link:mapUrl", "field:imageUrl"] } } });
  expect(await applyTemplate(ctx, "prism")).toBe(true);
  expect(mocks.event.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { inviteTheme: expect.objectContaining({ removedComponents: { venue: ["link:mapUrl", "field:imageUrl"] } }) } }));
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

it("английская свадьба получает английский образец шаблона", async () => {
  mocks.event.findFirst.mockResolvedValue({ inviteTheme: { ...defaultTheme() }, title: "Emily & James", language: "en" });
  mocks.inviteBlock.count.mockResolvedValue(0);
  expect(await applyTemplate(ctx, "roseraie")).toBe(true);
  const created = mocks.inviteBlock.create.mock.calls.map(([arg]) => arg.data);
  const cover = created.find((data) => data.type === "COVER");
  expect(cover.content).toMatchObject({ names: "Emily & James", dateText: "June 12, 2027" });
  // Ни одного русского слова в образце, включая добавленные стандартом таймер, анкету и виш-лист.
  expect(JSON.stringify(created.map((data) => data.content))).not.toMatch(/[А-Яа-яЁё]/);
  expect(created.map((data) => data.type)).toEqual(expect.arrayContaining(["COUNTDOWN", "RSVP_FORM", "WISHLIST"]));
  expect(mocks.event.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ inviteTheme: expect.objectContaining({ template: "roseraie", language: "en" }) }) }));
});

it("русская свадьба по-прежнему получает русский образец", async () => {
  mocks.event.findFirst.mockResolvedValue({ inviteTheme: { ...defaultTheme() }, title: "Аня и Миша", language: "ru" });
  mocks.inviteBlock.count.mockResolvedValue(0);
  await applyTemplate(ctx, "roseraie");
  const cover = mocks.inviteBlock.create.mock.calls.map(([arg]) => arg.data).find((data) => data.type === "COVER");
  expect(cover.content).toMatchObject({ names: "Валерия и Давид" });
});
