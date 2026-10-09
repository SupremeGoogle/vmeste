import { z } from "zod";
import type { Lang } from "@/lib/i18n";

export const PRINT_INVITE_TEMPLATES = [
  { id: "gold", name: "Золотая классика", caption: "Гравировка, айвори и мягкое золото", nameEn: "Golden classic", captionEn: "Engraving, ivory and soft gold", art: "gold.jpg", paper: "#fbf7ed", ink: "#3f372d", accent: "#a47a37", layout: "classic" },
  { id: "rose", name: "Сад роз", caption: "Пудровые розы на акварельной бумаге", nameEn: "Rose garden", captionEn: "Blush roses on watercolor paper", art: "rose.jpg", paper: "#fff7f5", ink: "#53443e", accent: "#a96d72", layout: "romantic" },
  { id: "wreath", name: "Оливковый венок", caption: "Эвкалипт, олива и природные оттенки", nameEn: "Olive wreath", captionEn: "Eucalyptus, olive and natural tones", art: "wreath.jpg", paper: "#faf8ee", ink: "#34433a", accent: "#788266", layout: "wreath" },
  { id: "blue", name: "Голубая лента", caption: "Светлая акварель и цветы дельфиниума", nameEn: "Blue ribbon", captionEn: "Light watercolor and delphinium flowers", art: "blue.jpg", paper: "#f7f9fa", ink: "#344657", accent: "#7492ae", layout: "editorial" },
  { id: "terracotta", name: "Тёплый вечер", caption: "Терракота, ранункулюсы и сухоцветы", nameEn: "Warm evening", captionEn: "Terracotta, ranunculus and dried flowers", art: "terracotta.jpg", paper: "#fff4ea", ink: "#5d4034", accent: "#a85c40", layout: "arch" },
  { id: "lilac", name: "Лиловый сад", caption: "Полевые цветы и тонкая золотая нить", nameEn: "Lilac garden", captionEn: "Wildflowers and a fine gold thread", art: "lilac.jpg", paper: "#faf7f7", ink: "#4e4354", accent: "#947699", layout: "asymmetric" },
] as const;

export type PrintInviteTemplate = (typeof PRINT_INVITE_TEMPLATES)[number];
export type PrintInviteTemplateId = PrintInviteTemplate["id"];
export const printInviteTemplate = (id: string) => PRINT_INVITE_TEMPLATES.find((t) => t.id === id) ?? PRINT_INVITE_TEMPLATES[0];

export const PRINT_INVITE_DECOR = [
  { id: "rose", name: "Розы", nameEn: "Roses", file: "decor-rose.png", ratio: 0.76 },
  { id: "leaf", name: "Ветвь эвкалипта", nameEn: "Eucalyptus sprig", file: "decor-leaf.png", ratio: 0.65 },
  { id: "gold", name: "Золотой орнамент", nameEn: "Gold ornament", file: "decor-gold.png", ratio: 3.1 },
  { id: "wreath", name: "Оливковый венок", nameEn: "Olive wreath", file: "decor-wreath.png", ratio: 0.833 },
  { id: "ribbon", name: "Голубая лента", nameEn: "Blue ribbon", file: "decor-ribbon.png", ratio: 1.5 },
] as const;

export const printInviteLayerSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
  page: z.union([z.literal(0), z.literal(1)]),
  kind: z.enum(["text", "decor", "photo"]),
  text: z.string().max(500),
  decor: z.enum(["rose", "leaf", "gold", "wreath", "ribbon"]).nullable(),
  assetId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/).optional(),
  fit: z.enum(["cover", "contain"]).optional(),
  shape: z.enum(["square", "rounded", "circle"]).optional(),
  x: z.number().min(0).max(100), y: z.number().min(0).max(100),
  w: z.number().min(5).max(100), h: z.number().min(3).max(100),
  fontSize: z.number().min(7).max(70),
  font: z.enum(["serif", "script", "sans"]),
  align: z.enum(["left", "center", "right"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rotation: z.number().min(-180).max(180),
  hidden: z.boolean(),
}).refine((layer) => layer.x + layer.w <= 100.001 && layer.y + layer.h <= 100.001, "Элемент должен помещаться на открытке")
  .refine((layer) => layer.kind !== "photo" || Boolean(layer.assetId), "Выберите фотографию");
export type PrintInviteLayer = z.infer<typeof printInviteLayerSchema>;

export const printInvitationSchema = z.object({
  v: z.literal(1),
  template: z.enum(["gold", "rose", "wreath", "blue", "terracotta", "lilac"]),
  showArt: z.boolean().optional(),
  size: z.enum(["A6", "A5"]),
  bleed: z.boolean(),
  doubleSided: z.boolean(),
  recipients: z.enum(["single", "all"]),
  layers: z.array(printInviteLayerSchema).min(1).max(40),
});
export type PrintInvitation = z.infer<typeof printInvitationSchema>;

export const printInviteSize = (size: PrintInvitation["size"]) => size === "A5" ? { mmW: 148, mmH: 210 } : { mmW: 105, mmH: 148 };
export const mmToPt = (mm: number) => mm * 72 / 25.4;

/** `lang` — язык мероприятия: открытку читают гости, тексты по умолчанию — на их языке. */
type Seed = { names: string; date: string; venue: string; address: string; lang?: Lang };

