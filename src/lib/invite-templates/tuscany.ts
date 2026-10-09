import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { TUSCANY_SAMPLE_IMAGES } from "@/lib/invite-templates/tuscany-assets";

/** Тёплое приглашение на фактурной бумаге с тосканской эстетикой. */
export const TUSCANY_TEMPLATE: InviteTemplate = {
  id: "tuscany",
  name: "Тоскана",
  mood: "Камерная свадьба среди кипарисов: фактурная бумага, шоколадная лента, сухоцветы, восковая печать и тёплая editorial-фотография.",
  theme: {
    ...defaultTheme(),
    template: "tuscany",
    bg: "#c6a98e",
    card: "#f3e5d2",
    ink: "#4a2e20",
    muted: "#8c6b55",
    accent: "#6c3d25",
    line: "#d2b89d",
    leaf: "#827156",
    headingFont: "didona",
    bodyFont: "antiqua",
    corner: "round",
    divider: "line",
    cover: "photo",
    timeline: "row",
    sections: "flat",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: true,
    frame: false,
    timelineIcons: false,
    capsHeadings: false,
    align: "center",
  },
  blocks: [
    {
      type: "COVER",
      content: {
        v: 1,
        title: "Два сердца · одно прекрасное завтра",
        names: "Валерия и Давид",
        dateText: "15 ноября 2027 · Тоскана, Италия",
        subtitle: "Любовь живёт здесь. И мы хотим разделить этот день с вами.",
        imageUrl: TUSCANY_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Наша история",
        title: "Лучшее только начинается",
        text: "Мы мечтали о празднике, где время замедляется, свечи горят до поздней ночи, а рядом собираются самые дорогие люди. Именно таким будет наш день.",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До нашей свадьбы", doneText: "Сегодня мы становимся семьёй!" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Одна локация",
        title: "Там, где всё случится",
        name: "Вилла Сан-Пьетро",
        address: "Тоскана, Италия",
        note: "Церемония, ужин и вечеринка пройдут на вилле.",
        imageUrl: TUSCANY_SAMPLE_IMAGES[1],
        mapUrl: "",
        mapLabel: "Открыть карту",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Тёплый вечер",
        title: "Атмосфера нашего уикенда",
        items: [
          { imageUrl: TUSCANY_SAMPLE_IMAGES[1], caption: "Вилла среди оливковых рощ" },
          { imageUrl: TUSCANY_SAMPLE_IMAGES[2], caption: "Ужин при свечах" },
          { imageUrl: TUSCANY_SAMPLE_IMAGES[0], caption: "История, которую пишем вместе" },
        ],
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Свадебный уикенд",
        title: "Один день · много воспоминаний",
        items: [
          { time: "15:30", title: "Сбор гостей", note: "Аперитив во внутреннем дворе" },
          { time: "16:30", title: "Церемония", note: "У оливковой рощи" },
          { time: "18:00", title: "Ужин", note: "Итальянская кухня и тосты" },
          { time: "21:30", title: "Танцы", note: "Музыка, свечи и звёзды" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Тёплая природная палитра",
        text: "Подойдут элегантные образы в оттенках шоколада, карамели, терракоты и сухих трав.",
        palette: ["#4f2e20", "#80563d", "#b47b56", "#d2aa83", "#ead8be"],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ваш ответ",
        title: "Будете с нами?",
        text: "Пожалуйста, дайте нам знать заранее. Маленький ответ значит для нас очень много.",
        buttonLabel: "Ответить на приглашение",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "С любовью",
        title: "До встречи в Тоскане",
        text: "Разные дни. Одна история. Навсегда вместе.",
      },
    },
  ],
};

/** English sample: same sections and pictures as `TUSCANY_TEMPLATE.blocks`. */
export const TUSCANY_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "Two hearts · one beautiful tomorrow", names: "Emily & James", dateText: "November 15, 2027 · Tuscany, Italy", subtitle: "Love lives here — and we want to share this day with you.", imageUrl: TUSCANY_SAMPLE_IMAGES[0] } },
  { type: "TEXT", content: { v: 1, tag: "Our story", title: "The best is yet to come", text: "We dreamed of a celebration where time slows down, candles burn late into the night and the people dearest to us are gathered close. That’s exactly what our day will be." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Until our wedding", doneText: "Today we become a family!" } },
  { type: "VENUE", content: { v: 1, tag: "One venue", title: "Where it all happens", name: "Villa San Pietro", address: "Tuscany, Italy", note: "The ceremony, dinner and party will all take place at the villa.", imageUrl: TUSCANY_SAMPLE_IMAGES[1], mapUrl: "", mapLabel: "Open map" } },
  { type: "PHOTOS", content: { v: 1, tag: "A warm evening", title: "The feel of our weekend", items: [
    { imageUrl: TUSCANY_SAMPLE_IMAGES[1], caption: "A villa among the olive groves" },
    { imageUrl: TUSCANY_SAMPLE_IMAGES[2], caption: "Dinner by candlelight" },
    { imageUrl: TUSCANY_SAMPLE_IMAGES[0], caption: "The story we’re writing together" },
  ] } },
  { type: "TIMELINE", content: { v: 1, tag: "Wedding weekend", title: "One day · so many memories", items: [
    { time: "3:30 PM", title: "Guests arrive", note: "Aperitivo in the courtyard" },
    { time: "4:30 PM", title: "Ceremony", note: "By the olive grove" },
    { time: "6:00 PM", title: "Dinner", note: "Italian cuisine and toasts" },
    { time: "9:30 PM", title: "First dance", note: "Music, candles and stars" },
  ] } },
  { type: "DRESSCODE", content: { v: 1, tag: "Dress code", title: "A warm, natural palette", text: "Elegant looks in shades of chocolate, caramel, terracotta and dried grasses would be perfect.", palette: ["#4f2e20", "#80563d", "#b47b56", "#d2aa83", "#ead8be"] } },
  { type: "RSVP_FORM", content: { v: 1, tag: "Your reply", title: "Will you join us?", text: "Please let us know in advance. A short reply means so much to us.", buttonLabel: "Reply to the invitation" } },
  { type: "TEXT", content: { v: 1, tag: "With love", title: "See you in Tuscany", text: "Different days. One story. Together forever." } },
];
