import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";

const IMG = "/media/invite-floral-garden";

export const FLORAL_GARDEN_TEMPLATE: InviteTemplate = {
  id: "floral-garden",
  name: "Цветочный сад",
  mood: "Белые цветы вокруг приглашения, бордовая антиква, календарь с сердцем и плавная программа дня.",
  theme: {
    ...defaultTheme(), template: "floral-garden", bg: "#f9f6f1", card: "#fcf9f5", ink: "#641b2c",
    muted: "#765c60", accent: "#741c32", line: "#d9c9c2", leaf: "#72816c",
    headingFont: "didona", bodyFont: "antiqua", corner: "sharp", divider: "none",
    cover: "plain", timeline: "stack", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, title: "Приглашаем вас на нашу свадьбу", names: "Валерия и Давид", dateText: "28 сентября 2027", subtitle: "Будем счастливы разделить этот день с вами", imageUrl: `${IMG}/garden.webp` } },
    { type: "TEXT", content: { v: 1, title: "Дорогие гости!", text: "Мы хотим оказаться в окружении самых близких и дорогих для нас людей, искренне и от всей души будем рады видеть вас среди гостей на нашей свадьбе." } },
    { type: "CALENDAR", content: { v: 1, title: "сентябрь 2027", message: "С любовью, Валерия & Давид" } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "15:00", title: "Сбор гостей", note: "Приветственный фуршет и лёгкая музыка" },
      { time: "16:00", title: "Церемония", note: "Торжественный обмен клятвами" },
      { time: "17:00", title: "Фотосессия", note: "Прогулка и общие кадры" },
      { time: "18:00", title: "Банкет", note: "Ужин, тосты и танцы" },
      { time: "22:00", title: "Вечеринка", note: "Музыка до позднего вечера" },
    ] } },
    { type: "VENUE", content: { v: 1, title: "Где всё произойдёт", name: "Вилла Ротонда", address: "127, посёлок дома отдыха Озёра, коттеджный посёлок Довиль", note: "Рядом с площадкой есть бесплатная парковка для гостей. Въезд находится со стороны главного входа.", imageUrl: `${IMG}/venue.webp`, mapUrl: "https://yandex.ru/maps/?text=%D0%94%D0%BE%D0%B2%D0%B8%D0%BB%D1%8C%20%D0%9E%D0%B7%D1%91%D1%80%D0%B0", mapLabel: "Смотреть на карте" } },
    { type: "TEXT", content: { v: 1, title: "Немного важной информации", text: "Пожалуйста, приезжайте за 15–20 минут до начала, чтобы спокойно встретиться, оставить верхнюю одежду и занять свои места." } },
    { type: "DRESSCODE", content: { v: 1, title: "Дресс-код", text: "Будем рады, если вы поддержите элегантный стиль вечера и выберете наряды в предложенной палитре.", palette: ["#f4ede6", "#dcc2a4", "#e7ceca"] } },
    { type: "TEXT", content: { v: 1, tag: "wishes", title: "Пожелания", text: "Главный подарок — вы рядом в этот день.\nЕсли хотите порадовать букетом — будем очень рады.\nТёплые слова можно оставить в анкете ниже.\nДелитесь фото и видео с праздника — сохраним на память." } },
    { type: "PHOTOS", content: { v: 1, title: "Наша история", items: [
      { imageUrl: `${IMG}/story.webp`, caption: "Вместе — навсегда" },
      { imageUrl: "/media/invite-roseraie/portrait.webp", caption: "Моменты счастья" },
      { imageUrl: "/media/invite-roseraie/hero.webp", caption: "Наша история" },
    ] } },
    { type: "RSVP_FORM", content: { v: 1, title: "Анкета гостя", text: "Просим вас ответить на несколько вопросов", nameLabel: "Ваше имя", attendanceLabel: "Вы придёте?", yesLabel: "Приду", noLabel: "Не смогу", drinksLabel: "Напитки", buttonLabel: "Отправить ответ", successText: "Спасибо! Ваш ответ получен." } },
    { type: "TEXT", content: { v: 1, tag: "contacts", title: "Остались вопросы?", text: "По организационным вопросам можно написать Анне\n+7 999 000-00-00\n@anna" } },
    { type: "COUNTDOWN", content: { v: 1, title: "До скорой встречи!", doneText: "Сегодня наш праздник!" } },
  ],
};

