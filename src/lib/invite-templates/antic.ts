import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { ANTIC_SAMPLE_IMAGES as IMG } from "@/lib/invite-templates/antic-assets";

export const ANTIC_TEMPLATE: InviteTemplate = {
  id: "antic",
  name: "Антик",
  mood: "Светлая фактурная бумага, тонкие чернильные рисунки, каллиграфия и классическая программа свадебного дня.",
  theme: {
    ...defaultTheme(), template: "antic", bg: "#f8f7f3", card: "#f8f7f3", ink: "#1c1a19",
    muted: "#595651", accent: "#1c1a19", line: "#c8c4bd", leaf: "#807a71",
    headingFont: "didona", bodyFont: "grotesk", corner: "sharp", divider: "none",
    cover: "plain", timeline: "row", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: "Дорогие гости!", dateText: "20 ноября 2027", subtitle: "С огромной радостью приглашаем вас разделить с нами день рождения нашей семьи. Нам будет очень тепло и счастливо видеть каждого из вас рядом.", imageUrl: IMG[0], photos: [{ imageUrl: IMG[3], caption: "" }] } },
    { type: "COUNTDOWN", content: { v: 1, title: "До свадьбы осталось", doneText: "Сегодня наша свадьба!" } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "12:00", title: "Сбор гостей", note: "Знакомимся, обнимаемся и встречаемся за бокалом игристого" },
      { time: "12:30", title: "Церемония", note: "Момент, который станет началом нашей семейной истории" },
      { time: "14:00", title: "Праздничный ужин", note: "Тёплые слова, любимые люди и музыка до вечера" },
      { time: "23:00", title: "Завершение вечера", note: "Поблагодарим друг друга за этот прекрасный день" },
    ] } },
    { type: "PHOTOS", content: { v: 1, title: "Атмосфера", items: [{ imageUrl: IMG[2], caption: "" }] } },
    { type: "VENUE", content: { v: 1, title: "Локация", name: "Особняк Путилова", address: "К.О., пр. Динамо, 2Б, Санкт-Петербург", note: "Наш праздник пройдёт в старинном особняке — месте, где торжественность встречается с домашним уютом.", imageUrl: IMG[1], mapUrl: "https://yandex.ru/maps/?text=%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%20%D0%94%D0%B8%D0%BD%D0%B0%D0%BC%D0%BE%202%D0%91%20%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3", mapLabel: "Открыть маршрут" } },
    { type: "MAP", content: { v: 1, title: "Как добраться", note: "Нажмите на карту, чтобы построить удобный маршрут.", yandexUrl: "https://yandex.ru/maps/?text=%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%20%D0%94%D0%B8%D0%BD%D0%B0%D0%BC%D0%BE%202%D0%91%20%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3" } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Подарки", text: "Самый важный подарок для нас — ваше присутствие. Если вы захотите порадовать нас ещё больше, мы будем рады пожеланиям в конверте." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Цветы", text: "Мы очень любим цветы, но после праздника сразу отправимся в путешествие. Вместо букета можно подарить бутылку любимого вина для нашей семейной коллекции." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Небольшая просьба", text: "Пусть этот день будет наполнен живыми чувствами: мы будем благодарны, если вы обойдётесь без традиционных криков «Горько»." } },
    { type: "DRESSCODE", content: { v: 1, title: "Дресс-код", text: "Будем рады, если вы поддержите настроение нашего праздника и выберете наряды в оттенках этой палитры.", palette: ["#e8cabb", "#c9aa9b", "#849b9d", "#2d484b"] } },
    { type: "RSVP_FORM", content: { v: 1, title: "Присутствие на торжестве", text: "Пожалуйста, сообщите нам о своих планах до 15 октября 2027 года. Ваш ответ поможет подготовить праздник для каждого гостя.", buttonLabel: "Отправить", attendanceLabel: "Сможете ли вы присутствовать?", yesLabel: "Я приду / Мы придём", noLabel: "Прийти не получится", nameLabel: "Имя и фамилия", drinksLabel: "Предпочтения по напиткам", successText: "Спасибо! Ваш ответ получен." } },
    { type: "TEXT", content: { v: 1, title: "Мы будем счастливы видеть вас!", text: "С любовью, Валерия и Давид" } },
  ],
};
