import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
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

const SERDCE_MAP_EN = "https://www.google.com/maps/search/?api=1&query=Lake%20Arrowhead%2C%20California";

/**
 * Образец для английской свадьбы: те же разделы и снимки. Служебные теги
 * («Story», «Details», «Contacts», «Dress code») разметка узнаёт так же,
 * как русские.
 */
export const SERDCE_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, names: "Emily & James", title: "Wedding invitation", dateText: "November 20, 2027", subtitle: "Family and friends! A new chapter of our lives is beginning, and we want to spend this day with you by our side.", imageUrl: IMG[0], footer: "With love, Emily & James" } },
  { type: "PHOTOS", content: { v: 1, title: "Our story", items: IMG.slice(3, 7).map((imageUrl) => ({ imageUrl, caption: "" })) } },
  { type: "PHOTOS", content: { v: 1, title: "Our story continues", items: IMG.slice(7, 9).map((imageUrl) => ({ imageUrl, caption: "" })) } },
  { type: "TEXT", content: { v: 1, tag: "Story", title: "Hi, everyone!", text: "Once upon a time, we each walked our own path. One meeting changed everything: now we make plans together, laugh at little things and count the days to our biggest day." } },
  { type: "TEXT", content: { v: 1, tag: "Story", title: "How it all began", text: "We met where we least expected to find love. Our conversation lasted late into the evening, and the next day we couldn’t wait to pick it up again." } },
  { type: "TEXT", content: { v: 1, tag: "Story", title: "Our first date", text: "The city at night, a walk with no plan and a tiny café. We got so caught up talking that we didn’t notice the hours fly by." } },
  { type: "TEXT", content: { v: 1, tag: "Story", title: "Our first trip", text: "A few months later, we went to the sea. Ever since, every adventure feels brighter when we share it with each other." } },
  { type: "TEXT", content: { v: 1, tag: "Story", title: "The proposal", text: "One morning at sunrise came the question that opened a new chapter of our story. The answer, of course, was “yes”!" } },
  { type: "TIMELINE", content: { v: 1, title: "Order of the day", items: [
    { time: "4:00 PM", title: "Guests arrive", note: "We’ll greet you with bubbly and warm hugs" },
    { time: "4:30 PM", title: "Ceremony", note: "The most moving moment — we’ll share it together" },
    { time: "5:00 PM", title: "Dinner", note: "Dinner, toasts and dancing" },
    { time: "10:00 PM", title: "Farewell", note: "We’ll say “see you soon” to one another" },
  ] } },
  { type: "VENUE", content: { v: 1, title: "Location", name: "The Lakeside Veranda", address: "36 Lakeview Drive, Lake Arrowhead, California", note: "We’ll celebrate on a cozy veranda among the trees, right by the lake.", imageUrl: IMG[1], mapUrl: SERDCE_MAP_EN, mapLabel: "Open map" } },
  { type: "MAP", content: { v: 1, title: "Getting there", yandexUrl: SERDCE_MAP_EN, googleUrl: "", note: "Check the route ahead of time so you arrive on time." } },
  { type: "TEXT", content: { v: 1, tag: "Details", title: "Gifts", text: "The most precious gift is spending this day with you. If you’d like to support our dreams, a card with your wishes would make us so happy." } },
  { type: "TEXT", content: { v: 1, tag: "Details", title: "Flowers", text: "Instead of a bouquet, feel free to bring a wine you love. We’ll open it on one of our future family evenings and remember this celebration." } },
  { type: "TEXT", content: { v: 1, tag: "Details", title: "A small request", text: "Let’s keep the kisses spontaneous — no need to clink glasses for them." } },
  { type: "DRESSCODE", content: { v: 1, title: "Dress code", text: "We’d love it if your outfits matched the soft palette of our celebration. Evening looks in natural and pastel shades are perfect.", palette: ["#dce8ec", "#777e6a", "#d2d1be", "#cda6ae", "#e8d5cf"], imageUrl: IMG[2] } },
  { type: "PHOTOS", content: { v: 1, tag: "Dress code", title: "For him", items: [{ imageUrl: IMG[9], caption: "Outfit ideas for men" }] } },
  { type: "RSVP_FORM", content: { v: 1, title: "RSVP", text: "Your reply helps us get everything ready. Please let us know your plans by October 15, 2027.", buttonLabel: "Send", attendanceLabel: "Will you be able to attend?", yesLabel: "I’ll be there / We’ll be there", noLabel: "Sadly, can’t make it", nameLabel: "Your full name", drinksLabel: "Drink preferences", successText: "Thank you! We’ve received your reply." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Counting down to our wedding:", doneText: "Today is our wedding day!" } },
  { type: "TEXT", content: { v: 1, tag: "Contacts", title: "Kate", text: "If you have any questions on the day, our wedding planner will be happy to help.\n+1 (555) 425-1196" } },
  { type: "TEXT", content: { v: 1, title: "See you soon!", text: "With love, Emily & James" } },
];
