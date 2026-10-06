import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { KRASKI_SAMPLE_IMAGES } from "@/lib/invite-templates/kraski-assets";

export const KRASKI_TEMPLATE: InviteTemplate = {
  id: "kraski",
  name: "Краски любви",
  mood: "Белая морская история: крупная фотография пары, рваный бумажный край, строгая антиква, расписание с иконками и пастельные мазки дресс-кода.",
  theme: {
    ...defaultTheme(), template: "kraski", bg: "#ffffff", card: "#ffffff", ink: "#171717",
    muted: "#666666", accent: "#111111", line: "#bebebe", leaf: "#82888a",
    headingFont: "didona", bodyFont: "grotesk", corner: "sharp", divider: "none",
    cover: "photo", timeline: "row", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false,
    capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: "Дорогие гости!", dateText: "20/11/2027", subtitle: "Мы очень рады пригласить вас на нашу свадьбу. Пусть этот день станет одним из самых светлых воспоминаний для всех нас.", imageUrl: KRASKI_SAMPLE_IMAGES[0], photos: [{ imageUrl: KRASKI_SAMPLE_IMAGES[1], caption: "" }] } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "12:00", title: "Сбор гостей", note: "Встретимся, обнимемся и настроимся на праздник" },
      { time: "12:30", title: "Свадебная церемония", note: "Разделите с нами самый важный и трогательный момент" },
      { time: "14:00", title: "Праздничный банкет", note: "Ужин, музыка, танцы и много счастливых разговоров" },
      { time: "23:00", title: "Окончание мероприятия", note: "Проводим этот прекрасный день тёплыми объятиями" },
    ] } },
    { type: "COUNTDOWN", content: { v: 1, title: "До свадьбы осталось:", doneText: "Сегодня наша свадьба!" } },
    { type: "VENUE", content: { v: 1, title: "Место проведения торжества", name: "Лучезарный Резорт", address: "Сочи, п. Лоо, ул. Лучезарная, 18/4", note: "Мы будем ждать вас на берегу моря, в светлом зале комплекса «Лучезарный Резорт».", imageUrl: KRASKI_SAMPLE_IMAGES[2], mapUrl: "https://yandex.ru/maps/?text=%D0%A1%D0%BE%D1%87%D0%B8%20%D0%9B%D0%BE%D0%BE%20%D0%9B%D1%83%D1%87%D0%B5%D0%B7%D0%B0%D1%80%D0%BD%D0%B0%D1%8F%2018%2F4", mapLabel: "Открыть карту" } },
    { type: "MAP", content: { v: 1, title: "Как добраться?", yandexUrl: "https://yandex.ru/maps/?text=%D0%A1%D0%BE%D1%87%D0%B8%20%D0%9B%D0%BE%D0%BE%20%D0%9B%D1%83%D1%87%D0%B5%D0%B7%D0%B0%D1%80%D0%BD%D0%B0%D1%8F%2018%2F4", googleUrl: "", note: "Откройте маршрут заранее, чтобы легко найти место нашей встречи." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Подарки", text: "Самым дорогим подарком будет ваше присутствие. Если захотите поддержать наши мечты, мы с благодарностью примем пожелание в конверте." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Цветы", text: "Вместо букета можно принести бутылку вина, которое вы любите. Мы откроем её однажды вечером и вспомним вас с улыбкой." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Просьба", text: "Давайте сохраним этот день нежным и естественным: обойдёмся без криков «Горько» и оставим поцелуи спонтанными." } },
    { type: "DRESSCODE", content: { v: 1, title: "Дресс-код", text: "Мы ждём встречи и будем рады, если вы поддержите атмосферу праздника нарядами в мягких оттенках нашей палитры.", palette: ["#f1e7dd", "#e7d7e8", "#bda2b4", "#b9cfda", "#85838c"] } },
    { type: "RSVP_FORM", content: { v: 1, title: "Присутствие на торжестве", text: "Ваш ответ поможет нам всё подготовить. Пожалуйста, сообщите о своих планах до 15.10.2027 г.", buttonLabel: "Отправить", attendanceLabel: "Сможете ли вы присутствовать на торжестве?", yesLabel: "Я приду / Мы придём", noLabel: "Прийти не получится", nameLabel: "Имя Фамилия", drinksLabel: "Предпочтения по напиткам", successText: "Спасибо! Мы получили ваш ответ." } },
    { type: "TEXT", content: { v: 1, title: "Мы будем счастливы видеть вас!", text: "20 ✦ 11 ✦ 2027" } },
  ],
};
