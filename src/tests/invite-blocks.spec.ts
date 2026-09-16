/**
 * Схемы блоков приглашения и разбор форм конструктора.
 *
 * Тесты без базы: здесь проверяется ровно то, ради чего заведена схема —
 * что мусор не попадёт в БД на записи и что мусор, уже лежащий в БД,
 * не уронит гостю страницу на чтении.
 */
import { describe, expect, it } from "vitest";
import {
  BLOCK_ORDER, defaultContent, parseBlockContent, readBlockContent,
} from "@/lib/invite-blocks";
import {
  blockContentFromForm, parsePalette, parseTimelineText, timelineToText,
} from "@/server/services/invite-forms";
import { toCsv } from "@/server/services/csv-export";

function form(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("схемы содержимого блоков", () => {
  it("у каждого типа блока есть содержимое по умолчанию", () => {
    for (const type of BLOCK_ORDER) {
      expect(() => defaultContent(type)).not.toThrow();
    }
  });

  it("на записи отвергает javascript: в ссылке на обложке", () => {
    const result = parseBlockContent("COVER", { imageUrl: "javascript:alert(1)" });
    expect(result.ok).toBe(false);
  });

  it("на записи отвергает цвет, который не цвет", () => {
    const result = parseBlockContent("DRESSCODE", { palette: ["url(evil)"] });
    expect(result.ok).toBe(false);
  });

  it("пустая ссылка на обложке допустима — фотографии может не быть", () => {
    const result = parseBlockContent("COVER", { imageUrl: "" });
    expect(result.ok).toBe(true);
  });
});

describe("чтение испорченного содержимого", () => {
  it("не бросает на постороннем JSON и подставляет умолчания", () => {
    const { content, degraded } = readBlockContent("COVER", { title: 42, imageUrl: "javascript:x" });
    expect(degraded).toBe(true);
    expect(content.title).toBe(defaultContent("COVER").title);
    expect(content.imageUrl).toBe("");
  });

  it("сохраняет то, что уцелело, а не откатывает блок целиком", () => {
    const { content, degraded } = readBlockContent("VENUE", {
      title: "Где",
      name: "Усадьба",
      address: { корпус: 2 }, // лишний объект вместо строки
    });
    expect(degraded).toBe(true);
    expect(content.name).toBe("Усадьба");
    expect(content.address).toBe("");
  });

  it("не спотыкается на null и массиве вместо объекта", () => {
    expect(readBlockContent("TEXT", null).content.text).toBe("");
    expect(readBlockContent("TEXT", ["текст"]).content.text).toBe("");
  });
});

describe("тайминг из текста", () => {
  it("разбирает строки «время | пункт | уточнение»", () => {
    const items = parseTimelineText("16:00 | Сбор гостей | у входа\n17:00 | Церемония");
    expect(items).toEqual([
      { time: "16:00", title: "Сбор гостей", note: "у входа" },
      { time: "17:00", title: "Церемония", note: "" },
    ]);
  });

  it("строку без разделителя считает пунктом без времени, а не временем без пункта", () => {
    expect(parseTimelineText("Первый танец")).toEqual([
      { time: "", title: "Первый танец", note: "" },
    ]);
  });

  it("переживает круговой обход текст → структура → текст", () => {
    const text = "16:00 | Сбор гостей | у входа\n17:00 | Церемония";
    expect(timelineToText(parseTimelineText(text))).toBe(text);
  });

  it("пропускает пустые строки — их оставляют при копировании из переписки", () => {
    expect(parseTimelineText("\n16:00 | Сбор\n\n\n")).toHaveLength(1);
  });
});

describe("палитра дресс-кода", () => {
  it("добавляет решётку, если её забыли", () => {
    expect(parsePalette("c8b7a6, #6b705c")).toEqual(["#c8b7a6", "#6b705c"]);
  });
});

describe("форма конструктора", () => {
  it("собирает блок тайминга из textarea", () => {
    const result = blockContentFromForm("TIMELINE", form({
      title: "План дня",
      items: "16:00 | Сбор",
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content).toMatchObject({ title: "План дня" });
    }
  });

  it("возвращает понятную ошибку вместо записи мусора", () => {
    const result = blockContentFromForm("MAP", form({ yandexUrl: "не ссылка" }));
    expect(result.ok).toBe(false);
    // Сообщение читает организатор, а не разработчик: поле названо
    // по-человечески, текст — по-русски.
    if (!result.ok) {
      expect(result.message).toContain("Ссылка на Яндекс Карты");
      expect(result.message).toMatch(/[а-яё]/i);
    }
  });
});

describe("выгрузка CSV", () => {
  it("экранирует значение, которое Excel принял бы за формулу", () => {
    const csv = toCsv(["Гость"], [["=1+1"]]);
    expect(csv).toContain("'=1+1");
  });

  it("ставит BOM и разделитель «;» — иначе Excel сломает кириллицу", () => {
    const csv = toCsv(["Гость", "Ответ"], [["Анна", "придёт"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Анна;придёт");
  });

  it("заключает в кавычки значение с точкой с запятой внутри", () => {
    expect(toCsv(["a"], [["мясо; рыба"]])).toContain('"мясо; рыба"');
  });
});
