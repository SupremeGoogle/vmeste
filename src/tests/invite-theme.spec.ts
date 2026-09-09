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
  it("шаблон есть хотя бы один, и идентификаторы не повторяются", () => {
    expect(INVITE_TEMPLATES.length).toBeGreaterThanOrEqual(1);

    // Повторяющийся id — это молчаливая подмена: выбрав один шаблон,
    // организатор получит другой.
    const ids = new Set(INVITE_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(INVITE_TEMPLATES.length);
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

  it("шаблоны отличаются не только цветом", () => {
    // Два шаблона с одинаковым набором осей — это один шаблон в двух
    // палитрах, и человек, выбрав второй, не увидит разницы.
    const shapes = INVITE_TEMPLATES.map((t) =>
      [t.theme.headingFont, t.theme.corner, t.theme.divider, t.theme.timeline,
       t.theme.sections, t.theme.dateStyle, t.theme.align, t.theme.capsHeadings].join("/"),
    );
    expect(new Set(shapes).size).toBe(INVITE_TEMPLATES.length);
  });

  it("несуществующий шаблон не находится", () => {
    expect(findTemplate("нет такого")).toBeNull();
    expect(findTemplate("story")?.name).toBe("История");
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

describe("обратный отсчёт", () => {
  it("считает от даты мероприятия и склоняет по-русски", async () => {
    const { renderBlocks } = await import("@/server/guest-html/invite-html");

    const block = {
      id: "b1", type: "COUNTDOWN" as const, order: 0, visible: true, degraded: false,
      content: { v: 1, title: "До свадьбы", doneText: "Сегодня!" },
    };

    const cases: [number, string][] = [
      [1, "день"],
      [2, "дня"],
      [5, "дней"],
      [11, "дней"],
      [21, "день"],
      [22, "дня"],
    ];

    for (const [days, word] of cases) {
      // Полсуток сверху, чтобы округление вниз не съедало день на границе.
      const date = new Date(Date.now() + days * 86_400_000 + 43_200_000);
      const html = renderBlocks([block], null, null, date);
      expect(html, `${days} → ${word}`).toContain(`>${days}</b><span data-word="days">${word}<`);
    }
  });

  it("в день свадьбы показывает текст вместо чисел", async () => {
    const { renderBlocks } = await import("@/server/guest-html/invite-html");
    const block = {
      id: "b1", type: "COUNTDOWN" as const, order: 0, visible: true, degraded: false,
      content: { v: 1, title: "До свадьбы", doneText: "Сегодня наш праздник!" },
    };

    const html = renderBlocks([block], null, null, new Date(Date.now() - 60_000));
    expect(html).toContain("Сегодня наш праздник!");
    expect(html).not.toContain("data-until");
  });

  it("без даты мероприятия блок молча пропускается", async () => {
    // Так бывает только там, где блок отдают в одиночку. Падать
    // приглашению нельзя ни при каких данных.
    const { renderBlocks } = await import("@/server/guest-html/invite-html");
    const block = {
      id: "b1", type: "COUNTDOWN" as const, order: 0, visible: true, degraded: false,
      content: { v: 1, title: "До свадьбы", doneText: "Сегодня!" },
    };
    expect(renderBlocks([block], null, null)).toBe("");
  });

  it("скрипт отсчёта не ходит наружу и не трогает ничего лишнего", async () => {
    const { COUNTDOWN_SCRIPT } = await import("@/server/guest-html/invite-html");
    expect(COUNTDOWN_SCRIPT).not.toContain("http");
    expect(COUNTDOWN_SCRIPT).not.toContain("fetch");
    expect(COUNTDOWN_SCRIPT).not.toContain("</script");
    // Раз в минуту, а не в секунду: секундная стрелка перерисовывает
    // страницу шестьдесят раз в минуту ради украшения.
    expect(COUNTDOWN_SCRIPT).toContain("6e4");
  });
});

describe("заставка-конверт", () => {
  it("не показывается без скрипта", async () => {
    // Разметка конверта приходит только внутри скрипта. Приди она в
    // теле страницы — телефон без JavaScript упёрся бы в картинку, за
    // которой не видно ни даты, ни адреса.
    const { invitePage } = await import("@/server/guest-html/invite-html");
    const page = invitePage({
      title: "Аня и Миша",
      theme: { ...defaultTheme(), intro: "envelope" },
      body: "<section>тело</section>",
    });

    expect(page).not.toContain('id="intro"');
    expect(page).toContain("тело");
  });

  it("скрипт заставки экранирует имена и не ходит наружу", async () => {
    const { coupleNames, inviteScript } = await import("@/server/guest-html/invite-html");
    const blocks = [
      {
        id: "b1", type: "COVER" as const, order: 0, visible: true, degraded: false,
        content: { v: 1, title: "", names: '<img src=x onerror="alert(1)">', dateText: "", subtitle: "", imageUrl: "" },
      },
    ];

    const script = inviteScript(
      blocks,
      { ...defaultTheme(), intro: "envelope" },
      coupleNames(blocks, "Аня и Миша"),
    )!;

    expect(script).toContain("intro");

    // Важно не отсутствие слова «onerror» — оно остаётся безобидным
    // текстом, — а то, что из него нельзя собрать тег: угловые скобки и
    // кавычки экранированы, а строка уходит в `innerHTML`.
    expect(script).not.toContain("<img");
    expect(script).toContain("&lt;img");
    expect(script).toContain("&quot;");
    expect(script).not.toContain("http");
    // Строка уходит в `innerHTML`, поэтому закрывающий тег скрипта внутри
    // неё разорвал бы страницу пополам.
    expect(script).not.toContain("</script");
  });

  it("без заставки и без отсчёта остаётся только плавное появление разделов", async () => {
    // Отсчёта и заставки нет — включать нечего, но скролл-переход не
    // хранит и не считает ничего, поэтому он есть всегда.
    const { inviteScript, REVEAL_SCRIPT } = await import("@/server/guest-html/invite-html");
    expect(inviteScript([], defaultTheme(), "Аня и Миша")).toBe(REVEAL_SCRIPT);
  });

  it("имена для конверта берутся с обложки, иначе из названия", async () => {
    const { coupleNames } = await import("@/server/guest-html/invite-html");
    const cover = (names: string) => [
      {
        id: "b1", type: "COVER" as const, order: 0, visible: true, degraded: false,
        content: { v: 1, title: "", names, dateText: "", subtitle: "", imageUrl: "" },
      },
    ];

    expect(coupleNames(cover("Аня и Миша"), "Свадьба")).toBe("Аня и Миша");
    expect(coupleNames(cover(""), "Свадьба")).toBe("Свадьба");
    expect(coupleNames([], "Свадьба")).toBe("Свадьба");
  });
});

describe("ботаника и украшения", () => {
  it("цветы берут цвета из темы, а не из своей палитры", async () => {
    const { floralCorner } = await import("@/server/guest-html/botanical");
    const art = floralCorner({
      petal: "#111111", petalShade: "#222222", leaf: "#333333", accent: "#444444",
    });

    for (const color of ["#111111", "#222222", "#333333", "#444444"]) {
      expect(art, color).toContain(color);
    }
  });

  it("композиция помещается в свой квадрат", async () => {
    // Иначе цветы вылезают за угол листа и обрезаются вкривь.
    const { floralCorner } = await import("@/server/guest-html/botanical");
    const art = floralCorner({ petal: "#fff", petalShade: "#eee", leaf: "#9a8", accent: "#c87" });

    const numbers = art.match(/(?:cx|cy)="(-?\d+(?:\.\d+)?)"/g) ?? [];
    expect(numbers.length).toBeGreaterThan(20);

    for (const match of numbers) {
      const value = Number(match.split('"')[1]);
      expect(value).toBeGreaterThan(-70);
      expect(value).toBeLessThan(270);
    }
  });

  it("по углам композиция рисуется один раз, а не копируется", async () => {
    const { decorMarkup } = await import("@/server/guest-html/invite-decor");

    const two = decorMarkup({ ...defaultTheme(), decor: "corners" });
    const four = decorMarkup({ ...defaultTheme(), decor: "frame" });

    // Четыре угла не имеют права весить вдвое больше двух: композиция
    // лежит в <symbol>, по углам — ссылки на неё.
    expect(four.length).toBeLessThan(two.length * 1.1);
    expect(two.match(/<symbol/g)).toHaveLength(1);
    expect(two.match(/<use /g)).toHaveLength(2);
    expect(four.match(/<use /g)).toHaveLength(4);
  });

  it("без цветов разметки нет вовсе", async () => {
    const { decorMarkup } = await import("@/server/guest-html/invite-decor");
    expect(decorMarkup(defaultTheme())).toBe("");
  });

  it("значок расписания подбирается по смыслу, а не по номеру", async () => {
    const { timelineIcon } = await import("@/server/guest-html/invite-decor");

    // Пункты переставляют и удаляют; значок, привязанный к позиции,
    // поедет вместе с ними.
    const rings = timelineIcon("Церемония бракосочетания", "#000");
    const glasses = timelineIcon("Сбор гостей и фуршет", "#000");
    const dinner = timelineIcon("Праздничный ужин", "#000");

    expect(rings).not.toBe("");
    expect(new Set([rings, glasses, dinner]).size).toBe(3);

    // Не угадали — значка нет. Это лучше, чем блюдо напротив церемонии.
    expect(timelineIcon("Сюрприз от друзей", "#000")).toBe("");
  });

  it("украшения включаются только своими осями", async () => {
    const base = inviteThemeCss(defaultTheme());

    expect(inviteThemeCss({ ...defaultTheme(), decor: "corners" })).not.toBe(base);
    expect(inviteThemeCss({ ...defaultTheme(), paper: true })).not.toBe(base);
    expect(inviteThemeCss({ ...defaultTheme(), timelineIcons: true })).not.toBe(base);

    // Вензель бессмыслен без рамки: он её угол и есть.
    expect(inviteThemeCss({ ...defaultTheme(), frameOrnament: true })).toBe(base);
    expect(inviteThemeCss({ ...defaultTheme(), frame: true, frameOrnament: true })).not.toBe(
      inviteThemeCss({ ...defaultTheme(), frame: true }),
    );
  });
});
