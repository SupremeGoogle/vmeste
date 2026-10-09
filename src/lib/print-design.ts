import { z } from "zod";
import type { Lang } from "@/lib/i18n";

export const PRINT_TEMPLATES = [
  { id: "rose", name: "Розовый сад · колонки", qrName: "Розовый сад · открытка", nameEn: "Rose garden · columns", qrNameEn: "Rose garden · card", accent: "#936c73", ink: "#3c3032", paper: "#fffdfb", art: "roses", qrArt: "qr-roses", frame: "none", layout: "grid3" },
  { id: "eucalyptus", name: "Эвкалипт · широкая сетка", qrName: "Эвкалипт · диагональ", nameEn: "Eucalyptus · wide grid", qrNameEn: "Eucalyptus · diagonal", accent: "#6f857b", ink: "#34413b", paper: "#fffefd", art: "eucalyptus", qrArt: "qr-eucalyptus", frame: "none", layout: "grid4" },
  { id: "hydrangea", name: "Гортензия · крупные списки", qrName: "Гортензия · композиция", nameEn: "Hydrangea · large lists", qrNameEn: "Hydrangea · bouquet", accent: "#8092b0", ink: "#303c53", paper: "#ffffff", art: "hydrangea", qrArt: "qr-hydrangea", frame: "none", layout: "grid2" },
  { id: "classic", name: "Классика · списки", qrName: "Бордовая лента · классика", nameEn: "Classic · lists", qrNameEn: "Burgundy ribbon · classic", accent: "#987d54", ink: "#2c2925", paper: "#fffdf8", art: "none", qrArt: "qr-ribbon", frame: "double", layout: "grid3portrait" },
  { id: "botanical", name: "Ботаника · карточки", qrName: "Ботаника · два поля", nameEn: "Botanical · cards", qrNameEn: "Botanical · two panels", accent: "#6e8060", ink: "#354032", paper: "#fbfcf8", art: "eucalyptus", qrArt: "qr-eucalyptus", frame: "thin", layout: "cards" },
  { id: "minimal", name: "Минимализм · плакат", qrName: "Лента · современный", nameEn: "Minimal · poster", qrNameEn: "Ribbon · modern", accent: "#43413f", ink: "#22211f", paper: "#ffffff", art: "none", qrArt: "qr-ribbon", frame: "none", layout: "wide" },
  { id: "deco", name: "Ар-деко · схема зала", qrName: "Золото и бордо", nameEn: "Art deco · floor plan", qrNameEn: "Gold and burgundy", accent: "#a88148", ink: "#242c35", paper: "#fffdf8", art: "none", qrArt: "qr-ribbon", frame: "deco", layout: "orbit" },
  { id: "blush", name: "Акварель · стол на лист", qrName: "Нежная акварель", nameEn: "Watercolor · one table per page", qrNameEn: "Soft watercolor", accent: "#bc8f98", ink: "#483943", paper: "#fffafa", art: "roses", qrArt: "qr-roses", frame: "thin", layout: "single" },
] as const;

export type PrintTemplateId = (typeof PRINT_TEMPLATES)[number]["id"];
export type PrintLayout = (typeof PRINT_TEMPLATES)[number]["layout"];
export type PrintMode = "seating" | "qr";
export type PrintPaper = "A4" | "A3" | "A2";

export const printElementSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["text", "table", "qr", "code"]),
  tableId: z.string().max(100).optional(),
  text: z.string().max(1000).default(""),
  x: z.number().min(0).max(100), y: z.number().min(0).max(100),
  w: z.number().min(4).max(100),
  /** Высота карточки стола в % листа: по ней подбирается кегль имён. */
  h: z.number().min(3).max(100).optional(),
  fontSize: z.number().min(6).max(110).default(22),
  align: z.enum(["left", "center", "right"]).default("center"),
  hidden: z.boolean().default(false),
  page: z.number().int().min(0).max(50).default(0),
  /** Карточка стоит там, куда её поставила раскладка, — её можно пересчитать. */
  auto: z.boolean().default(false),
});
export const printDesignSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["seating", "qr"]),
  template: z.enum(PRINT_TEMPLATES.map((item) => item.id) as [PrintTemplateId, ...PrintTemplateId[]]),
  paper: z.enum(["A4", "A3", "A2"]),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Общий множитель кегля всего листа и отдельный — для имён гостей. */
  textScale: z.number().min(0.5).max(2.5).default(1),
  guestScale: z.number().min(0.5).max(2.5).default(1),
  elements: z.array(printElementSchema).max(160),
});
export type PrintDesign = z.infer<typeof printDesignSchema>;
export type PrintElement = PrintDesign["elements"][number];
export type PrintTable = { id: string; label: string; guests: string[] };

