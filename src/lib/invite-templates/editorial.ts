import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { EDITORIAL_SAMPLE_IMAGES as A } from "./editorial-assets";

export const EDITORIAL_IDS = ["gazette", "protokol", "postcard"] as const;
export type EditorialDesign = typeof EDITORIAL_IDS[number];
export const isEditorialTemplate = (id: string): id is EditorialDesign => EDITORIAL_IDS.some(value => value === id);

const CONFIG = {
  gazette: { name: "Gazette", mood: "Свадебная передовица: газетные колонки, крупная фотография и ваша история на первой полосе.", bg: "#f4f2eb", ink: "#292923", accent: "#45453b", date: "14.08.2027", city: "Казань", venue: "Ресторан «Панорама»", address: "Казань, улица Портовая, 25", title: "Свадебная газета", calendar: "Дата главного события", countdown: "До выхода счастливого номера", timing: "Хроника нашего дня", dress: "Гардероб этого номера", rsvp: "Ответ в редакцию", farewell: "До встречи на первой полосе!" },
  protokol: { name: "Протокол", mood: "Задержание счастья: бланки, фотографии 3×4, печати и приглашение с секретным делом.", bg: "#eeece7", ink: "#292929", accent: "#7c3438", date: "18.07.2027", city: "Санкт-Петербург", venue: "Лофт «Гранат»", address: "Санкт-Петербург, набережная реки Карповки, 31", title: "Протокол", calendar: "Приложение № 1. Календарь", countdown: "До начала операции", timing: "Регламент счастливого дня", dress: "Форма одежды приглашённых", rsvp: "Подтверждение явки", farewell: "Заключение по делу" },
  postcard: { name: "Открытка", mood: "Рисованная открытка: терракотовое сердце, влюблённая пара и тёплые бумажные детали.", bg: "#f8f3e7", ink: "#34454f", accent: "#b7502f", date: "12.09.2027", city: "Москва", venue: "Загородный клуб «Раздолье»", address: "Московская область, Дмитровский округ, деревня Раменка, 15", title: "Мы женимся", calendar: "Наш день в календаре", countdown: "До самого тёплого дня", timing: "Программа дня", dress: "Палитра нашей открытки", rsvp: "Анкета гостя", farewell: "С нетерпением ждём вас!" },
};

