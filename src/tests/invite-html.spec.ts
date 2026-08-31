/**
 * Приглашение строкой HTML.
 *
 * Проверяется то, ради чего строку писали вручную: чужой текст не
 * становится разметкой, а блоки не разваливаются на пустых полях.
 * Экранирование здесь не абстрактная гигиена — содержимое блоков пишет
 * организатор, а читают его гости по ссылке из смс.
 */
import { describe, expect, it } from "vitest";
import { renderBlocks, invitePage } from "@/server/guest-html/invite-html";
import { defaultContent } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";

const block = (type: InviteBlockView["type"], content: object = {}): InviteBlockView => ({
  id: `${type}-1`,
  type,
  order: 0,
  visible: true,
  content: { ...defaultContent(type), ...content },
  degraded: false,
});

describe("разметка приглашения", () => {
  it("рисует все типы блоков и не падает на пустых", () => {
    const html = renderBlocks(
      ["COVER", "TIMELINE", "VENUE", "DRESSCODE", "MAP", "TEXT", "RSVP_FORM"].map((type) =>
        block(type as InviteBlockView["type"]),
      ),
      "/i/x/y/rsvp",
      null,
    );
    expect(html).toContain("<section");
    expect(html).not.toContain("undefined");
  });

  it("экранирует текст блока — его пишет человек", () => {
    const html = renderBlocks(
      [block("TEXT", { title: "", text: '<img src=x onerror="alert(1)">' })],
      null,
      null,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("экранирует и ссылку на обложку", () => {
    const html = renderBlocks([block("COVER", { imageUrl: 'https://x/"onload="alert(1)' })], null, null);
    expect(html).not.toContain('"onload="');
  });

  it("на неименной странице не зовёт отвечать", () => {
    const html = renderBlocks([block("RSVP_FORM")], null, null);
    expect(html).toContain("по именной ссылке");
    expect(html).not.toContain("<a class=\"cta\"");
  });

  it("уже ответившему показывает ответ и ссылку «изменить»", () => {
    const html = renderBlocks([block("RSVP_FORM")], "/i/x/y/rsvp", "придём");
    expect(html).toContain("придём");
    expect(html).toContain("изменить");
  });

  it("страница целиком — валидный документ без внешних ресурсов", () => {
    const page = invitePage({ title: "Аня и Миша", body: "<section>тело</section>" });
    expect(page.startsWith("<!doctype html>")).toBe(true);
    expect(page).toContain("<title>Аня и Миша</title>");
    // Ни одного запроса наружу: ни шрифтов, ни таблиц стилей.
    expect(page).not.toContain("<link");
    expect(page).not.toContain("<script");
  });

  it("даже со скриптом страница не ходит наружу", () => {
    // Инлайновый скрипт разрешён (отсчёт, загрузчик фотографий), внешний —
    // нет: это лишний запрос по сети, которой в дороге почти нет, и
    // сторонний домен на странице, открытой по ссылке из смс.
    const page = invitePage({
      title: "Аня и Миша",
      body: "<section>тело</section>",
      script: "var x=1",
    });

    expect(page).toContain("<script>var x=1</script>");
    expect(page).not.toMatch(/<script[^>]+src=/);
    expect(page).not.toMatch(/<(link|iframe|img)[^>]+(https?:)?\/\//);
  });

  it("именная страница помечается noindex", () => {
    expect(invitePage({ title: "x", body: "", noindex: true })).toContain("noindex");
    expect(invitePage({ title: "x", body: "" })).not.toContain("noindex");
  });
});