/** Percent positions leave a white quiet zone around each scannable code. */
const QR_POSITIONS: Record<PrintTemplateId, { head: [number, number, number]; qr: [number, number, number]; caption: [number, number, number] }> = {
  rose: { head: [52, 23, 42], qr: [31, 42, 38], caption: [10, 73, 50] },
  eucalyptus: { head: [10, 17, 45], qr: [31, 40, 38], caption: [54, 77, 36] },
  hydrangea: { head: [51, 17, 42], qr: [31, 40, 38], caption: [11, 76, 43] },
  classic: { head: [16, 17, 68], qr: [33, 39, 36], caption: [19, 77, 62] },
  botanical: { head: [10, 16, 46], qr: [32, 40, 37], caption: [54, 77, 36] },
  minimal: { head: [17, 14, 66], qr: [32, 38, 38], caption: [22, 77, 56] },
  deco: { head: [17, 16, 66], qr: [48, 40, 37], caption: [15, 48, 30] },
  blush: { head: [52, 23, 42], qr: [30, 43, 40], caption: [10, 74, 50] },
};

/** Размер листа в пунктах (как у react-pdf). */
export function paperSize(paper: PrintPaper, orientation: PrintDesign["orientation"]) {
  const portrait = { A4: [595.28, 841.89], A3: [841.89, 1190.55], A2: [1190.55, 1683.78] }[paper];
  return orientation === "landscape" ? { w: portrait[1], h: portrait[0] } : { w: portrait[0], h: portrait[1] };
}

/**
 * Кегли в макете заданы «для A3»: на A4 всё мельче, на A2 крупнее. Так
 * смена формата не ломает вёрстку — лист просто масштабируется.
 */
export function pageScale(paper: PrintPaper) {
  return paper === "A4" ? 0.76 : paper === "A2" ? 1.35 : 1;
}

/**
 * Какие столы печатаются. Стола молодожёнов на плане нет: пару гости и так
 * знают в лицо, а на плакате он занимал бы лучшее место и ничего не
 * сообщал. По той же причине из списков убраны невеста и жених — и стол,
 * за которым сидят только они (президиум без свидетелей), тоже пропадает.
 */
export function printableTables(raw: Array<{
  id: string; label: string; isCouple: boolean;
  seats: Array<{ guest: { displayName: string; role: string } | null }>;
}>): PrintTable[] {
  return raw.flatMap((table) => {
    if (table.isCouple) return [];
    const everyone = table.seats.flatMap((seat) => seat.guest ? [seat.guest] : []);
    const guests = everyone.filter((guest) => guest.role === "GUEST").map((guest) => guest.displayName);
    if (everyone.length > 0 && guests.length === 0) return [];
    return [{ id: table.id, label: table.label, guests }];
  });
}

/** A wide table on its own sheet is typeset as a full-page table card. */
export function isSoloPrintTable(design: PrintDesign, element: PrintElement) {
  if (element.kind !== "table") return false;
  const layout = PRINT_TEMPLATES.find((item) => item.id === design.template)?.layout;
  return layout === "single" || element.w >= 40 && design.elements.filter((item) => item.kind === "table" && item.page === element.page && !item.hidden).length === 1;
}

type Spot = { page: number; x: number; y: number; w: number; h: number; fontSize: number };

