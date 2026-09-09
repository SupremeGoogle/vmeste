import { describe, expect, it } from "vitest";
import { defaultContent, readBlockContent } from "@/lib/invite-blocks";
import { PROMISE_TEMPLATE } from "@/lib/invite-templates/promise";
import { findTemplate } from "@/lib/invite-templates";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";
import { GET } from "@/app/templates/promise/route";

const theme = PROMISE_TEMPLATE.theme;
function block(type: InviteBlockView["type"], content: object): InviteBlockView {
  return { id: "editable", type, order: 0, visible: true, degraded: false, content: { ...defaultContent(type), ...content } };
}

describe("Обещание: интеграция с редактором и гостевыми страницами", () => {
  it("сохраняет все блоки после JSON и чтения схемами редактора", () => {
    // Шаблон берём напрямую, а не через реестр: на витрине он больше не
    // стоит (там ровно одна «История»), но сам шаблон рабочий, и его
    // блоки обязаны переживать сохранение и чтение схемами редактора.
    const saved = JSON.parse(JSON.stringify(PROMISE_TEMPLATE));
    for (const item of saved.blocks) {
      const parsed = readBlockContent(item.type, item.content);
      expect(parsed.degraded).toBe(false);
      expect(parsed.content).toEqual(item.content);
    }
  });

  it("показывает заменённые имена, фото, подписи и дату; экранирует текст", () => {
    const html = renderBlocks([
      block("COVER", { names: "Елена и <Михаил>", imageUrl: "/api/asset/event1/asset1", subtitle: "Наш новый текст" }),
      block("PHOTOS", { items: [{ imageUrl: "/api/asset/event1/asset2", caption: "<Наш снимок>" }] }),
    ], null, null, new Date("2027-08-21T23:30:00Z"), theme, "Europe/Kaliningrad");
    expect(html).toContain("Елена");
    expect(html).toContain("&lt;Михаил&gt;");
    expect(html).toContain("Наш новый текст");
    expect(html).toContain('src="/api/asset/event1/asset1"');
    expect(html).toContain('src="/api/asset/event1/asset2"');
    expect(html).toContain("&lt;Наш снимок&gt;");
    expect(html).toContain("22 августа 2027");
    expect(html).not.toContain("<Михаил>");
  });

  it("сохраняет ручную дату и режим обложки без фото", () => {
    const html = renderBlocks([block("COVER", { names: "Любимые люди", dateText: "Встретимся летом", imageUrl: "/api/asset/e/a" })], null, null, new Date(), { ...theme, cover: "plain" });
    expect(html).toContain("Встретимся летом");
    expect(html).not.toContain("promise-portrait");
    expect(html).toContain("Любимые люди");
  });

  it("переиспользует действующие именные ссылки RSVP и карты", () => {
    const blocks = [block("RSVP_FORM", { buttonLabel: "Я буду" }), block("MAP", { yandexUrl: "https://yandex.ru/maps/?x=1&y=2" })];
    const html = renderBlocks(blocks, "/i/our-day/private/rsvp", null, undefined, theme);
    expect(html).toContain('href="/i/our-day/private/rsvp"');
    expect(html).toContain("Я буду");
    expect(html).toContain('href="https://yandex.ru/maps/?x=1&amp;y=2"');
    const answered = renderBlocks(blocks, "/i/our-day/private/rsvp", "придём", undefined, theme);
    expect(answered).toContain("Ваш ответ:");
    expect(answered).toContain("изменить");
    const anonymous = renderBlocks(blocks, null, null, undefined, theme);
    expect(anonymous).toContain("по именной ссылке");
    expect(anonymous).not.toContain('class="cta"');
  });

  it("не добавляет оформление и анимации к Истории", () => {
    const story = findTemplate("story")!;
    const blocks = [block("COVER", { names: "Анна и Михаил" })];
    const body = renderBlocks(blocks, null, null, undefined, story.theme);
    expect(invitePage({ title: "История", theme: story.theme, body })).not.toContain("promise-");
    expect(inviteScript(blocks, story.theme, "Анна и Михаил")).not.toContain("promise-");
    expect(inviteScript(blocks, theme, "Анна и Михаил")).toContain("prefers-reduced-motion");
  });

  it("превью открывается без базы данных и без возможности отправить ответ", async () => {
    const response = GET();
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Анна");
    expect(html).toContain("promise-cover");
    expect(html).toContain("noindex,nofollow");
    expect(html).not.toContain('<form');
  });
});
