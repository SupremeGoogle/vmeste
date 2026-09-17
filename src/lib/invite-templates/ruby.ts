import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
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
        names: "Элеонора и Джеймс",
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
        name: "Villa Serena",
        address: "Тоскана, Италия",
        note: "Церемония, праздничный ужин и вечерняя программа пройдут в одном месте. Для гостей будет организован трансфер.",
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
        title: "С любовью, Элеонора и Джеймс",
        text: "Самые красивые воспоминания мы создадим вместе.",
      },
    },
  ],
};
