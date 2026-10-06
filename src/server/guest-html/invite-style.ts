/**
 * Свои цвета и шрифты в любом шаблоне (docs/template-standard.md, §4).
 *
 * Шаблоны пишут цвета прямо в своих стилях, и переводить двадцать с лишним
 * таблиц стилей на переменные — долго и хрупко. Поэтому оформление меняется
 * на выдаче, поверх готовой страницы:
 *
 *  — **тон**. Главный цвет шаблона — самый частый насыщенный цвет страницы.
 *    Пара выбирает свой, и все насыщенные цвета шаблона поворачиваются к
 *    нему по оттенку, сохраняя светлоту: тени, светлые подложки и тёмный
 *    текст остаются в тех же соотношениях, гамма — цельной. Бежевые, белые,
 *    чёрные (почти серые) цвета и фотографии не трогаются;
 *
 *  — **шрифты**. Каждый шрифт шаблона можно заменить на один из подобранных
 *    (все с кириллицей). Замена — по имени семейства в стилях, новый шрифт
 *    подключается из Google Fonts.
 *
 * В страницу редактора кладётся `<meta name="vm-style">` с исходным главным
 * цветом и шрифтами шаблона — по ним панель «Оформление» строит выбор.
 */
import fs from "node:fs";
import path from "node:path";
import type { InviteTheme } from "@/lib/invite-theme";

/** Шрифты на выбор: все с кириллицей. */
export const FONT_CHOICES = [
  { family: "Cormorant Garamond", kind: "Антиква" },
  { family: "Playfair Display", kind: "Антиква" },
  { family: "Lora", kind: "Антиква" },
  { family: "PT Serif", kind: "Антиква" },
  { family: "Prata", kind: "Антиква" },
  { family: "Forum", kind: "Антиква" },
  { family: "Old Standard TT", kind: "Антиква" },
  { family: "Marck Script", kind: "Рукописный" },
  { family: "Bad Script", kind: "Рукописный" },
  { family: "Caveat", kind: "Рукописный" },
  { family: "Lobster", kind: "Рукописный" },
  { family: "Montserrat", kind: "Гротеск" },
  { family: "Raleway", kind: "Гротеск" },
  { family: "Manrope", kind: "Гротеск" },
  { family: "Inter", kind: "Гротеск" },
  { family: "Open Sans", kind: "Гротеск" },
  { family: "Comfortaa", kind: "Гротеск" },
  { family: "Philosopher", kind: "Гротеск" },
] as const;

const FONT_FAMILIES = new Set<string>(FONT_CHOICES.map((font) => font.family));

export function isFontChoice(family: string): boolean {
  return FONT_FAMILIES.has(family);
}

type Hsl = { h: number; s: number; l: number };

function hexToRgb(hex: string): [number, number, number] {
  const full = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1, 7);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { h: h * 60, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0")).join("");
}

/**
 * Цвет «с характером»: не бежевый, не белый, не чёрный. Очень светлые
 * оттенки (бумага, подложки) не трогаем: повёрнутые, они спорят с
 * фотографиями — розовая бумага становилась мятной.
 */
function isAccented(hsl: Hsl): boolean {
  return hsl.s >= 0.22 && hsl.l > 0.08 && hsl.l < 0.85;
}

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

/** Главный цвет страницы — самый частый насыщенный. */
export function dominantAccent(html: string): string | null {
  const counts = new Map<string, number>();
  for (const match of html.match(HEX) ?? []) {
    const hex = match.length === 4 ? `#${match.slice(1).split("").map((c) => c + c).join("")}`.toLowerCase() : match.toLowerCase();
    if (!isAccented(rgbToHsl(...hexToRgb(hex)))) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [hex, count] of counts) if (count > max) { best = hex; max = count; }
  return best;
}

/** Повернуть насыщенные цвета страницы от `from` к `to`. */
export function recolor(html: string, from: string, to: string): string {
  const base = rgbToHsl(...hexToRgb(from));
  const target = rgbToHsl(...hexToRgb(to));
  const dh = target.h - base.h;
  const ds = base.s > 0 ? target.s / base.s : 1;
  const shift = (hsl: Hsl): Hsl | null => {
    if (!isAccented(hsl)) return null;
    // Светлота своя у каждого цвета — на ней держится контраст текста.
    // Самый главный цвет берёт и светлоту выбранного, чтобы он совпал точно.
    return { h: (hsl.h + dh + 360) % 360, s: Math.max(0, Math.min(1, hsl.s * ds)), l: hsl.l };
  };
  const exact = from.toLowerCase();
  let out = html.replace(HEX, (match) => {
    const hex = match.length === 4 ? `#${match.slice(1).split("").map((c) => c + c).join("")}` : match;
    if (hex.toLowerCase() === exact) return to;
    const next = shift(rgbToHsl(...hexToRgb(hex)));
    return next ? hslToHex(next) : match;
  });
  out = out.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)/g, (match, r, g, b, alpha) => {
    const next = shift(rgbToHsl(Number(r), Number(g), Number(b)));
    if (!next) return match;
    const [nr, ng, nb] = hexToRgb(hslToHex(next));
    return alpha ? `rgba(${nr},${ng},${nb}${alpha})` : `rgb(${nr},${ng},${nb})`;
  });
  return out;
}

