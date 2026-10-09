import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { SCRAPBOOK_SAMPLE_IMAGES } from "@/lib/invite-templates/scrapbook-assets";

function scrapbookTemplate(id: "zefir" | "crayon"): InviteTemplate {
  const zefir = id === "zefir";
  return {
    id, version: 1, name: zefir ? "Зефир" : "Детство",
    mood: zefir ? "Скрапбук-история: бумажные сердечки, полароиды и карточка с сюрпризом." : "Жених и невеста: детские фотографии, рисунки мелками и тёплая история любви.",
    theme: {
      ...defaultTheme(), template: id, bg: zefir ? "#faf4ef" : "#fffbed", card: zefir ? "#faf4ef" : "#fffbed",
      ink: "#493d38", muted: "#87736d", accent: zefir ? "#b96583" : "#ad5578", line: "#e4d6c8", leaf: "#a2b29c",
      headingFont: "antiqua", bodyFont: "grotesk", corner: "soft", divider: "none", cover: "plain",
      timeline: "row", sections: "flat", intro: "none", decor: "none", paper: false, frame: false, capsHeadings: false,
    },
    blocks: [
      { type: "COVER", content: { v: 1, names: "Валерия и Давид", title: zefir ? "Приглашаем вас на нашу свадьбу!" : "Тили-тили тесто, у нас жених и невеста!", dateText: "12.09.2027",
        subtitle: "Когда-то мы были маленькими мечтателями. А теперь выросли, нашли друг друга и приглашаем вас стать частью нашей семейной истории.",
        imageUrl: zefir ? "/media/invite-skvoz-vremya/couple.webp" : SCRAPBOOK_SAMPLE_IMAGES[2], photos: [
          { imageUrl: SCRAPBOOK_SAMPLE_IMAGES[0], caption: "Будущий жених" },
          { imageUrl: SCRAPBOOK_SAMPLE_IMAGES[1], caption: "Будущая невеста" },
        ], footer: "С любовью," } },
      { type: "CALENDAR", content: { v: 1, title: "Тот самый день", message: "Обведите сердечком эту дату — мы очень ждём встречи с вами." } },
      { type: "COUNTDOWN", content: { v: 1, title: "До нашей новой главы", doneText: "Сегодня наш праздник!" } },
      { type: "TIMELINE", content: { v: 1, title: zefir ? "План счастливого дня" : "Наш день по минутам", items: [
        { time: "15:00", title: "Встреча гостей", note: "Обнимемся, познакомимся и поднимем первые бокалы" },
        { time: "16:00", title: "Церемония", note: "Скажем друг другу самые важные слова" },
        { time: "17:00", title: "Праздничный ужин", note: "Тёплые истории, любимая музыка и танцы" },
        { time: "21:00", title: "Свадебный торт", note: "Самый сладкий момент вечера" },
        { time: "23:00", title: "До новых встреч", note: "Сохраним этот день в нашем семейном альбоме" },
      ] } },
      { type: "VENUE", content: { v: 1, title: "Место нашей встречи", name: "Загородный сад", address: "Москва, Большая Никитская улица, 22", note: "Уютный сад, близкие люди и один очень счастливый день.", imageUrl: "/media/invite-skvoz-vremya/venue.webp", mapUrl: "https://yandex.ru/maps/?text=Москва%20Большая%20Никитская%2022", mapLabel: "Построить маршрут" } },
      { type: "DRESSCODE", content: { v: 1, title: "Цвета нашего праздника", text: zefir ? "Пусть ваши наряды станут частью нашего нежного бумажного альбома. Будем рады мягким оттенкам из этой палитры." : "Как коробка любимых мелков: немного небесного, розового, зелёного и солнечного. Выберите оттенок, в котором вам хорошо.", palette: zefir ? ["#dbc6ad", "#c787a0", "#a8b59c", "#d9dea6"] : ["#a8c6d7", "#c787a0", "#a8b59c", "#edcb78"], imageUrl: "/media/invite-tili/dresscode.webp" } },
      { type: "PHOTOS", content: { v: 1, title: "Наш маленький альбом", items: [
        { imageUrl: "/media/invite-skvoz-vremya/hero.webp", caption: "Вместе — наше любимое место" },
        { imageUrl: "/media/invite-skvoz-vremya/couple.webp", caption: "Впереди целая жизнь" },
      ] } },
      { type: "TEXT", content: { v: 1, tag: "Маленькая просьба", title: "Вместо цветов", text: "После свадьбы мы отправимся в путешествие. Вместо букета можно принести бутылочку любимого вина для нашей семейной коллекции." } },
      { type: "RSVP_FORM", content: { v: 1, title: "Вы будете с нами?", text: "Пожалуйста, ответьте до 10 августа 2027 года. Так мы сможем продумать праздник для каждого из вас.", nameLabel: "Ваше имя и фамилия", attendanceLabel: "Сможете прийти?", yesLabel: "Да, с радостью!", noLabel: "К сожалению, не получится", drinksLabel: "Ваши любимые напитки", buttonLabel: "Отправить ответ", successText: "Спасибо! До встречи на нашем празднике." } },
      { type: "TEXT", content: { v: 1, tag: "С любовью", title: "До встречи на нашей свадьбе!", text: "Пусть этот день станет ещё одним тёплым воспоминанием, которое мы сохраним вместе с вами.\nЕсли возникнут вопросы, напишите нам." } },
    ],
  };
}