/**
 * Поле под столы у каждой схемы своё: сверху заголовок, у цветочных шаблонов
 * по углам акварель. `ratio` — желаемая пропорция карточки (ширина к
 * высоте): списки гостей высокие, плакат — вытянутый.
 */
const AREAS: Record<Exclude<PrintLayout, "orbit" | "single">, { top: number; bottom: number; left: number; right: number; cols: number; ratio: number; gapX: number; gapY: number }> = {
  grid3: { top: 27, bottom: 95, left: 6, right: 94, cols: 3, ratio: 1.45, gapX: 2.2, gapY: 1.6 },
  grid4: { top: 29, bottom: 95, left: 4, right: 96, cols: 4, ratio: 1.7, gapX: 1.6, gapY: 1.4 },
  grid2: { top: 28, bottom: 95, left: 8, right: 92, cols: 2, ratio: 1.2, gapX: 3, gapY: 1.6 },
  grid3portrait: { top: 27, bottom: 93, left: 8, right: 92, cols: 3, ratio: 1.1, gapX: 2, gapY: 1.5 },
  cards: { top: 30, bottom: 94, left: 7, right: 93, cols: 3, ratio: 1.25, gapX: 2.4, gapY: 2 },
  wide: { top: 33, bottom: 96, left: 7, right: 93, cols: 3, ratio: 2.1, gapX: 2.6, gapY: 2.2 },
};

/**
 * Раскладка столов на листе. Колонок столько, чтобы карточка была ближе
 * всего к желаемой пропорции, но не меньше базового числа у шаблона: так
 * и 6 столов, и 24 (около 200 гостей) ложатся на один лист без наложений.
 */
