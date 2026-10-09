import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { defaultTheme } from "@/lib/invite-theme";
import odnazhdyBlocks from "./odnazhdy-blocks.json";
import happinessBlocks from "./little-happiness-blocks.json";
import priznanieBlocks from "./priznanie-blocks.json";
import odnazhdyBlocksEn from "./odnazhdy-blocks-en.json";
import happinessBlocksEn from "./little-happiness-blocks-en.json";
import priznanieBlocksEn from "./priznanie-blocks-en.json";

export const WEDWED_TEMPLATES: InviteTemplate[] = [
  { id: "odnazhdy", name: "Однажды…", mood: "Чёрно-белые фотографии, рукописные имена и история любви.", bg: "#f9f9fb", ink: "#2d2d35", blocks: odnazhdyBlocks, blocksEn: odnazhdyBlocksEn },
  { id: "little-happiness", name: "Маленькое счастье", mood: "Детские полароиды, тонкие заголовки и белые цветы.", bg: "#ffffff", ink: "#333333", blocks: happinessBlocks, blocksEn: happinessBlocksEn },
  { id: "priznanie", name: "Признание", mood: "Кремовая бумага, красные признания и фотографии в полароидных рамках.", bg: "#fef7ed", ink: "#262222", blocks: priznanieBlocks, blocksEn: priznanieBlocksEn },
].map(({ id, name, mood, bg, ink, blocks, blocksEn }) => ({
  id, name, mood,
  theme: { ...defaultTheme(), template: id, bg, card: bg, ink, accent: id === "priznanie" ? "#d50100" : ink, intro: "none", decor: "none", paper: false, frame: false, divider: "none" },
  blocks: blocks as TemplateBlock[],
  // Английский образец: те же разделы и снимки; служебные теги — по-английски
  // (вёрстка сопоставляет их с русскими, см. `EN_TAGS` в wedwed/markup.ts).
  blocksEn: blocksEn as TemplateBlock[],
}));
