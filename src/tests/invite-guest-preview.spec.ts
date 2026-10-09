import { beforeEach, describe, expect, it, vi } from "vitest";
import { INVITE_TEMPLATES, findTemplate } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { renderBlocks } from "@/server/guest-html/invite-html";
import { GET } from "@/app/(app)/app/e/[eventId]/invite/canvas/route";

const mocks = vi.hoisted(() => ({
  requireEventContext: vi.fn(), getEvent: vi.fn(), listBlocks: vi.fn(),
  getTheme: vi.fn(), getInviteBySlug: vi.fn(), loadWishlist: vi.fn(),
}));
vi.mock("@/server/i18n", () => ({ getUiLang: async () => "ru", getT: async () => (ru: string) => ru }));
vi.mock("@/server/context", () => ({ requireEventContext: mocks.requireEventContext }));
vi.mock("@/server/repositories/events", () => ({ getEvent: mocks.getEvent }));
vi.mock("@/server/repositories/invites", () => ({
  listBlocks: mocks.listBlocks, getTheme: mocks.getTheme, getInviteBySlug: mocks.getInviteBySlug,
}));
// Анкета превью читает вопросы из базы — здесь базы нет, анкета-образец.
vi.mock("@/server/guest-html/inline-rsvp", () => ({ buildInlineRsvp: async () => null, hasInlineRsvp: () => true }));
vi.mock("@/server/guest-html/wishlist", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/guest-html/wishlist")>(), loadWishlist: mocks.loadWishlist,
}));

const eventId = "current-event";
const ctx = { eventId, orgId: "current-org" };
const date = new Date("2027-08-21T12:00:00Z");
const event = {
  id: eventId, title: "Наша свадьба", slug: "shared-slug", status: "DRAFT",
  eventDate: date, timezone: "Europe/Kaliningrad",
};
const request = () => new Request(`http://localhost/app/e/${eventId}/invite/canvas?preview=1`);
const params = () => ({ params: Promise.resolve({ eventId }) });
function useTemplate(id: string) {
  const template = findTemplate(id)!;
  const blocks = template.blocks.map((b, order) => ({
    id: `block-${order}`, type: b.type, order, visible: b.visible !== false,
    ...readBlockContent(b.type, b.content),
  }));
  mocks.listBlocks.mockResolvedValue(blocks);
  mocks.getTheme.mockResolvedValue(template.theme);
  return { template, blocks };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireEventContext.mockResolvedValue(ctx);
  mocks.getEvent.mockResolvedValue(event);
  mocks.getInviteBySlug.mockRejectedValue(new Error("Неоднозначная общая ссылка"));
  mocks.loadWishlist.mockResolvedValue({ gifts: [], envelope: null, reserveAction: null, joinHref: null, message: null });
});

describe("Открыть как гость — конкретное мероприятие, без поиска по общему слагу", () => {
  it.each(INVITE_TEMPLATES.map(t => t.id))("%s: показывает сохранённый шаблон черновика и гостевой режим", async (id) => {
    const { template, blocks } = useTemplate(id);
    const response = await GET(request(), params());
    const page = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(page).toContain("<title>Наша свадьба</title>");
    // Включая свою заставку: гостевой просмотр использует ту же тему и
    // содержимое, а не образец с витрины или чужое опубликованное событие.
    expect(page).toContain(renderBlocks(blocks.filter(b => b.visible), null, null, date, template.theme, event.timezone, {
      wishlist: await mocks.loadWishlist(),
    }));
    expect(/<[^>]+\sdata-edit-text=/.test(page)).toBe(false);
    expect(/<[^>]+\sdata-editor-ui(?:\s|>)/.test(page)).toBe(false);
    expect(page).not.toContain("визуальный редактор");
    expect(mocks.requireEventContext).toHaveBeenCalledWith(eventId);
    expect(mocks.getEvent).toHaveBeenCalledWith(ctx, eventId);
    expect(mocks.listBlocks).toHaveBeenCalledWith(ctx);
    expect(mocks.getTheme).toHaveBeenCalledWith(ctx);
    expect(mocks.getInviteBySlug).not.toHaveBeenCalled();
  });

  it("каждое открытие читает последнюю тему, включая отключение заставки и удаления", async () => {
    useTemplate("pearl");
    const first = await (await GET(request(), params())).text();
    expect(first).toContain('class="sheet pearl"');
    const { template, blocks } = useTemplate("gazette");
    const venue = blocks.find(b => b.type === "VENUE")!;
    mocks.getTheme.mockResolvedValue({ ...template.theme, introOff: true, removedComponents: { [venue.id]: ["link:mapUrl"] } });
    const next = await (await GET(request(), params())).text();
    expect(next).toContain('class="sheet gazette"');
    expect(next).not.toContain('class="sheet pearl"');
    expect(next).toContain(".ed-intro{display:none!important}");
    expect(next).not.toContain("Построить маршрут");
    expect(mocks.getTheme).toHaveBeenCalledTimes(2);
  });

  it("сохраняет проверку доступа до чтения содержимого", async () => {
    mocks.requireEventContext.mockRejectedValue(new Error("Нет доступа"));
    await expect(GET(request(), params())).rejects.toThrow("Нет доступа");
    expect(mocks.getEvent).not.toHaveBeenCalled();
    expect(mocks.listBlocks).not.toHaveBeenCalled();
    expect(mocks.getTheme).not.toHaveBeenCalled();
  });

  it("отсутствующее мероприятие возвращает 404, не подменяя его опубликованным", async () => {
    useTemplate("gazette");
    mocks.getEvent.mockResolvedValue(null);
    const response = await GET(request(), params());
    expect(response.status).toBe(404);
    expect(mocks.getInviteBySlug).not.toHaveBeenCalled();
  });
});
