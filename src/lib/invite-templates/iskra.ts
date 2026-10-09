import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";

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

/** Образец для английской свадьбы: те же разделы и снимки. */
export const ISKRA_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: {
    v: 1, names: "Emily & James", title: "We’re getting married", dateText: "July 11, 2027",
    subtitle: "One meeting. One spark.\nAnd a whole life together.", imageUrl: `${IMG}/couple.webp`,
    photos: [{ imageUrl: `${IMG}/portrait.webp`, caption: "You and me" }, { imageUrl: `${IMG}/kiss.webp`, caption: "Forever" }],
  } },
  { type: "CALENDAR", content: { v: 1, tag: "Save the date", title: "Our day", message: "We’d be so happy to share it with you." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Until we meet", doneText: "Today is the day!" } },
  { type: "TIMELINE", content: { v: 1, tag: "Every moment", title: "Our day, hour by hour", items: [
    { time: "4:00 PM", title: "Guests arrive", note: "Hugs, smiles and a glass of bubbly" },
    { time: "4:30 PM", title: "Ceremony", note: "When we say “I do”" },
    { time: "5:30 PM", title: "Dinner", note: "Warm words among our dearest people" },
    { time: "8:00 PM", title: "Dancing and cake", note: "An evening to remember" },
  ] } },
  { type: "VENUE", content: { v: 1, tag: "Where to find us", title: "Where we’ll be", name: "The Sunny Veranda",
    address: "36 Lakeview Drive, Lake Arrowhead, California", note: "The ceremony and dinner will both be at the same venue. Just bring your best mood — we’ll take care of the rest.",
    imageUrl: `${IMG}/venue.webp`, mapUrl: "https://www.google.com/maps/search/?api=1&query=Lake%20Arrowhead%2C%20California", mapLabel: "View on map" } },
  { type: "DRESSCODE", content: { v: 1, tag: "A small request", title: "In the colors of love", text: "Help set the mood of the evening with outfits in the shades of our palette. Let’s leave white for the bride — and the most beautiful colors for you.",
    palette: ["#750e1c", "#ad4a55", "#d1a2a0", "#dcc6b0", "#322827"], imageUrl: `${IMG}/dress.webp` } },
  { type: "PHOTOS", content: { v: 1, tag: "Our little movie", title: "You, me and a whole life", items: [
    { imageUrl: `${IMG}/couple.webp`, caption: "Happiness is being together" },
    { imageUrl: `${IMG}/portrait.webp`, caption: "Our favorite story" },
    { imageUrl: `${IMG}/kiss.webp`, caption: "To be continued…" },
  ] } },
  { type: "RSVP_FORM", content: { v: 1, tag: "RSVP", title: "Will you join us?", text: "Please fill out the form so we can prepare the warmest evening for you.",
    nameLabel: "Your full name", attendanceLabel: "Will you share this day with us?", yesLabel: "Yes, I’d love to!", noLabel: "Sadly, I can’t make it", drinksLabel: "What drinks do you prefer?",
    buttonLabel: "Send reply", successText: "Thank you for your reply! It means a lot to know your plans." } },
  { type: "TEXT", content: { v: 1, tag: "With love", title: "See you soon!", text: "Thank you for being part of our story.\nIf you have any questions, reach out to our planner: add their contact here." } },
];
