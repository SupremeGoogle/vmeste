import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { PRISM_SAMPLE_IMAGES } from "@/lib/invite-templates/prism-assets";

/** Авторский glass-editorial шаблон с преломлениями света и объёмными карточками. */
export const PRISM_TEMPLATE: InviteTemplate = {
  id: "prism",
  name: "Призма",
  mood: "Современная церемония в стеклянной оранжерее: спектральный свет, жидкое стекло, объёмные фотографии и мягкие переливы.",
  theme: {
    ...defaultTheme(),
    template: "prism",
    bg: "#dbe4e2",
    card: "#f6f2ed",
    ink: "#182023",
    muted: "#667173",
    accent: "#7f9f99",
    line: "#bfcac7",
    leaf: "#a9c5bd",
    headingFont: "didona",
    bodyFont: "grotesk",
    corner: "round",
    divider: "none",
    cover: "photo",
    timeline: "stack",
    sections: "flat",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: false,
    frame: false,
    timelineIcons: false,
    capsHeadings: false,
    align: "left",
  },
  blocks: [
    { type: "COVER", content: { v: 1, title: "Любовь в преломлении", names: "Валерия и Давид", dateText: "02 августа 2027 · Оранжерея", subtitle: "Один свет. Тысяча оттенков. И наша новая глава.", imageUrl: PRISM_SAMPLE_IMAGES[0] } },
    { type: "TEXT", content: { v: 1, tag: "Манифест", title: "Свет меняется, когда мы рядом", text: "Мы хотим прожить этот день без лишней формальности — среди стекла, воды, музыки и людей, которые отражаются в нашей истории самыми тёплыми красками." } },
    { type: "COUNTDOWN", content: { v: 1, title: "До момента, когда всё засияет", doneText: "Сегодня наш свет становится общим!" } },
    { type: "VENUE", content: { v: 1, tag: "Оранжерея 01", title: "Пространство света", name: "Оранжерея «Призма»", address: "озеро Комо, Италия", note: "Церемония, ужин и вечеринка пройдут в одной стеклянной оранжерее.", imageUrl: PRISM_SAMPLE_IMAGES[1], mapUrl: "", mapLabel: "Открыть маршрут" } },
    { type: "PHOTOS", content: { v: 1, tag: "Мгновения", title: "Три грани одного вечера", items: [
      { imageUrl: PRISM_SAMPLE_IMAGES[0], caption: "Близость" },
      { imageUrl: PRISM_SAMPLE_IMAGES[1], caption: "Пространство" },
      { imageUrl: PRISM_SAMPLE_IMAGES[2], caption: "Свет" },
    ] } },
    { type: "TIMELINE", content: { v: 1, tag: "Ритм света", title: "Как будет двигаться вечер", items: [
      { time: "17:30", title: "Мягкий свет", note: "Встреча и аперитив" },
      { time: "18:30", title: "Преломление", note: "Церемония у воды" },
      { time: "20:00", title: "Тёплый спектр", note: "Ужин в оранжерее" },
      { time: "23:00", title: "После полуночи", note: "Музыка и танцы" },
    ] } },
    { type: "DRESSCODE", content: { v: 1, tag: "Палитра", title: "Цвет в движении", text: "Выбирайте вечерние образы сложных природных оттенков: графит, дымчатая мята, жемчужный, сиреневый и тёплое шампанское.", palette: ["#182023", "#7f9f99", "#d9ded9", "#b9a9c5", "#d6b083"] } },
    { type: "RSVP_FORM", content: { v: 1, tag: "Ваш ответ", title: "Станете частью этого света?", text: "Пожалуйста, отправьте ответ заранее — мы бережно подготовим место для каждого гостя.", buttonLabel: "Отразить ответ" } },
    { type: "TEXT", content: { v: 1, tag: "02 · 08 · 27", title: "До встречи внутри света", text: "С любовью, Валерия и Давид." } },
  ],
};

/** English sample: same sections and pictures as `PRISM_TEMPLATE.blocks`. */
export const PRISM_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "Love, refracted", names: "Emily & James", dateText: "August 2, 2027 · The Glasshouse", subtitle: "One light. A thousand shades. And our new chapter.", imageUrl: PRISM_SAMPLE_IMAGES[0] } },
  { type: "TEXT", content: { v: 1, tag: "Manifesto", title: "The light changes when we’re together", text: "We want to spend this day without needless formality — among glass, water, music and the people who reflect our story in the warmest colors." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Until everything starts to shine", doneText: "Today our light becomes one!" } },
  { type: "VENUE", content: { v: 1, tag: "Glasshouse 01", title: "A space made of light", name: "Prism Glasshouse", address: "Lake Como, Italy", note: "The ceremony, dinner and party will all take place in a single glasshouse.", imageUrl: PRISM_SAMPLE_IMAGES[1], mapUrl: "", mapLabel: "Get directions" } },
  { type: "PHOTOS", content: { v: 1, tag: "Moments", title: "Three facets of one evening", items: [
    { imageUrl: PRISM_SAMPLE_IMAGES[0], caption: "Closeness" },
    { imageUrl: PRISM_SAMPLE_IMAGES[1], caption: "Space" },
    { imageUrl: PRISM_SAMPLE_IMAGES[2], caption: "Light" },
  ] } },
  { type: "TIMELINE", content: { v: 1, tag: "The rhythm of light", title: "How the evening will unfold", items: [
    { time: "5:30 PM", title: "Soft light", note: "Welcome and aperitivo" },
    { time: "6:30 PM", title: "Refraction", note: "Ceremony by the water" },
    { time: "8:00 PM", title: "Warm spectrum", note: "Dinner in the glasshouse" },
    { time: "11:00 PM", title: "After midnight", note: "Music and dancing" },
  ] } },
  { type: "DRESSCODE", content: { v: 1, tag: "Palette", title: "Color in motion", text: "Choose evening looks in rich natural tones: graphite, smoky mint, pearl, lilac and warm champagne.", palette: ["#182023", "#7f9f99", "#d9ded9", "#b9a9c5", "#d6b083"] } },
  { type: "RSVP_FORM", content: { v: 1, tag: "Your reply", title: "Will you be part of this light?", text: "Please send your reply in advance — we’ll thoughtfully prepare a place for every guest.", buttonLabel: "Send reply" } },
  { type: "TEXT", content: { v: 1, tag: "08 · 02 · 27", title: "See you inside the light", text: "With love, Emily & James." } },
];
