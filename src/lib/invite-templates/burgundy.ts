import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";

const IMG = "/media/invite-burgundy";

export const BURGUNDY_TEMPLATE: InviteTemplate = {
  id: "burgundy",
  name: "Винный конверт",
  mood: "Бордовый конверт с печатью, акварельная арка с лебедями, розы и тёплая бумага. Без формы ответа гостей.",
  theme: {
    ...defaultTheme(), template: "burgundy", bg: "#eee2db", card: "#fbf5ee", ink: "#532b37",
    muted: "#806d6a", accent: "#7a3143", line: "#d5b9ad", leaf: "#6d745d",
    headingFont: "didona", bodyFont: "antiqua", corner: "sharp", divider: "none",
    cover: "plain", timeline: "stack", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: "Приглашение на свадьбу", dateText: "11 июля 2027", subtitle: "С любовью приглашаем вас разделить с нами этот день", imageUrl: `${IMG}/hero.webp` } },
    { type: "TEXT", content: { v: 1, tag: "Дорогие гости", title: "Мы будем рады видеть вас", text: "В нашей истории начинается новая глава. Будем счастливы, если этот особенный день вы проведёте вместе с нами.\nПусть он станет тёплым воспоминанием для каждого из нас." } },
    { type: "COUNTDOWN", content: { v: 1, title: "До нашей встречи осталось", doneText: "Сегодня наш день!" } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "17:00", title: "Сбор гостей", note: "Встречаемся и обнимаемся" },
      { time: "18:00", title: "Церемония", note: "Самое важное «да»" },
      { time: "19:00", title: "Фуршет", note: "Время для общения и первых тостов" },
      { time: "20:00", title: "Праздничный ужин", note: "Уютный вечер в кругу близких" },
      { time: "21:00", title: "Танцы", note: "Танцуем до самого вечера" },
    ] } },
    { type: "VENUE", content: { v: 1, title: "Место торжества", name: "Усадьба «Розовый сад»", address: "Москва, Большая Никитская улица, 22", note: "Будем ждать вас среди цветов и мягкого летнего света.", imageUrl: `${IMG}/venue.webp`, mapUrl: "https://yandex.ru/maps/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%20%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B0%D1%8F%20%D0%9D%D0%B8%D0%BA%D0%B8%D1%82%D1%81%D0%BA%D0%B0%D1%8F%2022", mapLabel: "Открыть карту" } },
    { type: "DRESSCODE", content: { v: 1, title: "Дресс-код", text: "Нам будет очень приятно, если вы поддержите атмосферу праздника нарядом в цветах нашей палитры.", palette: ["#6a283c", "#9e5363", "#c99296", "#dfc0a1", "#5b413e"] } },
    { type: "PHOTOS", content: { v: 1, title: "Вдохновение для образа", items: [{ imageUrl: `${IMG}/dress.webp`, caption: "Вдохновение для праздничного образа" }] } },
    { type: "TEXT", content: { v: 1, tag: "До встречи", title: "С любовью, Валерия и Давид", text: "С нетерпением ждём встречи с вами!" } },
  ],
};

/** English sample: same sections and pictures as `BURGUNDY_TEMPLATE.blocks`. */
export const BURGUNDY_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, names: "Emily & James", title: "Wedding invitation", dateText: "July 11, 2027", subtitle: "With love, we invite you to share this day with us", imageUrl: `${IMG}/hero.webp` } },
  { type: "TEXT", content: { v: 1, tag: "Dear friends", title: "We would love to see you there", text: "A new chapter of our story is about to begin. We’d be so happy if you spent this special day with us.\nMay it become a warm memory for each of us." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Counting down until we meet", doneText: "Today is our day!" } },
  { type: "TIMELINE", content: { v: 1, title: "Order of the day", items: [
    { time: "5:00 PM", title: "Guests arrive", note: "Hellos and hugs" },
    { time: "6:00 PM", title: "Ceremony", note: "The most important “I do”" },
    { time: "7:00 PM", title: "Cocktail hour", note: "Time to mingle and raise the first toasts" },
    { time: "8:00 PM", title: "Dinner", note: "A cozy evening with our loved ones" },
    { time: "9:00 PM", title: "First dance", note: "Then dancing until the end of the night" },
  ] } },
  { type: "VENUE", content: { v: 1, title: "The venue", name: "The Rose Garden Estate", address: "22 Garden Lane, Charleston, South Carolina", note: "We’ll be waiting for you among the flowers in the soft summer light.", imageUrl: `${IMG}/venue.webp`, mapUrl: "https://www.google.com/maps/search/?api=1&query=22%20Garden%20Lane%2C%20Charleston%2C%20SC", mapLabel: "Open map" } },
  { type: "DRESSCODE", content: { v: 1, title: "Dress code", text: "We’d be delighted if you joined in the mood of the day with an outfit in the colors of our palette.", palette: ["#6a283c", "#9e5363", "#c99296", "#dfc0a1", "#5b413e"] } },
  { type: "PHOTOS", content: { v: 1, title: "Outfit inspiration", items: [{ imageUrl: `${IMG}/dress.webp`, caption: "Inspiration for your celebration look" }] } },
  { type: "TEXT", content: { v: 1, tag: "See you soon", title: "With love, Emily & James", text: "We can’t wait to celebrate with you!" } },
];
