import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";

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