export function editorialTemplate(id: EditorialDesign): InviteTemplate {
  const c = CONFIG[id];
  const protocol = id === "protokol";
  return {
    id, version: 1, name: c.name, mood: c.mood,
    theme: { ...defaultTheme(), template: id, bg: c.bg, card: c.bg, ink: c.ink, muted: "#827b72", accent: c.accent, line: "#cfc8bb", leaf: "#8e9b81", headingFont: "antiqua", bodyFont: "grotesk", corner: "soft", divider: "none", cover: "plain", timeline: "row", sections: "flat", intro: "none", decor: "none", paper: false, frame: false, capsHeadings: false },
    blocks: [
      { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: c.title, dateText: c.date,
        subtitle: protocol ? "Совместной проверкой установлено: сердца заняты, намерения серьёзные, свадьбе быть. Приглашаем вас стать свидетелями нашего самого счастливого решения." : id === "gazette" ? "Экстренный выпуск о двух людях, которые решили стать семьёй. Главная новость — мы женимся, а вы приглашены разделить с нами этот день!" : "Мы собираем в одну открытку любимых людей, объятия и счастливые моменты. Очень хотим, чтобы в ней нашлось место и для вас.",
        imageUrl: id === "postcard" ? A[3] : A[0], photos: protocol ? [{ imageUrl: A[1], caption: "Жених" }, { imageUrl: A[2], caption: "Невеста" }] : [], footer: "С любовью" } },
      { type: "CALENDAR", content: { v: 1, title: c.calendar, message: protocol ? "В назначенный день просим явиться с улыбкой и хорошим настроением." : "Отметьте эту дату — мы очень ждём встречи с вами." } },
      { type: "COUNTDOWN", content: { v: 1, title: c.countdown, doneText: "Сегодня наша свадьба!" } },
      { type: "TIMELINE", content: { v: 1, title: c.timing, items: [
        { time: "15:00", title: protocol ? "Сбор свидетелей" : "Встреча гостей", note: protocol ? "Знакомство участников и первые совместные показания за бокалом игристого" : "Обнимемся, познакомимся и поднимем первые бокалы" },
        { time: "16:00", title: "Церемония", note: protocol ? "Официальное подтверждение взаимных чувств и обмен кольцами" : "Самые важные слова в кругу самых близких" },
        { time: "17:00", title: protocol ? "Праздничное заседание" : "Праздничный ужин", note: "Тёплые истории, любимая музыка и танцы" },
        { time: "21:00", title: "Свадебный торт", note: "Сладкий повод ещё раз поднять бокалы за любовь" },
        { time: "23:00", title: protocol ? "Дело передано в семейный архив" : "До новых встреч", note: "Сохраним воспоминания и заберём с собой хорошее настроение" },
      ] } },
      { type: "VENUE", content: { v: 1, title: protocol ? "Место проведения операции" : "Место нашей встречи", name: c.venue, address: c.address, note: "Здесь нас ждут уютная атмосфера, праздничный ужин и вечер среди самых близких людей.", imageUrl: "/media/invite-skvoz-vremya/venue.webp", mapUrl: `https://yandex.ru/maps/?text=${encodeURIComponent(c.address)}`, mapLabel: protocol ? "Схема проезда" : "Построить маршрут" } },
      { type: "DRESSCODE", content: { v: 1, title: c.dress, text: protocol ? "Парадный вид приветствуется. Выберите один из оттенков ниже и не забудьте удобную обувь: танцы включены в регламент." : id === "gazette" ? "В этом номере спокойная палитра: молочный, песочный, серый и графит. Будем рады, если она вдохновит ваш образ." : "Кремовый, небесный, терракотовый и шалфейный — оттенки нашего тёплого праздника. Выберите тот, в котором вам уютно.", palette: protocol ? ["#454549", "#7c3438", "#e9dfcc", "#242424"] : id === "gazette" ? ["#eee9dd", "#b7aa92", "#848580", "#333632"] : ["#f0e6cd", "#9bb5c5", "#b7502f", "#8e9b81"], imageUrl: "/media/invite-tili/dresscode.webp" } },
      { type: "PHOTOS", content: { v: 1, title: protocol ? "Материалы дела" : id === "gazette" ? "Кадры семейной хроники" : "Наши счастливые моменты", items: [
        { imageUrl: A[0], caption: protocol ? "Доказательство взаимных чувств" : "Вместе начинается наша история" },
        { imageUrl: "/media/invite-skvoz-vremya/hero.webp", caption: "Впереди целая жизнь" },
      ] } },
      { type: "TEXT", content: { v: 1, tag: protocol ? "Особые распоряжения" : "Маленькая просьба", title: "Вместо цветов", text: protocol ? "Букеты к делу можно не приобщать. Будем рады бутылочке любимого вина для нашей семейной коллекции." : "Ваше присутствие — лучший подарок. Если хочется принести что-то вместо букета, будем рады бутылочке вина для наших будущих семейных вечеров." } },
      { type: "RSVP_FORM", content: { v: 1, title: c.rsvp, text: "Пожалуйста, подтвердите присутствие заранее. Так мы сможем продумать праздник для каждого из вас.", nameLabel: protocol ? "Фамилия и имя свидетеля" : "Ваше имя и фамилия", attendanceLabel: protocol ? "Сведения о явке" : "Сможете прийти?", yesLabel: protocol ? "Явлюсь с удовольствием" : "Обязательно буду", noLabel: protocol ? "Прошу считать отсутствие уважительным" : "К сожалению, не получится", drinksLabel: "Что нальём вам в бокал?", buttonLabel: protocol ? "Подписать протокол" : "Отправить ответ", successText: protocol ? "Показания приняты! Ждём вас на празднике." : "Спасибо! До встречи на нашей свадьбе." } },
      { type: "TEXT", content: { v: 1, tag: "С любовью", title: c.farewell, text: protocol ? "Дело о взаимной любви передаётся в семейный архив на бессрочное хранение. Ждём вас в качестве почётных свидетелей!" : "Пусть этот день станет тёплым воспоминанием, которое мы сохраним вместе с вами.\nЕсли возникнут вопросы, напишите нам." } },
    ],
  };
}

const CONFIG_EN = {
  gazette: { date: "August 14, 2027", venue: "The Panorama", address: "25 Harbor Street, Boston, MA", title: "The Wedding Gazette", calendar: "Mark the big day", countdown: "Until our happiest issue hits the stands", timing: "Chronicle of our day", dress: "This issue’s wardrobe", rsvp: "Write to the editors", farewell: "See you on the front page!" },
  protokol: { date: "July 18, 2027", venue: "Garnet Loft", address: "31 Riverwalk Drive, Chicago, IL", title: "Case File", calendar: "Exhibit A. The calendar", countdown: "Until the operation begins", timing: "Schedule of proceedings", dress: "Dress code for witnesses", rsvp: "Confirm your appearance", farewell: "Case closed" },
  postcard: { date: "September 12, 2027", venue: "Meadowbrook Country Club", address: "15 Meadow Lane, Rhinebeck, NY", title: "We’re getting married", calendar: "Our day on the calendar", countdown: "Counting down to our warmest day", timing: "Order of the day", dress: "Our postcard palette", rsvp: "RSVP", farewell: "We can’t wait to see you!" },
};

