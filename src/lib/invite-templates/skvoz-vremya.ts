import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";

const IMG = "/media/invite-skvoz-vremya";

export const SKVOZ_VREMYA_TEMPLATE: InviteTemplate = {
  id: "skvoz-vremya",
  name: "Сквозь время · цвет",
  mood: "Кинематографичная тёмная обложка, тёплая бумага, снимки как полароиды и нежная пастельная палитра.",
  theme: {
    ...defaultTheme(), template: "skvoz-vremya", bg: "#f6eee4", card: "#f6eee4", ink: "#463c35",
    muted: "#837970", accent: "#8c574a", line: "#cfc3b7", leaf: "#8c9985",
    headingFont: "didona", bodyFont: "antiqua", corner: "sharp", divider: "none",
    cover: "plain", timeline: "row", sections: "flat", dateStyle: "line", intro: "none",
    decor: "none", paper: false, frame: false, timelineIcons: false, capsHeadings: false, align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: "Дорогие гости!", dateText: "20.06.2027", subtitle: "Мы счастливы пригласить вас на нашу свадьбу — день, который хочется разделить с самыми близкими.", imageUrl: `${IMG}/hero.webp` } },
    { type: "TEXT", content: { v: 1, tag: "Наша история", title: "Узнаёте нас?", text: "Когда-то мы и представить не могли, сколько прекрасного ждёт впереди. Время шло, мы росли, менялись и в один день нашли друг друга.\nТеперь нам хочется начать новую главу рядом с вами — теми, кто был частью нашей истории." } },
    { type: "PHOTOS", content: { v: 1, title: "Сквозь годы", items: [{ imageUrl: `${IMG}/childhood.webp`, caption: "Наши первые истории" }, { imageUrl: `${IMG}/couple.webp`, caption: "И наша история сегодня" }] } },
    { type: "COUNTDOWN", content: { v: 1, title: "До нашей встречи осталось", doneText: "Сегодня наш день!" } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "15:00", title: "Сбор гостей", note: "Обнимемся и поднимем первый бокал" },
      { time: "16:00", title: "Церемония", note: "Начало нашей семейной истории" },
      { time: "17:00", title: "Праздничный ужин", note: "Тёплые слова, музыка и танцы" },
      { time: "22:00", title: "Торт", note: "Сладкое завершение прекрасного вечера" },
    ] } },
    { type: "VENUE", content: { v: 1, title: "Место встречи", name: "Загородный сад", address: "Москва, Большая Никитская улица, 22", note: "Мы будем ждать вас в саду, наполненном светом и летними цветами.", imageUrl: `${IMG}/venue.webp`, mapUrl: "https://yandex.ru/maps/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%20%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B0%D1%8F%20%D0%9D%D0%B8%D0%BA%D0%B8%D1%82%D1%81%D0%BA%D0%B0%D1%8F%2022", mapLabel: "Построить маршрут" } },
    { type: "TEXT", content: { v: 1, tag: "Пожелания", title: "Подарки", text: "Самый ценный подарок для нас — ваше присутствие. Если захочется порадовать нас ещё чем-то, мы будем благодарны за вклад в наше совместное будущее." } },
    { type: "TEXT", content: { v: 1, tag: "Пожелания", title: "Цветы", text: "После свадьбы мы отправимся в путешествие, поэтому просим не дарить цветы. Вместо букета можно захватить бутылочку вина для нашей семейной коллекции." } },
    { type: "TEXT", content: { v: 1, tag: "Пожелания", title: "Маленькая просьба", text: "Пусть поцелуи в этот вечер случаются только по зову сердца. Будем рады, если вы поддержите нас без традиционного «Горько!»." } },
    { type: "DRESSCODE", content: { v: 1, title: "Дресс-код", text: "Поддержите атмосферу праздника одеждой в мягких природных оттенках. Для вдохновения мы собрали небольшую палитру.", palette: ["#e8d8a1", "#d8b2b1", "#b6c9d6", "#e9c1a9", "#a9b9a4"] } },
    { type: "RSVP_FORM", content: { v: 1, title: "Вы будете с нами?", text: "Пожалуйста, ответьте до 20 мая 2027 года. Так мы сможем подготовить уютный вечер для каждого гостя.", buttonLabel: "Отправить ответ", attendanceLabel: "Сможете присутствовать?", yesLabel: "С радостью приду", noLabel: "К сожалению, не получится", nameLabel: "Ваше имя", drinksLabel: "Любимые напитки", successText: "Спасибо! Мы получили ваш ответ." } },
    { type: "TEXT", content: { v: 1, tag: "До встречи", title: "С любовью, Валерия и Давид", text: "20 июня 2027" } },
  ],
};
