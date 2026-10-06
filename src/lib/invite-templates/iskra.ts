import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";

const IMG = "/media/invite-iskra";

/** Бордовая коробочка и фотополоска по видео-референсу; общий каркас и анкета. */
export const ISKRA_TEMPLATE: InviteTemplate = {
  id: "iskra",
  name: "Искра",
  version: 1,
  mood: "Бордовая коробочка с секретом, чёрно-белая фотополоска и записки от руки. Маленькая искра — большая история любви.",
  theme: {
    ...defaultTheme(), template: "iskra", bg: "#750e1c", card: "#750e1c", ink: "#f5ead7",
    muted: "#dcc6b0", accent: "#750e1c", line: "#bc8e7c", leaf: "#750e1c",
    headingFont: "antiqua", bodyFont: "antiqua", corner: "sharp", divider: "none",
    cover: "plain", timeline: "row", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: {
      v: 1, names: "Валерия и Давид", title: "Мы поженимся", dateText: "11 июля 2027",
      subtitle: "Одна встреча. Одна искра.\nИ целая жизнь вместе.", imageUrl: `${IMG}/couple.webp`,
      photos: [{ imageUrl: `${IMG}/portrait.webp`, caption: "Ты и я" }, { imageUrl: `${IMG}/kiss.webp`, caption: "Навсегда" }],
    } },
    { type: "CALENDAR", content: { v: 1, tag: "Сохраните дату", title: "Наш день", message: "Будем счастливы разделить его с вами." } },
    { type: "COUNTDOWN", content: { v: 1, title: "До той самой встречи", doneText: "Сегодня наш праздник!" } },
    { type: "TIMELINE", content: { v: 1, tag: "Каждое мгновение", title: "План нашего дня", items: [
      { time: "16:00", title: "Сбор гостей", note: "Объятия, улыбки и бокал игристого" },
      { time: "16:30", title: "Церемония", note: "Когда мы скажем друг другу «да»" },
      { time: "17:30", title: "Праздничный ужин", note: "Тёплые слова в кругу самых близких" },
      { time: "20:00", title: "Танцы и торт", note: "Вечер, который хочется запомнить" },
    ] } },
    { type: "VENUE", content: { v: 1, tag: "Место встречи", title: "Там, где будем мы", name: "Солнечная веранда",
      address: "г. Солнечногорск, Тимоновское ш., 36", note: "Церемония и ужин пройдут на одной площадке. Возьмите с собой хорошее настроение — об остальном мы позаботимся.",
      imageUrl: `${IMG}/venue.webp`, mapUrl: "https://yandex.ru/maps/org/the_sun_lake/40246030321/", mapLabel: "Посмотреть на карте" } },
    { type: "DRESSCODE", content: { v: 1, tag: "Маленькая просьба", title: "В цветах любви", text: "Поддержите настроение вечера нарядами в оттенках нашей палитры. Белый оставим для невесты, а вам — самые красивые цвета.",
      palette: ["#750e1c", "#ad4a55", "#d1a2a0", "#dcc6b0", "#322827"], imageUrl: `${IMG}/dress.webp` } },
    { type: "PHOTOS", content: { v: 1, tag: "Наш маленький фильм", title: "Ты, я и целая жизнь", items: [
      { imageUrl: `${IMG}/couple.webp`, caption: "Счастье — быть рядом" },
      { imageUrl: `${IMG}/portrait.webp`, caption: "Наша любимая история" },
      { imageUrl: `${IMG}/kiss.webp`, caption: "Продолжение следует…" },
    ] } },
    { type: "RSVP_FORM", content: { v: 1, tag: "Ответ гостя", title: "Вы будете с нами?", text: "Пожалуйста, заполните анкету, чтобы мы могли подготовить для вас самый тёплый вечер.",
      nameLabel: "Ваше имя и фамилия", attendanceLabel: "Разделите с нами этот день?", yesLabel: "Да, с радостью буду!", noLabel: "К сожалению, не смогу", drinksLabel: "Какие напитки вы предпочитаете?",
      buttonLabel: "Отправить ответ", successText: "Спасибо за ответ! Нам очень важно знать ваши планы." } },
    { type: "TEXT", content: { v: 1, tag: "С любовью", title: "До встречи!", text: "Спасибо, что вы — часть нашей истории.\nЕсли остались вопросы, напишите организатору: укажите здесь его контакт." } },
  ],
};
