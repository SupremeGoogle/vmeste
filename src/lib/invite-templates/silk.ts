import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { SILK_SAMPLE_IMAGES } from "@/lib/invite-templates/silk-assets";

/** Romantic destination-wedding invitation inspired by silk and pressed flowers. */
export const SILK_TEMPLATE: InviteTemplate = {
  id: "silk",
  name: "Шёлк",
  mood: "Романтичный свадебный день в одной локации: пудровый шёлк, винные акценты, волнообразные карточки, фотоколлаж и лёгкая ботаническая анимация.",
  theme: {
    ...defaultTheme(),
    template: "silk",
    bg: "#ead4cf",
    card: "#fff8f2",
    ink: "#5b302f",
    muted: "#8d6f69",
    accent: "#a84f49",
    line: "#e6c8c0",
    leaf: "#9a665e",
    headingFont: "didona",
    bodyFont: "antiqua",
    corner: "round",
    divider: "line",
    cover: "photo",
    timeline: "row",
    sections: "card",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: true,
    frame: false,
    timelineIcons: true,
    capsHeadings: false,
    align: "center",
  },
  blocks: [
    {
      type: "COVER",
      content: {
        v: 1,
        title: "Вы приглашены на нашу свадьбу",
        names: "Валерия и Давид",
        dateText: "14 октября 2027 · Амальфи, Италия",
        subtitle: "Одна любовь. Новая глава. Целая жизнь вместе.",
        imageUrl: SILK_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Разные места · одна любовь",
        title: "Наша история",
        text: "Разные города, одна дорога и бесконечно много причин улыбаться друг другу. Мы хотим прожить этот новый день рядом с теми, кто нам особенно дорог.",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Один прекрасный день",
        title: "Атмосфера нашего дня",
        items: [
          { imageUrl: SILK_SAMPLE_IMAGES[1], caption: "Церемония на террасе над морем" },
          { imageUrl: SILK_SAMPLE_IMAGES[2], caption: "Ужин при свечах в саду виллы" },
          { imageUrl: SILK_SAMPLE_IMAGES[0], caption: "Один день, который останется с нами" },
        ],
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До встречи у моря", doneText: "Наш праздник начинается сегодня!" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Единственная локация",
        title: "Единственная локация",
        name: "Вилла Челестина",
        address: "Побережье Амальфи, Италия",
        note: "Церемония, ужин и вечерняя программа пройдут здесь.",
        imageUrl: SILK_SAMPLE_IMAGES[1],
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Главный день",
        title: "Главный день",
        items: [
          { time: "16:00", title: "Сбор гостей", note: "Лимонад и аперитив на террасе" },
          { time: "17:00", title: "Церемония", note: "Закат и самые важные слова" },
          { time: "18:30", title: "Праздничный ужин", note: "Тосты, свечи и итальянская кухня" },
          { time: "21:00", title: "Танцы", note: "Музыка до поздней ночи" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Палитра вечера",
        text: "Будем рады лёгким вечерним образам в оттенках розового вина, пудры и тёплого песка.",
        palette: ["#6f292d", "#a84f49", "#d49a91", "#ead0c8", "#f6ebe5"],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ответ на приглашение",
        title: "Будете с нами?",
        text: "Пожалуйста, подтвердите присутствие заранее. Мы хотим подготовить этот день с заботой о каждом госте.",
        buttonLabel: "Отправить ответ",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "С любовью",
        title: "С благодарностью и любовью",
        text: "Собираем красивые воспоминания вместе с вами.",
      },
    },
  ],
};

/** English sample: same sections and pictures as `SILK_TEMPLATE.blocks`. */
export const SILK_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "You’re invited to our wedding", names: "Emily & James", dateText: "October 14, 2027 · Amalfi, Italy", subtitle: "One love. A new chapter. A whole life together.", imageUrl: SILK_SAMPLE_IMAGES[0] } },
  { type: "TEXT", content: { v: 1, tag: "Different places · one love", title: "Our story", text: "Different cities, one road and endless reasons to smile at each other. We want to spend this new day with the people who mean the most to us." } },
  { type: "PHOTOS", content: { v: 1, tag: "One beautiful day", title: "The feel of our day", items: [
    { imageUrl: SILK_SAMPLE_IMAGES[1], caption: "A ceremony on the terrace above the sea" },
    { imageUrl: SILK_SAMPLE_IMAGES[2], caption: "Candlelit dinner in the villa garden" },
    { imageUrl: SILK_SAMPLE_IMAGES[0], caption: "One day we’ll carry with us" },
  ] } },
  { type: "COUNTDOWN", content: { v: 1, title: "Until we meet by the sea", doneText: "Our celebration starts today!" } },
  { type: "VENUE", content: { v: 1, tag: "One venue", title: "One venue", name: "Villa Celestina", address: "Amalfi Coast, Italy", note: "The ceremony, dinner and evening party will all take place here.", imageUrl: SILK_SAMPLE_IMAGES[1] } },
  { type: "TIMELINE", content: { v: 1, tag: "The big day", title: "The big day", items: [
    { time: "4:00 PM", title: "Guests arrive", note: "Lemonade and aperitivo on the terrace" },
    { time: "5:00 PM", title: "Ceremony", note: "Sunset and the most important words" },
    { time: "6:30 PM", title: "Dinner", note: "Toasts, candles and Italian cuisine" },
    { time: "9:00 PM", title: "First dance", note: "Music late into the night" },
  ] } },
  { type: "DRESSCODE", content: { v: 1, tag: "Dress code", title: "The evening palette", text: "We’d love to see light evening looks in shades of rosé, blush and warm sand.", palette: ["#6f292d", "#a84f49", "#d49a91", "#ead0c8", "#f6ebe5"] } },
  { type: "RSVP_FORM", content: { v: 1, tag: "RSVP", title: "Will you join us?", text: "Please let us know in advance whether you can come. We want to prepare this day with every guest in mind.", buttonLabel: "Send reply" } },
  { type: "TEXT", content: { v: 1, tag: "With love", title: "With gratitude and love", text: "Making beautiful memories together with you." } },
];
