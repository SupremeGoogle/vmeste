import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { SERDCE_SAMPLE_IMAGES as IMG } from "@/lib/invite-templates/serdce-assets";

export const SERDCE_TEMPLATE: InviteTemplate = {
  id: "serdce",
  name: "Сердце к сердцу",
  mood: "Личная история пары на фактурной бумаге: фотографии-полароиды, тёмная хвоя, волнистые переходы и романтичная антиква.",
  theme: {
    ...defaultTheme(), template: "serdce", bg: "#f4f0e8", card: "#f4f0e8", ink: "#2b3c2d", muted: "#657064",
    accent: "#2b3c2d", line: "#aeb4a6", leaf: "#53654a", headingFont: "didona", bodyFont: "grotesk",
    corner: "sharp", divider: "none", cover: "photo", timeline: "stack", sections: "flat", dateStyle: "line",
    intro: "none", decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: "Приглашение на свадьбу", dateText: "20 ноября 2027", subtitle: "Родные и друзья! В нашей жизни начинается новая глава, и мы хотим прожить этот день рядом с вами.", imageUrl: IMG[0], footer: "С любовью, Валерия и Давид" } },
    { type: "PHOTOS", content: { v: 1, title: "Наша история", items: IMG.slice(3, 7).map((imageUrl) => ({ imageUrl, caption: "" })) } },
    { type: "PHOTOS", content: { v: 1, title: "Продолжение истории", items: IMG.slice(7, 9).map((imageUrl) => ({ imageUrl, caption: "" })) } },
    { type: "TEXT", content: { v: 1, tag: "История", title: "Всем привет!", text: "Когда-то мы шли каждый своей дорогой. Одна встреча всё изменила: теперь мы вместе строим планы, смеёмся над мелочами и ждём нашего самого важного дня." } },
    { type: "TEXT", content: { v: 1, tag: "История", title: "С чего всё началось", text: "Мы встретились там, где совсем не ждали любви. Разговор затянулся до позднего вечера, а на следующий день захотелось продолжить его снова." } },
    { type: "TEXT", content: { v: 1, tag: "История", title: "Первое свидание", text: "Вечерний город, прогулка без маршрута и маленькое кафе. Мы так увлеклись беседой, что не заметили, как пролетело время." } },
    { type: "TEXT", content: { v: 1, tag: "История", title: "Первое путешествие", text: "Через несколько месяцев мы отправились к морю. С тех пор любое приключение кажется ярче, когда можно разделить его друг с другом." } },
    { type: "TEXT", content: { v: 1, tag: "История", title: "Предложение", text: "Однажды на рассвете прозвучал вопрос, после которого началась новая глава нашей истории. Ответ, конечно, был «да»!" } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "16:00", title: "Сбор гостей", note: "Встретим вас игристым и тёплыми объятиями" },
      { time: "16:30", title: "Церемония", note: "Самый трогательный момент проживём вместе" },
      { time: "17:00", title: "Банкет", note: "Ужин, поздравления и танцы" },
      { time: "22:00", title: "Завершение", note: "Скажем друг другу «до скорой встречи»" },
    ] } },
    { type: "VENUE", content: { v: 1, title: "Локация", name: "Солнечная веранда", address: "г. Солнечногорск, Тимоновское ш., 36", note: "Наш праздник пройдёт на уютной веранде среди деревьев, рядом с озером.", imageUrl: IMG[1], mapUrl: "https://yandex.ru/maps/org/the_sun_lake/40246030321/", mapLabel: "Открыть карту" } },
    { type: "MAP", content: { v: 1, title: "Как добраться", yandexUrl: "https://yandex.ru/maps/org/the_sun_lake/40246030321/", googleUrl: "", note: "Откройте маршрут заранее, чтобы приехать вовремя." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Подарки", text: "Самый дорогой подарок — провести этот день с вами. Если захотите поддержать наши мечты, будем рады открытке с пожеланиями." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Цветы", text: "Вместо букета можно принести любимое вино. Мы откроем его на одном из будущих семейных вечеров и вспомним этот праздник." } },
    { type: "TEXT", content: { v: 1, tag: "Детали", title: "Небольшая просьба", text: "Давайте оставим поцелуи спонтанными и обойдёмся без традиционного «Горько»." } },
    { type: "DRESSCODE", content: { v: 1, title: "Дресс-код", text: "Будем рады, если ваши наряды поддержат мягкую палитру нашего праздника. Подойдут вечерние образы в природных и пастельных оттенках.", palette: ["#dce8ec", "#777e6a", "#d2d1be", "#cda6ae", "#e8d5cf"], imageUrl: IMG[2] } },
    { type: "PHOTOS", content: { v: 1, tag: "Дресс-код", title: "Мужчины", items: [{ imageUrl: IMG[9], caption: "Примеры мужских образов" }] } },
    { type: "RSVP_FORM", content: { v: 1, title: "Анкета гостя", text: "Ваш ответ поможет нам всё подготовить. Пожалуйста, сообщите о планах до 15.10.2027 г.", buttonLabel: "Отправить", attendanceLabel: "Сможете ли вы присутствовать на торжестве?", yesLabel: "Я приду / Мы придём", noLabel: "Прийти не получится", nameLabel: "Введите имя и фамилию", drinksLabel: "Предпочтения по напиткам", successText: "Спасибо! Ваш ответ получен." } },
    { type: "COUNTDOWN", content: { v: 1, title: "До свадьбы осталось:", doneText: "Сегодня наша свадьба!" } },
    { type: "TEXT", content: { v: 1, tag: "Контакты", title: "Екатерина", text: "Если появятся вопросы в день торжества, наш организатор поможет вам.\n+7 (123) 425-11-96" } },
    { type: "TEXT", content: { v: 1, title: "До встречи!", text: "С любовью, Валерия и Давид" } },
  ],
};
