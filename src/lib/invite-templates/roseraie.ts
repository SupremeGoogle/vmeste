import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";

const IMG = "/media/invite-roseraie";

export const ROSERAIE_TEMPLATE: InviteTemplate = {
  id: "roseraie",
  name: "Розерай",
  mood: "Тёмно-зелёный конверт с золотой печатью, кинематографичная фотография и воздушная классика с ботаническими рисунками.",
  theme: {
    ...defaultTheme(), template: "roseraie", bg: "#fffefd", card: "#fffefd", ink: "#353a32",
    muted: "#8a867d", accent: "#7e745f", line: "#e7e2d8", leaf: "#69715b",
    headingFont: "didona", bodyFont: "antiqua", corner: "sharp", divider: "none",
    cover: "plain", timeline: "row", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: "Приглашение на свадьбу", dateText: "12 июня 2027", subtitle: "Что Бог сочетал, того человек да не разлучает.\nМарк 10:9", imageUrl: `${IMG}/hero.webp` } },
    { type: "TEXT", content: { v: 1, tag: "Наш день", title: "Валерия и Давид", text: "Семьи жениха и невесты с радостью приглашают вас разделить один из самых важных дней в нашей жизни.\nБудем счастливы видеть вас рядом, когда начнётся наша новая история." } },
    { type: "PHOTOS", content: { v: 1, title: "Мгновения вместе", items: [
      { imageUrl: `${IMG}/portrait.webp`, caption: "В ожидании нашего дня" },
      { imageUrl: `${IMG}/hero.webp`, caption: "С любовью, мы" },
    ] } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "15:30", title: "Сбор гостей", note: "Добро пожаловать" },
      { time: "16:00", title: "Церемония", note: "Наше «да»" },
      { time: "17:00", title: "Аперитив", note: "Время для тёплых встреч" },
      { time: "19:00", title: "Ужин", note: "Праздничный вечер" },
      { time: "22:00", title: "Танцы", note: "Танцуем вместе" },
    ] } },
    { type: "VENUE", content: { v: 1, title: "Место встречи", name: "Вилла Беллароза", address: "Асоло, Венето, Италия", note: "Церемония и праздничный ужин пройдут в саду виллы.", imageUrl: `${IMG}/venue.webp`, mapUrl: "https://www.google.com/maps/search/?api=1&query=Asolo%2C%20Veneto%2C%20Italy", mapLabel: "Показать на карте" } },
    { type: "PHOTOS", content: { v: 1, title: "С любовью", items: [{ imageUrl: `${IMG}/portrait.webp`, caption: "Ждём вас с любовью" }] } },
    { type: "TEXT", content: { v: 1, tag: "До встречи", title: "Мы будем ждать вас с любовью", text: "Спасибо, что разделите этот день с нами." } },
  ],
};