/** English sample: same sections and pictures as `editorialTemplate(id).blocks`. */
export function editorialBlocksEn(id: EditorialDesign): TemplateBlock[] {
  const c = CONFIG_EN[id];
  const protocol = id === "protokol";
  return [
    { type: "COVER", content: { v: 1, names: "Emily & James", title: c.title, dateText: c.date,
      subtitle: protocol ? "A joint investigation has established: both hearts are taken, intentions are serious, and the wedding is on. We invite you to witness our happiest decision." : id === "gazette" ? "A special edition about two people who decided to become a family. Breaking news: we’re getting married, and you’re invited to share the day with us!" : "We’re gathering our favorite people, hugs and happy moments into one postcard — and we’d love for you to be in it too.",
      imageUrl: id === "postcard" ? A[3] : A[0], photos: protocol ? [{ imageUrl: A[1], caption: "The groom" }, { imageUrl: A[2], caption: "The bride" }] : [], footer: "With love" } },
    { type: "CALENDAR", content: { v: 1, title: c.calendar, message: protocol ? "On the appointed day, please report with a smile and in high spirits." : "Save the date — we can’t wait to celebrate with you." } },
    { type: "COUNTDOWN", content: { v: 1, title: c.countdown, doneText: "Today is our wedding day!" } },
    { type: "TIMELINE", content: { v: 1, title: c.timing, items: [
      { time: "3:00 PM", title: protocol ? "Witnesses assemble" : "Guests arrive", note: protocol ? "Introductions and first joint statements over a glass of bubbly" : "Hugs, introductions and the first glasses raised" },
      { time: "4:00 PM", title: "Ceremony", note: protocol ? "Official confirmation of mutual feelings and the exchange of rings" : "The most important words, surrounded by the people closest to us" },
      { time: "5:00 PM", title: protocol ? "Celebratory session" : "Dinner", note: "Heartfelt stories, favorite songs and dancing" },
      { time: "9:00 PM", title: "Wedding cake", note: "A sweet reason to raise our glasses to love once more" },
      { time: "11:00 PM", title: protocol ? "Case filed in the family archive" : "Farewell", note: "We’ll keep the memories and take the good mood home with us" },
    ] } },
    { type: "VENUE", content: { v: 1, title: protocol ? "Scene of the operation" : "Where we’ll meet", name: c.venue, address: c.address, note: "A cozy atmosphere, a festive dinner and an evening with the people closest to us are waiting for you here.", imageUrl: "/media/invite-skvoz-vremya/venue.webp", mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`, mapLabel: protocol ? "Directions" : "Get directions" } },
    { type: "DRESSCODE", content: { v: 1, title: c.dress, text: protocol ? "Formal attire is encouraged. Pick one of the shades below and wear comfortable shoes: dancing is part of the schedule." : id === "gazette" ? "This issue’s palette is calm: ivory, sand, gray and graphite. We’d love for it to inspire your look." : "Cream, sky blue, terracotta and sage — the colors of our warm celebration. Choose the one you feel most at home in.", palette: protocol ? ["#454549", "#7c3438", "#e9dfcc", "#242424"] : id === "gazette" ? ["#eee9dd", "#b7aa92", "#848580", "#333632"] : ["#f0e6cd", "#9bb5c5", "#b7502f", "#8e9b81"], imageUrl: "/media/invite-tili/dresscode.webp" } },
    { type: "PHOTOS", content: { v: 1, title: protocol ? "Case evidence" : id === "gazette" ? "From the family chronicle" : "Our happy moments", items: [
      { imageUrl: A[0], caption: protocol ? "Proof of mutual feelings" : "Where our story begins" },
      { imageUrl: "/media/invite-skvoz-vremya/hero.webp", caption: "A whole life ahead" },
    ] } },
    { type: "TEXT", content: { v: 1, tag: protocol ? "Special orders" : "A small request", title: "Instead of flowers", text: protocol ? "Bouquets need not be entered into evidence. A bottle of your favorite wine for our family collection would be most welcome." : "Your presence is the best gift. If you’d like to bring something instead of a bouquet, a bottle of wine for our future family evenings would be lovely." } },
    { type: "RSVP_FORM", content: { v: 1, title: c.rsvp, text: "Please let us know in advance whether you can come. It will help us plan the celebration for each of you.", nameLabel: protocol ? "Witness’s full name" : "Your full name", attendanceLabel: protocol ? "Attendance record" : "Will you be able to come?", yesLabel: protocol ? "Will appear with pleasure" : "Joyfully accepts", noLabel: protocol ? "Please consider my absence excused" : "Regretfully declines", drinksLabel: "What shall we pour for you?", buttonLabel: protocol ? "Sign the report" : "Send reply", successText: protocol ? "Statement received! See you at the celebration." : "Thank you! See you at our wedding." } },
    { type: "TEXT", content: { v: 1, tag: "With love", title: c.farewell, text: protocol ? "The case of mutual love is hereby transferred to the family archive for permanent safekeeping. We look forward to seeing you as our guests of honor!" : "May this day become a warm memory we share with you.\nIf you have any questions, just send us a message." } },
  ];
}

export const GAZETTE_BLOCKS_EN = editorialBlocksEn("gazette");
export const PROTOKOL_BLOCKS_EN = editorialBlocksEn("protokol");
export const POSTCARD_BLOCKS_EN = editorialBlocksEn("postcard");

export const GAZETTE_TEMPLATE = editorialTemplate("gazette");
export const PROTOKOL_TEMPLATE = editorialTemplate("protokol");
export const POSTCARD_TEMPLATE = editorialTemplate("postcard");
