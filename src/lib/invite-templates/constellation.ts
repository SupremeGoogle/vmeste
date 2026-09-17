import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { CONSTELLATION_SAMPLE_IMAGES } from "@/lib/invite-templates/constellation-assets";

/** Кинематографическое ночное приглашение со светом, орбитами и созвездиями. */
export const CONSTELLATION_TEMPLATE: InviteTemplate = {
  id: "constellation",
  name: "Созвездие",
  mood: "Ночная церемония у воды: затмение, светящиеся орбиты, созвездия, стекло и тёплый свет свечей.",
  theme: {
    ...defaultTheme(),
    template: "constellation",
    bg: "#07101f",
    card: "#0d1b31",
    ink: "#f6efe3",
    muted: "#9eaac0",
    accent: "#d5ad6c",
    line: "#34445f",
    leaf: "#7586a6",
    headingFont: "didona",
    bodyFont: "grotesk",
    corner: "round",
    divider: "line",
    cover: "photo",
    timeline: "row",
    sections: "flat",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: false,
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
        title: "Под одним небом",
        names: "Александр и Ева",
        dateText: "21 июня 2027 · озеро Комо",
        subtitle: "В эту ночь наша история станет созвездием.",
        imageUrl: CONSTELLATION_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Точка притяжения",
        title: "Мы нашли друг друга среди миллионов звёзд",
        text: "И теперь хотим собрать рядом людей, благодаря которым наш путь стал светлее. Будем счастливы прожить этот вечер вместе с вами.",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До встречи под звёздами", doneText: "Сегодня загорается наша новая звезда!" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Одна локация",
        title: "Там, где вода встречает небо",
        name: "Luna Glass House",
        address: "озеро Комо, Италия",
        note: "Церемония, ужин и ночная вечеринка пройдут в стеклянном павильоне у воды. Для гостей предусмотрен трансфер.",
        imageUrl: CONSTELLATION_SAMPLE_IMAGES[1],
        mapUrl: "",
        mapLabel: "Показать на карте",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Свет этой ночи",
        title: "Моменты, которые останутся",
        items: [
          { imageUrl: CONSTELLATION_SAMPLE_IMAGES[1], caption: "Луна над озером" },
          { imageUrl: CONSTELLATION_SAMPLE_IMAGES[2], caption: "Ужин среди огней" },
          { imageUrl: CONSTELLATION_SAMPLE_IMAGES[0], caption: "Наша точка притяжения" },
        ],
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Орбита вечера",
        title: "Когда зажигаются огни",
        items: [
          { time: "17:30", title: "Встреча гостей", note: "Аперитив у воды" },
          { time: "18:30", title: "Церемония", note: "На закате" },
          { time: "20:00", title: "Ужин", note: "В стеклянном павильоне" },
          { time: "23:00", title: "Ночная глава", note: "Танцы под звёздами" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Оттенки ночного неба",
        text: "Подойдут вечерние образы в оттенках полуночи, серебра, шампанского и глубокого синего.",
        palette: ["#07101f", "#172b49", "#5b6f91", "#b8b6b1", "#d5ad6c"],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ваш ответ",
        title: "Встретимся под звёздами?",
        text: "Пожалуйста, сообщите о своём решении заранее — нам важно подготовить место для каждого гостя.",
        buttonLabel: "Отправить ответ",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "До нашей ночи",
        title: "Вы — часть нашего созвездия",
        text: "Увидимся там, где начинается новая глава.",
      },
    },
  ],
};