const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial", "-apple-system", "blinkmacsystemfont", "ui-serif", "ui-sans-serif"]);

/** Шрифты шаблона: из подключения Google Fonts и первых имён в стеках. */
export function detectFonts(html: string): string[] {
  const found: string[] = [];
  const add = (name: string) => {
    const clean = name.trim().replace(/^['"]|['"]$/g, "").trim();
    if (!clean || clean.startsWith("var(") || GENERIC.has(clean.toLowerCase())) return;
    if (!found.includes(clean)) found.push(clean);
  };
  for (const link of html.match(/fonts\.googleapis\.com\/css2\?[^"']+/g) ?? []) {
    for (const family of link.match(/family=([^&:"']+)/g) ?? []) add(decodeURIComponent(family.slice(7).replace(/\+/g, " ")));
  }
  for (const match of html.matchAll(/font-family:\s*([^;}"]+)/g)) add(match[1].split(",")[0]);
  for (const match of html.matchAll(/--[a-z-]*(?:serif|sans|script|font|display|body|heading)[a-z-]*:\s*([^;}]+)/g)) add(match[1].split(",")[0]);
  return found.slice(0, 8);
}

const stylesheetCache = new Map<string, string>();

/** Встроить `<link rel="stylesheet" href="/media/invite-…/x.css">` в страницу. */
function inlineTemplateStylesheets(html: string): string {
  return html.replace(/<link rel="stylesheet" href="(\/media\/invite-[a-z0-9-]+\/[a-z0-9-]+\.css)">/g, (tag, href: string) => {
    let css = stylesheetCache.get(href);
    if (css === undefined) {
      try {
        const dir = href.slice(0, href.lastIndexOf("/") + 1);
        css = fs.readFileSync(path.join(process.cwd(), "public", href), "utf8")
          // Относительные адреса картинок и шрифтов — от папки файла, а не от страницы.
          .replace(/url\((['"]?)(?!data:|https?:|\/)([^'")]+)\1\)/g, (_m, quote: string, url: string) => `url(${quote}${dir}${url}${quote})`)
          .replace(/<\/style/gi, "<\\/style");
      } catch {
        css = "";
      }
      stylesheetCache.set(href, css);
    }
    return css ? `<style>${css}</style>` : tag;
  });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Заменить шрифты по имени семейства и подключить новые. */
export function refont(html: string, map: Record<string, string>): string {
  let out = html;
  const used: string[] = [];
  for (const [from, to] of Object.entries(map)) {
    if (!to || from === to || !isFontChoice(to)) continue;
    used.push(to);
    const name = escapeRegExp(from);
    out = out.replace(new RegExp(`(['"])${name}\\1`, "g"), `'${to}'`);
    out = out.replace(new RegExp(`(font-family:\\s*|--[a-z-]+:\\s*|,\\s*)${name}(?=\\s*[,;}])`, "g"), `$1'${to}'`);
  }
  if (!used.length) return out;
  const families = [...new Set(used)].map((family) => `family=${family.replace(/ /g, "+")}:ital,wght@0,400;0,600;1,400`).join("&");
  const link = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&subset=cyrillic&display=swap">`;
  return out.replace("</head>", `${link}</head>`);
}

/**
 * Оформление пары поверх готовой страницы. `editor` — добавить в страницу
 * исходный главный цвет и шрифты шаблона для панели «Оформление».
 */
export function styleDocument(html: string, theme: InviteTheme | undefined, editor = false): string {
  const style = theme?.style;
  const custom = Boolean(style?.accent || (style?.fonts && Object.keys(style.fonts).length));
  // Свои стили шаблона из файлов (wedwed) — внутрь страницы, иначе замена
  // цвета и шрифта их не увидит. Только когда оформление и правда своё.
  const source = custom || editor ? inlineTemplateStylesheets(html) : html;
  const accent = dominantAccent(source);
  const fonts = detectFonts(source);
  let out = custom ? source : html;
  if (style?.accent && accent && style.accent.toLowerCase() !== accent) out = recolor(out, accent, style.accent);
  if (style?.fonts && Object.keys(style.fonts).length) out = refont(out, style.fonts);
  if (editor) {
    const meta = JSON.stringify({ accent, fonts }).replace(/'/g, "&#39;");
    out = out.replace("</head>", `<meta name="vm-style" content='${meta}'></head>`);
  }
  return out;
}