export function layoutTables(count: number, templateId: PrintTemplateId, paper: PrintPaper, orientation: PrintDesign["orientation"]): Spot[] {
  const layout = PRINT_TEMPLATES.find((item) => item.id === templateId)?.layout ?? "grid3";
  const size = paperSize(paper, orientation);
  const ref = { w: size.w / pageScale(paper), h: size.h / pageScale(paper) };
  if (count === 0) return [];

  if (layout === "single") {
    return Array.from({ length: count }, (_, page) => ({ page, x: 17, y: 30, w: 66, h: 60, fontSize: 47 }));
  }

  if (layout === "orbit") {
    if (count <= 8) {
      // До восьми столов — одно кольцо вокруг «схемы зала».
      const w = clampNum(Math.min(24, 170 / count), 14, 24);
      const h = clampNum(w * (size.w / size.h) * 0.62, 9, 19);
      return Array.from({ length: count }, (_, i) => {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / count;
        const cx = 50 + 36 * Math.cos(angle);
        const cy = 60 + 29 * Math.sin(angle);
        return { page: 0, x: round(clampNum(cx - w / 2, 1, 99 - w)), y: round(clampNum(cy - h / 2, 22, 98 - h)), w: round(w), h: round(h), fontSize: round(clampNum(h * ref.h / 100 * 0.2, 10, 24)) };
      });
    }
    // Больше — столы встают по периметру листа, как вдоль стен зала:
    // верхний ряд, правая сторона, нижний ряд, левая сторона. Кольца
    // здесь не годятся — на альбомном листе они налезают друг на друга.
    const top = 24, bottom = 97, left = 3, right = 97, gap = 1.2;
    let best = { c: 3, r: 3, score: Infinity };
    for (let c = 3; c <= 10; c++) {
      for (let r = 3; r <= 9; r++) {
        const capacity = 2 * c + 2 * (r - 2);
        if (capacity < count) continue;
        const cellW = ((right - left) - gap * (c - 1)) / c / 100 * ref.w;
        const cellH = ((bottom - top) - gap * (r - 1)) / r / 100 * ref.h;
        const score = Math.abs(Math.log(cellW / cellH / 1.35)) + (capacity - count) * 0.35;
        if (score < best.score) best = { c, r, score };
      }
    }
    const { c, r } = best;
    const w = ((right - left) - gap * (c - 1)) / c;
    const h = ((bottom - top) - gap * (r - 1)) / r;
    const cell = (col: number, row: number) => ({ x: left + col * (w + gap), y: top + row * (h + gap) });
    const ring = [
      ...Array.from({ length: c }, (_, i) => cell(i, 0)),
      ...Array.from({ length: r - 2 }, (_, i) => cell(c - 1, i + 1)),
      ...Array.from({ length: c }, (_, i) => cell(c - 1 - i, r - 1)),
      ...Array.from({ length: r - 2 }, (_, i) => cell(0, r - 2 - i)),
    ];
    // Лишние ячейки убираем равномерно, а не хвостом: иначе пустой
    // оказалась бы вся левая стена.
    const spare = ring.length - count;
    const skip = new Set(Array.from({ length: spare }, (_, i) => Math.floor((i + 0.5) * ring.length / spare)));
    const fontSize = round(clampNum(h * ref.h / 100 * 0.16, 10, 22));
    return ring.filter((_, i) => !skip.has(i)).map((spot) => ({ page: 0, x: round(spot.x), y: round(spot.y), w: round(w), h: round(h), fontSize }));
  }

  const area = AREAS[layout];
  const areaW = area.right - area.left;
  const areaH = area.bottom - area.top;
  let best = { cols: area.cols, score: Infinity };
  for (let cols = Math.min(area.cols, count); cols <= Math.max(area.cols, 8); cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (areaW - area.gapX * (cols - 1)) / cols / 100 * ref.w;
    const cellH = (areaH - area.gapY * (rows - 1)) / rows / 100 * ref.h;
    // Карточки не должны быть слишком низкими (имена не влезут) или узкими:
    // ниже ~120 пт на A3 десять имён становятся мельче семи пунктов.
    const score = Math.abs(Math.log(cellW / cellH / area.ratio))
      + (cols < area.cols && count >= area.cols ? 10 : 0)
      + Math.max(0, 120 - cellH) / 25;
    if (score < best.score) best = { cols, score };
  }
  const cols = best.cols;
  const rows = Math.ceil(count / cols);
  const w = (areaW - area.gapX * (cols - 1)) / cols;
  const h = (areaH - area.gapY * (rows - 1)) / rows;
  const fontSize = round(clampNum(h * ref.h / 100 * 0.17, 12, 30));
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    // Последний неполный ряд центрируется, а не прижимается влево.
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const shift = (cols - inRow) * (w + area.gapX) / 2;
    return { page: 0, x: round(area.left + shift + col * (w + area.gapX)), y: round(area.top + row * (h + area.gapY)), w: round(w), h: round(h), fontSize };
  });
}

/**
 * Кегль имён в карточке стола (в пунктах «для A3», до `pageScale`).
 * Считается из высоты карточки и числа гостей, поэтому и 6, и 14 человек
 * за столом помещаются без обрезки, а по ширине — из самого длинного
 * имени (`longest`, в символах), чтобы «Маргарита Нурланова» не вылезла
 * за край. `guestScale` — ручная поправка поверх.
 */
export function guestFontSize(design: PrintDesign, element: PrintElement, guests: number, solo: boolean, longest = 16): number {
  const layout = PRINT_TEMPLATES.find((item) => item.id === design.template)?.layout;
  const size = paperSize(design.paper, design.orientation);
  const h = element.h ?? (solo ? 43 : 19);
  const heightRef = h / 100 * size.h / pageScale(design.paper);
  const title = element.fontSize * design.textScale;
  const orbit = layout === "orbit" && !solo;
  const lines = Math.max(orbit ? Math.ceil(guests / 2) : guests, 1);
  // В «схеме зала» название стоит в кружке над списком, имена — в две колонки.
  const available = orbit ? heightRef - title * 1.9 - 8 : heightRef - title * 1.35 - (["cards", "single"].includes(layout ?? "") || solo ? 18 : 6);
  const fit = available / (lines * (solo ? 1.35 : 1.18));
  // Ширина колонки имён; 0,47 em — средняя ширина буквы у Cormorant.
  const widthRef = element.w / 100 * size.w / pageScale(design.paper) * (orbit ? 0.47 : 0.92) - (solo ? 48 : orbit ? 0 : 8);
  const byWidth = widthRef / (Math.max(longest, 8) * 0.47);
  return round(clampNum(Math.min(fit, byWidth, solo ? 19 : 15), 5, 40) * design.guestScale);
}

