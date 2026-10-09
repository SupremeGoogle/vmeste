import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { RUBY_SAMPLE_IMAGES } from "@/lib/invite-templates/ruby-assets";

/** Бордовое приглашение с розами, кремовой бумагой и восковой печатью. */
export const RUBY_TEMPLATE: InviteTemplate = {
  id: "ruby",
  name: "Рубин",
  mood: "Классическое приглашение в оттенках бордо: красные розы, молочная бумага, тонкая графика и восковая печать.",
  theme: {
    ...defaultTheme(),
    template: "ruby",
    bg: "#d9c6b8",
    card: "#f7eee5",
    ink: "#351c1a",
    muted: "#816864",
    accent: "#8e1018",
    line: "#d8c2b7",
    leaf: "#5f7156",
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
        title: "Вы приглашены на нашу свадьбу",
        names: "Валерия и Давид",
        dateText: "17 мая 2027 · Тоскана, Италия",
        subtitle: "Два сердца. Одна история. Целая жизнь впереди.",
        imageUrl: RUBY_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Наша история",
        title: "Любовь выглядит именно так",
        text: "Мы хотим разделить этот день с людьми, которые сделали нашу историю теплее. Будем счастливы видеть вас рядом.",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До нашего дня", doneText: "Сегодня начинается наша семейная история!" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Единственная локация",
        title: "Место нашей встречи",
        name: "Вилла Серена",
        address: "Тоскана, Италия",
        note: "Церемония, праздничный ужин и вечерняя программа пройдут в одном месте.",
        imageUrl: RUBY_SAMPLE_IMAGES[1],
        mapUrl: "",
        mapLabel: "Открыть карту",
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Праздник",
        title: "Наш день",
        items: [
          { time: "16:00", title: "Сбор гостей", note: "Игристое и лёгкие закуски" },
          { time: "17:00", title: "Церемония", note: "Самые важные слова" },
          { time: "18:30", title: "Ужин", note: "Тосты и итальянская кухня" },
          { time: "21:00", title: "Танцы", note: "Музыка до поздней ночи" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Благородные оттенки",
        text: "Будем рады классическим образам в оттенках бордо, пыльной розы, шоколада и тёплого кремового.",
        palette: ["#7e0e16", "#a7353d", "#c98986", "#e5c8bd", "#f1e5d5"],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ответ на приглашение",
        title: "Будете с нами?",
        text: "Пожалуйста, подтвердите присутствие заранее. Ваш ответ поможет нам позаботиться о каждом госте.",
        buttonLabel: "Ответить",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "До скорой встречи",
        title: "С любовью, Валерия и Давид",
        text: "Самые красивые воспоминания мы создадим вместе.",
      },
    },
  ],
};

/** English sample: same sections and pictures as `RUBY_TEMPLATE.blocks`. */
export const RUBY_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "You’re invited to our wedding", names: "Emily & James", dateText: "May 17, 2027 · Tuscany, Italy", subtitle: "Two hearts. One story. A whole life ahead.", imageUrl: RUBY_SAMPLE_IMAGES[0] } },
  { type: "TEXT", content: { v: 1, tag: "Our story", title: "This is what love looks like", text: "We want to share this day with the people who have made our story warmer. We’d be so happy to have you there." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Until our day", doneText: "Today our family story begins!" } },
  { type: "VENUE", content: { v: 1, tag: "One venue", title: "Where we’ll meet", name: "Villa Serena", address: "Tuscany, Italy", note: "The ceremony, dinner and evening party will all take place in one place.", imageUrl: RUBY_SAMPLE_IMAGES[1], mapUrl: "", mapLabel: "Open map" } },
  { type: "TIMELINE", content: { v: 1, tag: "The celebration", title: "Our day", items: [
    { time: "4:00 PM", title: "Cocktail hour", note: "Sparkling wine and light bites" },
    { time: "5:00 PM", title: "Ceremony", note: "The most important words" },
    { time: "6:30 PM", title: "Dinner", note: "Toasts and Italian cuisine" },
    { time: "9:00 PM", title: "First dance", note: "Music late into the night" },
  ] } },
  { type: "DRESSCODE", content: { v: 1, tag: "Dress code", title: "Rich, noble tones", text: "We’d love to see classic looks in shades of burgundy, dusty rose, chocolate and warm cream.", palette: ["#7e0e16", "#a7353d", "#c98986", "#e5c8bd", "#f1e5d5"] } },
  { type: "RSVP_FORM", content: { v: 1, tag: "RSVP", title: "Will you join us?", text: "Please let us know in advance whether you can come. Your reply helps us take care of every guest.", buttonLabel: "Reply" } },
  { type: "TEXT", content: { v: 1, tag: "See you soon", title: "With love, Emily & James", text: "We’ll make the most beautiful memories together." } },
];