/** Образец для английской свадьбы: те же разделы и снимки; служебные теги (wishes, contacts) — те же. */
export const FLORAL_GARDEN_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "You’re invited to our wedding", names: "Emily & James", dateText: "September 28, 2027", subtitle: "We’d be so happy to share this day with you", imageUrl: `${IMG}/garden.webp` } },
  { type: "TEXT", content: { v: 1, title: "Dear friends and family,", text: "We want to be surrounded by the people closest and dearest to us, and we would be truly delighted to see you among the guests at our wedding." } },
  { type: "CALENDAR", content: { v: 1, title: "September 2027", message: "With love, Emily & James" } },
  { type: "TIMELINE", content: { v: 1, title: "Order of the day", items: [
    { time: "3:00 PM", title: "Guests arrive", note: "Welcome drinks and soft music" },
    { time: "4:00 PM", title: "Ceremony", note: "We say our vows" },
    { time: "5:00 PM", title: "Photos", note: "A garden stroll and group pictures" },
    { time: "6:00 PM", title: "Dinner", note: "Dinner, toasts and dancing" },
    { time: "10:00 PM", title: "Party", note: "Music into the night" },
  ] } },
  { type: "VENUE", content: { v: 1, title: "Where it all happens", name: "Villa Rotonda", address: "127 Lakeshore Drive, Lake Geneva, Wisconsin", note: "There is free guest parking next to the venue. The entrance is by the main gate.", imageUrl: `${IMG}/venue.webp`, mapUrl: "https://www.google.com/maps/search/?api=1&query=Lake%20Geneva%2C%20Wisconsin", mapLabel: "View on map" } },
  { type: "TEXT", content: { v: 1, title: "A few important details", text: "Please arrive 15–20 minutes early so you have time to say hello, drop off your coat and find your seat." } },
  { type: "DRESSCODE", content: { v: 1, title: "Dress code", text: "We’d love it if you joined the elegant style of the evening and chose outfits from this palette.", palette: ["#f4ede6", "#dcc2a4", "#e7ceca"] } },
  { type: "TEXT", content: { v: 1, tag: "wishes", title: "A few wishes", text: "The best gift is having you with us on this day.\nIf you’d like to bring flowers, we’ll be so happy.\nYou can leave a few kind words in the RSVP form below.\nShare your photos and videos from the day — we’ll keep them as memories." } },
  { type: "PHOTOS", content: { v: 1, title: "Our story", items: [
    { imageUrl: `${IMG}/story.webp`, caption: "Together, forever" },
    { imageUrl: "/media/invite-roseraie/portrait.webp", caption: "Moments of happiness" },
    { imageUrl: "/media/invite-roseraie/hero.webp", caption: "Our story" },
  ] } },
  { type: "RSVP_FORM", content: { v: 1, title: "RSVP", text: "Please answer a few quick questions", nameLabel: "Your name", attendanceLabel: "Will you come?", yesLabel: "Yes, I’ll be there", noLabel: "Sorry, I can’t", drinksLabel: "Drinks", buttonLabel: "Send reply", successText: "Thank you! We’ve received your reply." } },
  { type: "TEXT", content: { v: 1, tag: "contacts", title: "Any questions?", text: "For anything about the day, reach out to Anna\n+1 555 000 0000\n@anna" } },
  { type: "COUNTDOWN", content: { v: 1, title: "See you soon!", doneText: "Today is the day!" } },
];