/**
 * Подписи макета по умолчанию — на языке мероприятия: лист печатают и
 * читают гости, а не организатор.
 */
function defaultTexts(lang: Lang) {
  return lang === "en"
    ? { welcome: "WELCOME", seating: "SEATING CHART", caption: "Point your phone camera here to open the celebration", code: "ACCESS CODE" }
    : { welcome: "ДОБРО ПОЖАЛОВАТЬ", seating: "ПЛАН РАССАДКИ ГОСТЕЙ", caption: "Наведите камеру телефона, чтобы открыть праздник", code: "КОД ДОСТУПА" };
}

export function defaultPrintDesign(mode: PrintMode, templateId: PrintTemplateId, title: string, date: string, tables: PrintTable[] = [], lang: Lang = "ru"): PrintDesign {
  const theme = PRINT_TEMPLATES.find((item) => item.id === templateId) ?? PRINT_TEMPLATES[0];
  const texts = defaultTexts(lang);
  if (mode === "qr") {
    const spot = QR_POSITIONS[theme.id];
    const [hx, hy, hw] = spot.head;
    const from = (id: string, kind: PrintElement["kind"], text: string, [x, y, w]: [number, number, number], fontSize: number): PrintElement => ({ id, kind, text, x, y, w, fontSize, align: "center", hidden: false, page: 0, auto: false });
    return { version: 1, mode, template: theme.id, paper: "A4", orientation: "portrait", accent: theme.accent, ink: theme.ink, textScale: 1, guestScale: 1, elements: [
      from("eyebrow", "text", texts.welcome, [hx, hy - 6, hw], 13),
      from("title", "text", title, [hx, hy, hw], 42),
      from("date", "text", date, [hx + 10, hy + 9, hw - 20], 14),
      from("qr", "qr", "", spot.qr, 20),
      from("qr-caption", "text", texts.caption, spot.caption, 17),
    ] };
  }
  const isWide = ["rose", "eucalyptus", "minimal", "deco"].includes(theme.id);
  const headingY = theme.layout === "single" ? 14 : theme.layout === "wide" || theme.layout === "orbit" ? 11 : 13;
  const common: PrintElement[] = [
    { id: "eyebrow", kind: "text", text: texts.seating, x: 15, y: headingY - 4, w: 70, fontSize: 13, align: "center", hidden: false, page: 0, auto: false },
    { id: "title", kind: "text", text: title, x: 10, y: headingY, w: 80, fontSize: 42, align: "center", hidden: false, page: 0, auto: false },
    { id: "date", kind: "text", text: date, x: 20, y: headingY + 8, w: 60, fontSize: 14, align: "center", hidden: false, page: 0, auto: false },
  ];
  const paper: PrintPaper = mode === "seating" ? theme.layout === "single" ? "A4" : "A3" : "A4";
  const orientation = mode === "seating" && isWide ? "landscape" : "portrait";
  const spots = mode === "seating" ? layoutTables(tables.length, theme.id, paper, orientation) : [];
  const elements: PrintElement[] = mode === "seating" ? [
    ...common,
    ...tables.map((table, index) => ({ id: `table:${table.id}`, kind: "table" as const, tableId: table.id, text: table.label, ...spots[index], align: "center" as const, hidden: false, auto: true })),
  ] : [
    ...common,
    { id: "qr", kind: "qr", text: "", x: ["eucalyptus", "botanical"].includes(theme.id) ? 12 : ["hydrangea", "deco"].includes(theme.id) ? 55 : 31, y: theme.layout === "single" ? 42 : 38, w: ["eucalyptus", "botanical", "hydrangea", "deco"].includes(theme.id) ? 33 : 38, fontSize: 20, align: "center", hidden: false, page: 0, auto: false },
    { id: "qr-caption", kind: "text", text: texts.caption, x: ["eucalyptus", "botanical"].includes(theme.id) ? 53 : ["hydrangea", "deco"].includes(theme.id) ? 10 : 15, y: ["eucalyptus", "botanical", "hydrangea", "deco"].includes(theme.id) ? 47 : 77, w: ["eucalyptus", "botanical", "hydrangea", "deco"].includes(theme.id) ? 36 : 70, fontSize: 17, align: "center", hidden: false, page: 0, auto: false },
    { id: "code", kind: "code", text: texts.code, x: ["eucalyptus", "botanical"].includes(theme.id) ? 52 : ["hydrangea", "deco"].includes(theme.id) ? 11 : 25, y: ["eucalyptus", "botanical", "hydrangea", "deco"].includes(theme.id) ? 62 : 85, w: ["eucalyptus", "botanical", "hydrangea", "deco"].includes(theme.id) ? 37 : 50, fontSize: 23, align: "center", hidden: false, page: 0, auto: false },
  ];
  return { version: 1, mode, template: theme.id, paper, orientation, accent: theme.accent, ink: theme.ink, textScale: 1, guestScale: 1, elements };
}

