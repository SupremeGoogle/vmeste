import { describe, expect, it } from "vitest";
import { isSearchable, nameTokens, normalizeName } from "@/lib/name-normalize";

describe("normalizeName", () => {
  it("приводит регистр и убирает лишние пробелы", () => {
    expect(normalizeName("  Анастасия   ПЕТРОВА ")).toBe("анастасия петрова");
  });

  it("схлопывает ё и е", () => {
    expect(normalizeName("Артём")).toBe(normalizeName("Артем"));
    expect(normalizeName("Фёдор")).toBe("федор");
  });

  it("чинит украинскую i и латинские двойники", () => {
    expect(normalizeName("Анастасiя")).toBe("анастасия");
    expect(normalizeName("Aнастасия")).toBe("анастасия"); // латинская A в начале
  });

  it("транслитерирует полностью латинское написание", () => {
    expect(normalizeName("Anastasiya")).toBe("анастасия");
    expect(normalizeName("Dmitry")).toBe(normalizeName("Дмитрий"));
  });

  it("разбивает двойные фамилии по дефису", () => {
    expect(normalizeName("Петрова-Иванова")).toBe("петрова иванова");
  });

  it("выбрасывает пунктуацию", () => {
    expect(normalizeName("Иванов, Иван!")).toBe("иванов иван");
  });
});

describe("nameTokens", () => {
  it("возвращает слова длиннее одной буквы", () => {
    expect(nameTokens("Иванов И. И.")).toEqual(["иванов"]);
  });
});

describe("isSearchable", () => {
  it("отсекает пустой и односимвольный ввод", () => {
    expect(isSearchable("")).toBe(false);
    expect(isSearchable("а")).toBe(false);
    expect(isSearchable("ан")).toBe(true);
  });
});
