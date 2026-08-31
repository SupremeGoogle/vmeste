/**
 * Оформление приглашения: тема, шаблоны и перевод в CSS.
 *
 * Главное здесь — терпимость на чтении. Приглашение открывают по ссылке
 * из смс, и «страница не открылась» для гостя неотличимо от «свадьбы не
 * будет». Никакое содержимое поля `inviteTheme` не должно этого вызвать.
 */
import { describe, expect, it } from "vitest";
import {
  defaultTheme, parseTheme, readTheme, FONT_STACKS, CORNER_RADIUS,
} from "@/lib/invite-theme";
import { INVITE_TEMPLATES, findTemplate } from "@/lib/invite-templates";
import { inviteThemeCss } from "@/server/guest-html/invite-theme-css";
import { themeFromForm } from "@/server/services/invite-theme-forms";

describe("тема: запись", () => {
  it("умолчания складываются в рабочую тему", () => {
    const theme = defaultTheme();
    expect(theme.bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(FONT_STACKS[theme.headingFont]).toBeTruthy();
    expect(CORNER_RADIUS[theme.corner]).toBeTruthy();
  });

  it("не-цвет отвергается с человеческим сообщением", () => {
    const result = parseTheme({ ...defaultTheme(), accent: "красный" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Акцент");
      expect(result.message).toContain("#");
    }
  });

  it("значение, которое попало бы прямо в style, не проходит", () => {
    // Иначе `accent` вида `red;background:url(...)` стал бы дырой в CSS.
    for (const evil of ["red;x:y", "url(evil)", "#fff;}body{display:none", "expression(1)"]) {
      expect(parseTheme({ ...defaultTheme(), accent: evil }).ok).toBe(false);
    }
  });

  it("неизвестный шрифт или форма углов не проходят", () => {
    expect(parseTheme({ ...defaultTheme(), headingFont: "comic" }).ok).toBe(false);
    expect(parseTheme({ ...defaultTheme(), corner: "прямые" }).ok).toBe(false);
  });
});

describe("тема: чтение", () => {
  it("мусор в базе не роняет страницу", () => {
    for (const junk of [null, undefined, 42, "тема", [], { bg: 1 }, { corner: "нет" }]) {
      const theme = readTheme(junk);
      expect(theme.bg).toMatch(/^#/);
      expect(FONT_STACKS[theme.headingFont]).toBeTruthy();
    }
  });

  it("уцелевшие поля сохраняются, испорченные берутся по умолчанию", () => {
    const theme = readTheme({ accent: "#123456", corner: "чепуха", bg: "#abcdef" });
    expect(theme.accent).toBe("#123456");
    expect(theme.bg).toBe("#abcdef");
    expect(theme.corner).toBe(defaultTheme().corner);
  });

  it("круговой обход не теряет ничего", () => {
    for (const template of INVITE_TEMPLATES) {
      expect(readTheme(JSON.parse(JSON.stringify(template.theme)))).toEqual(template.theme);
    }
  });
});

describe("шаблоны", () => {
  it("их три и они разные по характеру, а не по оттенку", () => {
    expect(INVITE_TEMPLATES).toHaveLength(3);

    const ids = new Set(INVITE_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(3);

    // Светлый и тёмный обязаны отличаться яркостью фона, иначе это один
    // шаблон в двух видах.
    const brightness = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    const values = INVITE_TEMPLATES.map((t) => brightness(t.theme.bg));
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(200);
  });

  it("каждый шаблон приходит с готовым содержимым, а не пустыми полями", () => {
    for (const template of INVITE_TEMPLATES) {
      expect(template.blocks.length).toBeGreaterThanOrEqual(5);

      const types = template.blocks.map((b) => b.type);
      expect(types).toContain("COVER");
      expect(types).toContain("RSVP_FORM");

      // Обложка без имён — это лист, перед которым садятся и не знают,
      // что писать. Шаблон обязан подсказывать.
      const cover = template.blocks.find((b) => b.type === "COVER")!;
      expect(String(cover.content.names ?? "")).not.toBe("");
    }
  });

  it("содержимое шаблонов проходит те же схемы, что и ручной ввод", async () => {
    const { parseBlockContent } = await import("@/lib/invite-blocks");
    for (const template of INVITE_TEMPLATES) {
      for (const block of template.blocks) {
        const result = parseBlockContent(block.type, block.content);
        expect(result.ok, `${template.id} / ${block.type}`).toBe(true);
      }
    }
  });

  it("тема шаблона проходит проверку записи", () => {
    for (const template of INVITE_TEMPLATES) {
      expect(parseTheme(template.theme).ok, template.id).toBe(true);
    }
  });

  it("несуществующий шаблон не находится", () => {
    expect(findTemplate("нет такого")).toBeNull();
    expect(findTemplate("powder")?.name).toBe("Пудра");
  });
});

describe("тема в CSS", () => {
  it("значения темы доходят до правил", () => {
    const css = inviteThemeCss({ ...defaultTheme(), accent: "#123456", bg: "#abcdef" });
    expect(css).toContain("--accent:#123456");
    expect(css).toContain("--bg:#abcdef");
  });

  it("в CSS не попадает ни переносов строк, ни фигурных скобок из данных", () => {
    // Переносы ломают минификацию соседних правил, а данные в CSS
    // проверяются схемой — здесь только страховка на будущее.
    const css = inviteThemeCss(defaultTheme());
    expect(css).not.toContain("\n");
    expect(css.match(/\{/g)?.length).toBe(css.match(/\}/g)?.length);
  });

  it("каждая ось меняет вывод — иначе настройка в панели ничего не делает", () => {
    const base = inviteThemeCss(defaultTheme());
    const axes = [
      { corner: "round" as const },
      { divider: "leaf" as const },
      { cover: "photo" as const },
      { align: "left" as const },
      { frame: true },
      { capsHeadings: false },
      { headingFont: "grotesk" as const },
    ];

    for (const axis of axes) {
      const changed = inviteThemeCss({ ...defaultTheme(), ...axis });
      expect(changed, JSON.stringify(axis)).not.toBe(base);
    }
  });

  it("рамка листа позиционируется от листа, а не от окна", () => {
    // Без `position:relative` на `.sheet` рамка обрывается ровно на
    // высоте экрана и висит посреди длинного приглашения.
    const css = inviteThemeCss({ ...defaultTheme(), frame: true });
    expect(css).toContain(".sheet{position:relative");
  });
});

describe("форма настроек", () => {
  const form = (values: Record<string, string>) => ({
    get: (name: string) => (name in values ? values[name] : null),
  });

  it("непереданные поля берутся из нынешней темы", () => {
    const current = { ...defaultTheme(), accent: "#111111", corner: "round" as const };
    const result = themeFromForm(form({ bg: "#ffffff" }), current);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.theme.bg).toBe("#ffffff");
      expect(result.theme.accent).toBe("#111111");
      expect(result.theme.corner).toBe("round");
    }
  });

  it("флажок без пометки об отправке не сбрасывается", () => {
    // Браузер не присылает выключенный флажок вовсе. Без пометки
    // сохранение палитры выключало бы рамку из соседней формы.
    const current = { ...defaultTheme(), frame: true };
    const kept = themeFromForm(form({ bg: "#ffffff" }), current);
    expect(kept.ok && kept.theme.frame).toBe(true);

    const turnedOff = themeFromForm(form({ frame__sent: "1" }), current);
    expect(turnedOff.ok && turnedOff.theme.frame).toBe(false);
  });

  it("шаблон не теряется при правке оформления", () => {
    const current = { ...defaultTheme(), template: "emerald" };
    const result = themeFromForm(form({ bg: "#ffffff" }), current);
    expect(result.ok && result.theme.template).toBe("emerald");
  });
});