/**
 * Пересчитать раскладку столов под текущие формат и ориентацию — те
 * карточки, которые организатор не двигал руками.
 */
export function relayoutTables(design: PrintDesign): PrintDesign {
  const auto = design.elements.filter((element) => element.kind === "table" && element.auto);
  const spots = layoutTables(auto.length, design.template, design.paper, design.orientation);
  const byId = new Map(auto.map((element, index) => [element.id, spots[index]]));
  return { ...design, elements: design.elements.map((element) => byId.has(element.id) ? { ...element, ...byId.get(element.id)! } : element) };
}

/** New tables appear on the print sheet without replacing saved typography or positions. */
export function reconcilePrintDesign(saved: unknown, mode: PrintMode, title: string, date: string, tables: PrintTable[], lang: Lang = "ru"): PrintDesign {
  const parsed = printDesignSchema.safeParse(saved);
  if (!parsed.success || parsed.data.mode !== mode) return defaultPrintDesign(mode, mode === "qr" ? "classic" : "rose", title, date, tables, lang);
  const design = parsed.data;
  // QR ведёт прямо на праздник — код доступа гостю не нужен, убираем его и из старых макетов.
  if (mode === "qr") return { ...design, elements: design.elements.filter((element) => element.kind !== "code") };
  const tableIds = new Set(tables.map((table) => table.id));
  const elements = design.elements.filter((element) => element.kind !== "table" || element.tableId && tableIds.has(element.tableId));
  const known = new Set(elements.filter((element) => element.kind === "table").map((element) => element.tableId));
  const fresh = tables.filter((table) => !known.has(table.id));
  if (fresh.length === 0) return { ...design, elements };

  const manual = elements.some((element) => element.kind === "table" && !element.auto);
  if (!manual) {
    // Все карточки стоят «по раскладке» — новые столы просто встают в
    // общую сетку, и лист пересчитывается целиком.
    const added = fresh.map((table): PrintElement => ({ id: `table:${table.id}`, kind: "table", tableId: table.id, text: table.label, page: 0, x: 0, y: 0, w: 20, h: 15, fontSize: 26, align: "center", hidden: false, auto: true }));
    return relayoutTables({ ...design, elements: [...elements, ...added] });
  }
  // Организатор уже расставлял столы руками — его вёрстку не трогаем,
  // новые столы уходят на отдельный лист своей сеткой.
  const page = Math.max(0, ...elements.map((element) => element.page)) + 1;
  const spots = layoutTables(fresh.length, design.template, design.paper, design.orientation);
  for (const [index, table] of fresh.entries()) {
    elements.push({ id: `table:${table.id}`, kind: "table", tableId: table.id, text: table.label, ...spots[index], page: page + spots[index].page, align: "center", hidden: false, auto: false });
  }
  return { ...design, elements };
}

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function round(n: number) {
  return Math.round(n * 10) / 10;
}
