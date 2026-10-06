import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { EDITORIAL_SAMPLE_IMAGES as A } from "./editorial-assets";

export const EDITORIAL_IDS = ["gazette", "protokol", "postcard"] as const;
export type EditorialDesign = typeof EDITORIAL_IDS[number];
export const isEditorialTemplate = (id: string): id is EditorialDesign => EDITORIAL_IDS.some(value => value === id);

const CONFIG = {
  gazette: { name: "Gazette", mood: "Свадебная передовица: газетные колонки, крупная фотография и ваша история на первой полосе.", bg: "#f4f2eb", ink: "#292923", accent: "#45453b", date: "14.08.2027", city: "Казань", venue: "Ресторан «Панорама»", address: "Казань, улица Портовая, 25", title: "Свадебная газета", calendar: "Дата главного события", countdown: "До выхода счастливого номера", timing: "Хроника нашего дня", dress: "Гардероб этого номера", rsvp: "Ответ в редакцию", farewell: "До встречи на первой полосе!" },
  protokol: { name: "Протокол", mood: "Задержание счастья: бланки, фотографии 3×4, печати и приглашение с секретным делом.", bg: "#eeece7", ink: "#292929", accent: "#7c3438", date: "18.07.2027", city: "Санкт-Петербург", venue: "Лофт «Гранат»", address: "Санкт-Петербург, набережная реки Карповки, 31", title: "Протокол", calendar: "Приложение № 1. Календарь", countdown: "До начала операции", timing: "Регламент счастливого дня", dress: "Форма одежды приглашённых", rsvp: "Подтверждение явки", farewell: "Заключение по делу" },
  postcard: { name: "Открытка", mood: "Рисованная открытка: терракотовое сердце, влюблённая пара и тёплые бумажные детали.", bg: "#f8f3e7", ink: "#34454f", accent: "#b7502f", date: "12.09.2027", city: "Москва", venue: "Загородный клуб «Раздолье»", address: "Московская область, Дмитровский округ, деревня Раменка, 15", title: "Мы женимся!", calendar: "Наш день в календаре", countdown: "До самого тёплого дня", timing: "Программа дня", dress: "Палитра нашей открытки", rsvp: "Анкета гостя", farewell: "С нетерпением ждём вас!" },
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

export const GAZETTE_TEMPLATE = editorialTemplate("gazette");
export const PROTOKOL_TEMPLATE = editorialTemplate("protokol");
export const POSTCARD_TEMPLATE = editorialTemplate("postcard");
