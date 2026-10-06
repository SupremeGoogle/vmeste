import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { AQUARELLE_SAMPLE_IMAGES } from "@/lib/invite-templates/aquarelle-assets";

/**
 * «Акварель» — тёплая бумага, ленты и конверт.
 *
 * Открывается фотографией настоящей бумаги, конверта и атласной ленты.
 * Дальше страница держится на смене крупных редакционных композиций:
 * имя жениха набрано капителью
 * пыльно-синим, имя невесты — рукописным бордовым, подписи разделов —
 * тёмно-зелёным вразрядку.
 */
export const AQUARELLE_TEMPLATE: InviteTemplate = {
  id: "aquarelle",
  name: "Акварель",
  mood: "Акварельная бумага, атласные ленты и конверт в полоску: рукописное имя невесты, бордовые заголовки и подписи глубоким зелёным.",
  theme: {
    ...defaultTheme(),
    template: "aquarelle",
    bg: "#f7e9dc",
    card: "#fffaf3",
    ink: "#46627d",
    muted: "#9c8672",
    accent: "#7c1f1c",
    line: "#e7d4c0",
    leaf: "#2f6b5a",
    headingFont: "didona",
    bodyFont: "grotesk",
    corner: "soft",
    divider: "none",
    cover: "plain",
    timeline: "row",
    sections: "flat",
    dateStyle: "line",
    intro: "none",
    decor: "none",
    paper: false,
    frame: false,
    timelineIcons: false,
    capsHeadings: true,
    align: "center",
  },
  blocks: [
    {
      type: "COVER",
      content: {
        v: 1,
        title: "Приглашают вас на свою свадьбу",
        names: "Валерия и Давид",
        dateText: "20 ноября 2027",
        subtitle: "",
        imageUrl: AQUARELLE_SAMPLE_IMAGES[4],
        photos: [],
        footer: "",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "",
        title: "Дорогие гости!",
        text: "Мы сами не ожидали, но этот день настал — мы женимся! Будем рады, если вы проведёте этот счастливый день вместе с нами.",
      },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Локация",
        title: "Место торжества",
        name: "Отель «Винтаж»",
        address: "г. Судак, Крым, ул. Набережная, 3",
        note: "Карта поможет быстрее найти место торжества и добраться вовремя.",
        imageUrl: AQUARELLE_SAMPLE_IMAGES[1],
        mapUrl: "",
        mapLabel: "Открыть карту",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До свадьбы осталось", doneText: "Сегодня тот самый день!" },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Расписание",
        title: "Программа дня",
        items: [
          { time: "14:00", title: "Сбор гостей", note: "Игристое, лёгкие закуски и знакомство с другими гостями" },
          { time: "14:30", title: "Церемония", note: "Вы станете свидетелями создания новой семьи — нашей" },
          { time: "16:00", title: "Банкет", note: "Вкусная еда, тёплые слова и танцы до поздней ночи" },
          { time: "22:00", title: "Завершение", note: "Уютные объятия и много ярких впечатлений" },
        ],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Детали торжества",
        title: "Подарки",
        text: "Ваши улыбки и смех — лучший подарок в этот день, а пожелания в конвертах помогут осуществить наши мечты.",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Детали торжества",
        title: "Цветы",
        text: "Приятным комплиментом вместо букета будет бутылочка вашего любимого вина — мы откроем её на ближайшем совместном празднике.",
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Наряды",
        title: "Дресс-код",
        text: "Нам будет очень приятно, если при выборе одежды вы предпочтёте вечерние наряды в нашей гамме: пыльно-синий, пудровый, оливковый и цвет топлёного молока.",
        palette: ["#46627d", "#e3c3c5", "#cbb69a", "#7f9377", "#f3e7d8"],
        imageUrl: "",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Мы",
        title: "Немного о нас",
        items: [
          { imageUrl: AQUARELLE_SAMPLE_IMAGES[0], caption: "Наш вечер" },
          { imageUrl: AQUARELLE_SAMPLE_IMAGES[2], caption: "Под фатой" },
          { imageUrl: AQUARELLE_SAMPLE_IMAGES[3], caption: "Букет невесты" },
        ],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Анкета гостя",
        title: "Сможете быть с нами?",
        text: "Ваши ответы очень помогут нам при организации свадьбы. Будем ждать ответ до 15 октября.",
        buttonLabel: "Ответить",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "",
        title: "До встречи!",
        text: "С любовью, Валерия и Давид.",
      },
    },
  ],
};
