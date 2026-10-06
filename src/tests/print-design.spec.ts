import { describe, expect, it } from "vitest";
import {
  guestFontSize, isSoloPrintTable, layoutTables, PRINT_TEMPLATES, defaultPrintDesign, printDesignSchema,
  printableTables, reconcilePrintDesign, relayoutTables, type PrintElement, type PrintTable,
} from "@/lib/print-design";

const makeTables = (count: number, perTable: number): PrintTable[] => Array.from({ length: count }, (_, i) => ({
  id: `t${i}`, label: `Стол ${i + 1}`, guests: Array.from({ length: perTable }, (_, g) => `Гость ${i * perTable + g + 1}`),
}));
const tables = makeTables(11, 2);

const overlaps = (a: PrintElement, b: PrintElement) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + (b.h ?? 0) && b.y < a.y + (a.h ?? 0);

describe("печатные макеты", () => {
  it("имеют восемь разных схем размещения столов", () => {
    const layouts = new Set<string>();
    for (const template of PRINT_TEMPLATES) {
      const design = defaultPrintDesign("seating", template.id, "Анна и Михаил", "24 июня", tables);
      expect(printDesignSchema.safeParse(design).success).toBe(true);
      const cards = design.elements.filter((element) => element.kind === "table");
      expect(cards).toHaveLength(tables.length);
      layouts.add(JSON.stringify({ orientation: design.orientation, paper: design.paper, spots: cards.slice(0, 6).map((card) => [card.x, card.y, card.w, card.page]) }));
    }
    expect(layouts.size).toBe(8);
  });

  // Главное требование: 150 гостей и больше — на одном листе в каждом
  // шаблоне, кроме «стол на лист», где один стол на странице задуман.
  for (const [count, perTable] of [[16, 10], [19, 8], [24, 8]] as const) {
    it(`${count} столов по ${perTable} (${count * perTable} гостей) ложатся без наложений во всех шаблонах`, () => {
      const many = makeTables(count, perTable);
      for (const template of PRINT_TEMPLATES) {
        const design = defaultPrintDesign("seating", template.id, "Анна и Михаил", "24 июня", many);
        expect(printDesignSchema.safeParse(design).success, template.id).toBe(true);
        const cards = design.elements.filter((element) => element.kind === "table");
        expect(cards, template.id).toHaveLength(count);

        if (template.layout === "single") {
          expect(new Set(cards.map((card) => card.page)).size).toBe(count);
          continue;
        }
        for (const card of cards) {
          expect(card.page, template.id).toBe(0);
          expect(card.x + card.w, `${template.id}: ${card.text} за правым краем`).toBeLessThanOrEqual(100);
          expect(card.y + (card.h ?? 0), `${template.id}: ${card.text} за нижним краем`).toBeLessThanOrEqual(100);
          // Имена остаются читаемыми на печати: не мельче 7 пт на A3.
          expect(guestFontSize(design, card, perTable, false), `${template.id}: мелкие имена`).toBeGreaterThanOrEqual(7);
        }
        for (let i = 0; i < cards.length; i++) {
          for (let j = i + 1; j < cards.length; j++) {
            expect(overlaps(cards[i], cards[j]), `${template.id}: ${cards[i].text} и ${cards[j].text}`).toBe(false);
          }
        }
        // Заголовок листа столы не перекрывают.
        const title = design.elements.find((element) => element.id === "date")!;
        expect(Math.min(...cards.map((card) => card.y)), template.id).toBeGreaterThan(title.y + 3);
      }
    });
  }

  it("кегль имён подстраивается под число гостей и ручную поправку", () => {
    const design = defaultPrintDesign("seating", "rose", "А и М", "1 мая", makeTables(19, 8));
    const card = design.elements.find((element) => element.kind === "table")!;
    const few = guestFontSize(design, card, 4, false);
    const lots = guestFontSize(design, card, 14, false);
    expect(few).toBeGreaterThan(lots);
    expect(guestFontSize({ ...design, guestScale: 1.5 }, card, 8, false)).toBeCloseTo(guestFontSize(design, card, 8, false) * 1.5, 0);
  });

  it("смена формата пересчитывает столы, которые не двигали руками", () => {
    const design = defaultPrintDesign("seating", "classic", "А и М", "1 мая", makeTables(19, 8));
    const moved = { ...design, elements: design.elements.map((element) => element.tableId === "t0" ? { ...element, x: 1, y: 90, auto: false } : element) };
    const landscape = relayoutTables({ ...moved, orientation: "landscape" });
    expect(landscape.elements.find((element) => element.tableId === "t0")).toMatchObject({ x: 1, y: 90 });
    expect(landscape.elements.find((element) => element.tableId === "t1")).not.toMatchObject(
      { x: design.elements.find((element) => element.tableId === "t1")!.x, y: design.elements.find((element) => element.tableId === "t1")!.y },
    );
  });

  it("новые столы встают в общую сетку, если руками ничего не двигали", () => {
    const saved = defaultPrintDesign("seating", "hydrangea", "Анна и Михаил", "24 июня", tables.slice(0, 2));
    const next = reconcilePrintDesign(saved, "seating", "Анна и Михаил", "24 июня", [tables[0], tables[2]]);
    const cards = next.elements.filter((element) => element.kind === "table");
    expect(cards.map((card) => card.tableId)).toEqual(["t0", "t2"]);
    expect(cards.every((card) => card.page === 0 && card.auto)).toBe(true);
  });

  it("ручные правки сохраняются, а новые столы уходят на отдельный лист", () => {
    const saved = defaultPrintDesign("seating", "hydrangea", "Анна и Михаил", "24 июня", tables.slice(0, 2));
    const edited = { ...saved, elements: saved.elements.map((element) => element.tableId === "t0" ? { ...element, x: 64, hidden: true, auto: false } : element) };
    const next = reconcilePrintDesign(edited, "seating", "Анна и Михаил", "24 июня", [tables[0], tables[2]]);
    expect(next.elements.find((element) => element.tableId === "t0")).toMatchObject({ x: 64, hidden: true });
    expect(next.elements.some((element) => element.tableId === "t1")).toBe(false);
    expect(next.elements.find((element) => element.tableId === "t2")).toMatchObject({ page: 1 });
  });

  it("QR-шаблоны без кода доступа и с разными композициями", () => {
    const spots = new Set<string>();
    for (const template of PRINT_TEMPLATES) {
      const design = defaultPrintDesign("qr", template.id, "Анна и Михаил", "24 июня");
      expect(printDesignSchema.safeParse(design).success).toBe(true);
      const qr = design.elements.find((element) => element.kind === "qr");
      const code = design.elements.find((element) => element.kind === "code");
      expect(qr).toBeDefined(); expect(code).toBeUndefined();
      spots.add(`${qr?.x}:${qr?.y}`);
    }
    expect(spots.size).toBeGreaterThanOrEqual(3);
  });

  it("переносит один стол на отдельный лист с крупной карточкой", () => {
    const design = defaultPrintDesign("seating", "deco", "Анна и Михаил", "24 июня", tables.slice(0, 3));
    const table = design.elements.find((element) => element.tableId === "t0");
    expect(table).toBeDefined();
    Object.assign(table!, { page: 1, x: 17, y: 37, w: 66, fontSize: 40 });
    expect(printDesignSchema.safeParse(design).success).toBe(true);
    expect(isSoloPrintTable(design, table!)).toBe(true);
    expect(design.elements.filter((element) => element.kind === "table" && element.page === 0)).toHaveLength(2);
  });

  it("старый макет без новых полей читается", () => {
    const legacy = { version: 1, mode: "seating", template: "rose", paper: "A3", orientation: "landscape", accent: "#936c73", ink: "#3c3032", elements: [{ id: "t", kind: "text", text: "x", x: 1, y: 1, w: 20 }] };
    const parsed = printDesignSchema.parse(legacy);
    expect(parsed).toMatchObject({ textScale: 1, guestScale: 1 });
    expect(parsed.elements[0].auto).toBe(false);
  });

  it("раскладка пустого списка — пустая", () => {
    expect(layoutTables(0, "rose", "A3", "landscape")).toEqual([]);
  });
});

describe("какие столы печатаются", () => {
  const guest = (displayName: string, role = "GUEST") => ({ guest: { displayName, role } });

  it("без стола молодожёнов и без невесты с женихом", () => {
    const result = printableTables([
      { id: "c", label: "Стол молодожёнов", isCouple: true, seats: [guest("Анна", "BRIDE"), guest("Михаил", "GROOM")] },
      { id: "p", label: "Президиум", isCouple: false, seats: [{ guest: null }, guest("Анна", "BRIDE"), guest("Михаил", "GROOM"), { guest: null }] },
      { id: "w", label: "Свидетели", isCouple: false, seats: [guest("Анна", "BRIDE"), guest("Ольга")] },
      { id: "e", label: "Пустой", isCouple: false, seats: [{ guest: null }] },
    ]);
    expect(result).toEqual([
      { id: "w", label: "Свидетели", guests: ["Ольга"] },
      { id: "e", label: "Пустой", guests: [] },
    ]);
  });
});