export const ZEFIR_TEMPLATE = scrapbookTemplate("zefir");
export const CRAYON_TEMPLATE = scrapbookTemplate("crayon");

/** English sample: same sections and pictures as `scrapbookTemplate(id).blocks`. */
function scrapbookBlocksEn(id: "zefir" | "crayon"): TemplateBlock[] {
  const zefir = id === "zefir";
  return [
    { type: "COVER", content: { v: 1, names: "Emily & James", title: zefir ? "We’re inviting you to our wedding!" : "First comes love, then comes marriage!", dateText: "September 12, 2027",
      subtitle: "Once upon a time we were two little dreamers. Now we’ve grown up, found each other, and we’d love for you to become part of our family story.",
      imageUrl: zefir ? "/media/invite-skvoz-vremya/couple.webp" : SCRAPBOOK_SAMPLE_IMAGES[2], photos: [
        { imageUrl: SCRAPBOOK_SAMPLE_IMAGES[0], caption: "The groom-to-be" },
        { imageUrl: SCRAPBOOK_SAMPLE_IMAGES[1], caption: "The bride-to-be" },
      ], footer: "With love," } },
    { type: "CALENDAR", content: { v: 1, title: "The big day", message: "Draw a little heart around this date — we can’t wait to see you." } },
    { type: "COUNTDOWN", content: { v: 1, title: "Until our next chapter", doneText: "Today is our celebration!" } },
    { type: "TIMELINE", content: { v: 1, title: zefir ? "Plan for a happy day" : "Our day, minute by minute", items: [
      { time: "3:00 PM", title: "Guests arrive", note: "Hugs, introductions and the first glasses raised" },
      { time: "4:00 PM", title: "Ceremony", note: "We’ll say the most important words to each other" },
      { time: "5:00 PM", title: "Dinner", note: "Heartfelt stories, favorite songs and dancing" },
      { time: "9:00 PM", title: "Wedding cake", note: "The sweetest moment of the evening" },
      { time: "11:00 PM", title: "Farewell", note: "We’ll keep this day in our family album" },
    ] } },
    { type: "VENUE", content: { v: 1, title: "Where we’ll meet", name: "The Garden House", address: "22 Orchard Road, Sonoma, CA", note: "A cozy garden, the people we love and one very happy day.", imageUrl: "/media/invite-skvoz-vremya/venue.webp", mapUrl: "https://www.google.com/maps/search/?api=1&query=22%20Orchard%20Road%2C%20Sonoma%2C%20CA", mapLabel: "Get directions" } },
    { type: "DRESSCODE", content: { v: 1, title: "Colors of our celebration", text: zefir ? "Let your outfits become part of our soft paper album. We’d love to see gentle shades from this palette." : "Like a box of favorite crayons: a little sky blue, pink, green and sunshine. Pick the shade you feel great in.", palette: zefir ? ["#dbc6ad", "#c787a0", "#a8b59c", "#d9dea6"] : ["#a8c6d7", "#c787a0", "#a8b59c", "#edcb78"], imageUrl: "/media/invite-tili/dresscode.webp" } },
    { type: "PHOTOS", content: { v: 1, title: "Our little album", items: [
      { imageUrl: "/media/invite-skvoz-vremya/hero.webp", caption: "Together is our favorite place" },
      { imageUrl: "/media/invite-skvoz-vremya/couple.webp", caption: "A whole life ahead" },
    ] } },
    { type: "TEXT", content: { v: 1, tag: "A small request", title: "Instead of flowers", text: "Right after the wedding we’re heading off on a trip. Instead of a bouquet, feel free to bring a bottle of your favorite wine for our family collection." } },
    { type: "RSVP_FORM", content: { v: 1, title: "Will you join us?", text: "Please reply by August 10, 2027. It will help us plan the celebration for each of you.", nameLabel: "Your full name", attendanceLabel: "Will you be able to come?", yesLabel: "Yes, with pleasure!", noLabel: "Sadly, I can’t make it", drinksLabel: "Your favorite drinks", buttonLabel: "Send reply", successText: "Thank you! See you at our celebration." } },
    { type: "TEXT", content: { v: 1, tag: "With love", title: "See you at our wedding!", text: "May this day become one more warm memory we share with you.\nIf you have any questions, just send us a message." } },
  ];
}

export const ZEFIR_BLOCKS_EN = scrapbookBlocksEn("zefir");
export const CRAYON_BLOCKS_EN = scrapbookBlocksEn("crayon");