const layer = (id: string, page: 0 | 1, text: string, x: number, y: number, w: number, fontSize: number, font: PrintInviteLayer["font"], align: PrintInviteLayer["align"], color: string): PrintInviteLayer => ({
  id, page, kind: "text", text, decor: null, x, y, w, h: ({ eyebrow: 6, names: 19, divider: 6, recipient: 10, message: 16, date: 9, venue: 9, closing: 7, "back-title": 6, "back-date": 14, "back-message": 18, "back-venue": 15, "back-rsvp": 11 } as Record<string, number>)[id] ?? 12, fontSize, font, align, color, rotation: 0, hidden: false,
});

export function makePrintInvitation(seed: Seed, templateId: PrintInviteTemplateId = "gold"): PrintInvitation {
  const t = printInviteTemplate(templateId);
  const geometry = {
    gold: { x: 13, w: 74, align: "center", nameY: 26, nameSize: 33, recipientY: 51, messageY: 62, dateY: 79, venueY: 87, messageSize: 12 },
    rose: { x: 14, w: 68, align: "left", nameY: 26, nameSize: 34, recipientY: 46, messageY: 55, dateY: 72, venueY: 80, messageSize: 12 },
    wreath: { x: 26, w: 48, align: "center", nameY: 24, nameSize: 23, recipientY: 40, messageY: 49, dateY: 64, venueY: 71, messageSize: 10 },
    blue: { x: 30, w: 58, align: "right", nameY: 25, nameSize: 27, recipientY: 44, messageY: 54, dateY: 70, venueY: 79, messageSize: 11 },
    terracotta: { x: 21, w: 58, align: "center", nameY: 25, nameSize: 28, recipientY: 45, messageY: 54, dateY: 70, venueY: 78, messageSize: 11 },
    lilac: { x: 30, w: 62, align: "right", nameY: 24, nameSize: 27, recipientY: 44, messageY: 53, dateY: 67, venueY: 75, messageSize: 10.5 },
  } satisfies Record<PrintInviteTemplateId, { x: number; w: number; align: PrintInviteLayer["align"]; nameY: number; nameSize: number; recipientY: number; messageY: number; dateY: number; venueY: number; messageSize: number }>;
  const g = geometry[t.id];
  const font = t.id === "rose" || t.id === "lilac" ? "script" : "serif";
  const blueHeading = t.id === "blue";
  const en = seed.lang === "en";
  return {
    v: 1, template: t.id, showArt: true, size: "A6", bleed: true, doubleSided: true, recipients: "single",
    layers: [
      { ...layer("eyebrow", 0, en ? "WEDDING INVITATION" : "ПРИГЛАШЕНИЕ НА СВАДЬБУ", blueHeading ? 17 : g.x, g.nameY - 9, blueHeading ? 58 : g.w, 8.2, "sans", blueHeading ? "left" : g.align, t.accent), hidden: t.id === "rose" || t.id === "wreath" },
      layer("names", 0, seed.names, blueHeading ? 17 : g.x, g.nameY, blueHeading ? 64 : g.w, g.nameSize, font, blueHeading ? "left" : g.align, t.ink),
      layer("divider", 0, "—", g.x + g.w / 2 - 8, g.recipientY - 8, 16, 19, "serif", "center", t.accent),
      layer("recipient", 0, en ? "Dear guests," : "Дорогие гости!", g.x, g.recipientY, g.w, 18, "script", g.align, t.accent),
      layer("message", 0, en ? "We would love for you to join us on the day our life together begins." : "Мы рады пригласить вас разделить с нами день, с которого начнётся наша семейная история.", g.x, g.messageY, g.w, g.messageSize, "serif", g.align, t.ink),
      layer("date", 0, seed.date, g.x, g.dateY, g.w, 16, "serif", g.align, t.accent),
      layer("venue", 0, seed.venue, g.x, g.venueY, g.w, 11.5, "serif", g.align, t.ink),
      layer("back-title", 1, en ? "OUR WEDDING DAY" : "ДЕНЬ НАШЕЙ СВАДЬБЫ", 14, 21, 72, 9, "sans", "center", t.accent),
      layer("back-date", 1, seed.date, 13, 30, 74, 28, "serif", "center", t.ink),
      layer("back-message", 1, en ? "We would be so happy to have you with us on this special day." : "Будем счастливы видеть вас рядом в этот важный для нас день.", 17, 44, 66, 14, "serif", "center", t.ink),
      layer("back-venue", 1, `${seed.venue}\n${seed.address}`, 14, 61, 72, 12, "serif", "center", t.ink),
      layer("back-rsvp", 1, en ? "Kindly let us know whether you can attend." : "Пожалуйста, сообщите нам, сможете ли прийти.", 17, 77, 66, 10, "sans", "center", t.accent),
    ],
  };
}

export function applyPrintInviteTemplate(design: PrintInvitation, templateId: PrintInviteTemplateId, seed: Seed): PrintInvitation {
  const fresh = makePrintInvitation(seed, templateId);
  const current = new Map(design.layers.filter((item) => item.kind === "text").map((item) => [item.id, item]));
  const known = new Set(fresh.layers.map((item) => item.id));
  return { ...design, template: templateId, showArt: true, layers: [
    ...fresh.layers.map((item) => ({ ...item, text: current.get(item.id)?.text ?? item.text })),
    ...design.layers.filter((item) => !known.has(item.id)),
  ] };
}

export function safePrintInvitation(value: unknown): PrintInvitation | null {
  const parsed = printInvitationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
