/** Curated, contrast-conscious themes. Only these IDs are accepted from forms. */
export const GUEST_APPEARANCES = [
  { id: "rose", name: "Пудровая роза", nameEn: "Powder Rose", note: "Шёлковые ленты и тёплый румянец", noteEn: "Silk ribbons and a soft blush", paper: "#fff4f2", card: "#fffcfa", ink: "#4b2832", muted: "#805a64", accent: "#883f56", soft: "#cb9baa", line: "#e9cbd2", art: "ribbon", mood: "romantic" },
  { id: "sage", name: "Шалфейный сад", nameEn: "Sage Garden", note: "Акварельные цветы и природные оттенки", noteEn: "Watercolour flowers and natural greens", paper: "#f2f5eb", card: "#fcfdf7", ink: "#293e30", muted: "#5a705f", accent: "#416447", soft: "#9dab88", line: "#cbd7c2", art: "botanical", mood: "garden" },
  { id: "sky", name: "Голубой фарфор", nameEn: "Blue Porcelain", note: "Свежий голубой и тонкая рамка", noteEn: "Airy blue with a delicate frame", paper: "#eff5fc", card: "#fcfdff", ink: "#253a57", muted: "#566b83", accent: "#365e94", soft: "#9ab7d9", line: "#c7d8ee", art: "botanical", mood: "porcelain" },
  { id: "lavender", name: "Лавандовый вечер", nameEn: "Lavender Evening", note: "Сиреневая дымка и мягкие линии", noteEn: "Lilac tones and gentle curves", paper: "#f5f0fa", card: "#fefbff", ink: "#44334f", muted: "#73617f", accent: "#725187", soft: "#b8a1cc", line: "#dfd0e9", art: "botanical", mood: "lavender" },
  { id: "champagne", name: "Свет шампани", nameEn: "Champagne Glow", note: "Сливочная бумага и тёплое золото", noteEn: "Cream paper and warm gold", paper: "#faf5e9", card: "#fffdf6", ink: "#473825", muted: "#78664a", accent: "#826133", soft: "#b79a60", line: "#e0d3b6", art: "ribbon", mood: "classic" },
  { id: "terracotta", name: "Тосканский закат", nameEn: "Tuscan Sunset", note: "Лимоны, охра и тёплая терракота", noteEn: "Lemons, ochre and warm terracotta", paper: "#fff2e6", card: "#fffaf3", ink: "#553524", muted: "#886047", accent: "#9e4c30", soft: "#cc9470", line: "#e8c9ae", art: "citrus", mood: "tuscany" },
  { id: "night", name: "Полночный бархат", nameEn: "Midnight Velvet", note: "Глубокий синий и сияние шампани", noteEn: "Deep midnight blue and champagne light", paper: "#17242e", card: "#21333f", ink: "#fcf3dd", muted: "#c5c4bb", accent: "#f2d39c", soft: "#d2ad75", line: "#53616a", art: "botanical", mood: "evening" },
] as const;

export type GuestAppearance = (typeof GUEST_APPEARANCES)[number];
export type GuestAppearanceId = GuestAppearance["id"];
export function findGuestAppearance(value: unknown): GuestAppearance | null {
  return GUEST_APPEARANCES.find((theme) => theme.id === value) ?? null;
}

/** Shared QR design document; other print-design keys are preserved on writes. */
export function readGuestAppearance(value: unknown): GuestAppearance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return findGuestAppearance((value as Record<string, unknown>).guestSite);
}

export function guestAppearanceVariables(theme: GuestAppearance) {
  return {
    "--color-paper": theme.paper, "--color-card": theme.card,
    "--color-ink": theme.ink, "--color-muted": theme.muted,
    "--color-gold": theme.accent, "--color-gold-soft": theme.soft,
    "--color-line": theme.line, "--guest-art": `url("/media/timing-designs/${theme.art}.webp")`,
    "--guest-button-ink": theme.id === "night" ? "#17242e" : "#fffdf9",
  };
}
