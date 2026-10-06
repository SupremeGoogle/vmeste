import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { PEARL_SAMPLE_IMAGES } from "@/lib/invite-templates/pearl-assets";

/** Светлое приглашение с жемчужной палитрой и ботанической графикой. */
export const PEARL_TEMPLATE: InviteTemplate = {
  id: "pearl",
  name: "Жемчуг",
  mood: "Воздушная классика в оттенках айвори и шалфея: овальный портрет, одна локация у озера, тонкая ботаника и мягкие анимации при прокрутке.",
  theme: {
    ...defaultTheme(),
    template: "pearl",
    bg: "#e9e6df",
    card: "#fbfaf7",
    ink: "#383a36",
    muted: "#7b7d76",
    accent: "#929187",
    line: "#d8d5cd",
    leaf: "#7e897a",
    headingFont: "didona",
    bodyFont: "antiqua",
    corner: "round",
    divider: "line",
    cover: "frame",
    timeline: "row",
    sections: "flat",
    dateStyle: "line",
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
        title: "Приглашаем вас разделить этот день с нами",
        names: "Валерия и Давид",
        dateText: "14 июня 2027 · Озеро Комо, Италия",
        subtitle: "Две души. Одна история. Новая глава вместе.",
        imageUrl: PEARL_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Наша история",
        title: "Там, где начинается навсегда",
        text: "Мы нашли друг в друге дом, поддержку и тысячи поводов улыбаться. Теперь хотим собрать рядом самых близких и вместе открыть новую главу нашей истории.",
      },
    },
    {
      type: "COUNTDOWN",
      content: {
        v: 1,
        title: "До нашей встречи",
        doneText: "Сегодня начинается наша семейная история!",
      },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Одна локация",
        title: "Место встречи",
        name: "Вилла Серена",
        address: "Озеро Комо, Италия",
        note: "Церемония, праздничный ужин и вечерняя программа пройдут на территории виллы.",
        imageUrl: PEARL_SAMPLE_IMAGES[1],
        mapUrl: "",
        mapLabel: "Открыть на карте",
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Свадебный день",
        title: "Самое важное",
        items: [
          { time: "16:00", title: "Сбор гостей", note: "Аперитив в саду виллы" },
          { time: "17:00", title: "Церемония", note: "Самые важные слова у озера" },
          { time: "18:30", title: "Праздничный ужин", note: "Тосты, музыка и итальянская кухня" },
          { time: "21:00", title: "Танцы", note: "Празднуем под звёздами" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Оттенки нашего дня",
        text: "Будем рады элегантным образам в спокойных природных оттенках. Пусть палитра станет подсказкой, а не строгим правилом.",
        palette: ["#e4ded2", "#c8cac7", "#9ea69c", "#6d786b"],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ваш ответ",
        title: "Будете с нами?",
        text: "Пожалуйста, подтвердите присутствие заранее — так мы сможем позаботиться о каждом госте.",
        buttonLabel: "Ответить на приглашение",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "С любовью",
        title: "До встречи у озера",
        text: "Не можем дождаться дня, когда обнимем каждого из вас.",
      },
    },
  ],
};
