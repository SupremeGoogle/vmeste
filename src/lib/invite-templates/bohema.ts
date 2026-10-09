import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { BOHEMA_SAMPLE_IMAGES } from "@/lib/invite-templates/bohema-assets";

export const BOHEMA_TEMPLATE: InviteTemplate = {
  id: "bohema",
  name: "Богема",
  mood: "Тёплый бежевый пейзаж, арочная обложка, золотая ботаника и элегантная типографика. Богемное приглашение с программой, деталями и анкетой гостя.",
  theme: {
    ...defaultTheme(),
    template: "bohema",
    bg: "#fbf8ea",
    card: "#fbf8ea",
    ink: "#293222",
    muted: "#6b6e61",
    accent: "#a57a34",
    line: "#cfc4a8",
    leaf: "#39462e",
    headingFont: "didona",
    bodyFont: "grotesk",
    corner: "round",
    divider: "none",
    cover: "plain",
    timeline: "stack",
    sections: "flat",
    dateStyle: "line",
    intro: "none",
    decor: "none",
    paper: false,
    frame: false,
    timelineIcons: false,
    capsHeadings: false,
    align: "center",
  },
  blocks: [
    { type: "COVER", content: { v: 1, title: "Приглашают вас на свою свадьбу", names: "Валерия и Давид", dateText: "20 ноября 2027", subtitle: "В этот особенный день нам хочется быть рядом с самыми дорогими людьми.", imageUrl: "" } },
    { type: "TIMELINE", content: { v: 1, title: "Программа дня", items: [
      { time: "16:00", title: "Сбор гостей", note: "Встретимся за бокалом игристого и успеем обняться до начала праздника" },
      { time: "16:30", title: "Церемония", note: "Самый трогательный момент дня мы хотим прожить вместе с вами" },
      { time: "17:00", title: "Банкет", note: "Ужин, поздравления, танцы и разговоры до позднего вечера" },
      { time: "22:00", title: "Завершение", note: "Обнимемся на прощание и увезём домой тёплые воспоминания" },
    ] } },
    { type: "COUNTDOWN", content: { v: 1, title: "До торжества осталось:", doneText: "Сегодня наш праздник!" } },
    { type: "VENUE", content: { v: 1, title: "Место торжества", name: "Солнечная веранда", address: "г. Солнечногорск, Тимоновское ш., 36", note: "Сохраните адрес и загляните в карту перед выездом, чтобы легко нас найти.", imageUrl: BOHEMA_SAMPLE_IMAGES[2], mapUrl: "https://yandex.ru/maps/org/the_sun_lake/40246030321/", mapLabel: "Открыть карту" } },
    { type: "TEXT", content: { v: 1, tag: "Важные детали", title: "Подарки", text: "Лучший подарок для нас — ваше присутствие. Если захочется добавить что-то ещё, открытка с пожеланием и конверт будут очень кстати." } },
    { type: "TEXT", content: { v: 1, tag: "Важные детали", title: "Цветы", text: "Пожалуйста, не беспокойтесь о букете. Вместо цветов можно принести любимое вино: мы откроем его на одном из наших семейных вечеров." } },
    { type: "TEXT", content: { v: 1, tag: "Важные детали", title: "Небольшая просьба", text: "Мы мечтаем о спокойной и душевной атмосфере. Давайте оставим поцелуи спонтанными и обойдёмся без традиционного «Горько»." } },
    { type: "DRESSCODE", content: { v: 1, tag: "Рекомендации", title: "Дресс-код", text: "Для фотографий и общей атмосферы будем рады вечерним нарядам в мягких природных оттенках нашей палитры.", palette: ["#ded0be", "#d5bcc1", "#afbbb0", "#becad3", "#292f25"] } },
    { type: "PHOTOS", content: { v: 1, title: "Образы для гостей", items: [
      { imageUrl: BOHEMA_SAMPLE_IMAGES[3], caption: "Девушки" },
      { imageUrl: BOHEMA_SAMPLE_IMAGES[4], caption: "Мужчины" },
    ] } },
    { type: "RSVP_FORM", content: { v: 1, title: "Присутствие гостя", text: "Пожалуйста, расскажите о своих планах до 15.10.2027 г. Это поможет нам подготовить праздник для каждого.", buttonLabel: "Отправить", attendanceLabel: "Сможете ли вы присутствовать на торжестве?", yesLabel: "Я приду / Мы придём", noLabel: "Прийти не получится", nameLabel: "Введите имя и фамилию", drinksLabel: "Предпочтения по напиткам", successText: "Спасибо! Ваш ответ получен." } },
    { type: "TEXT", content: { v: 1, tag: "Организация торжества", title: "Наш организатор", text: "В день свадьбы с организационными вопросами поможет Екатерина.\n+7 (123) 425-11-96" } },
    { type: "TEXT", content: { v: 1, title: "До встречи!", text: "Будем рады разделить этот день с вами." } },
  ],
};

/** English sample: same sections and pictures as `BOHEMA_TEMPLATE.blocks`. */
export const BOHEMA_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "Invite you to celebrate their wedding", names: "Emily & James", dateText: "November 20, 2027", subtitle: "On this special day, we want to be surrounded by the people we love most.", imageUrl: "" } },
  { type: "TIMELINE", content: { v: 1, title: "Order of the day", items: [
    { time: "4:00 PM", title: "Guests arrive", note: "A glass of something sparkling and plenty of hugs before it all begins" },
    { time: "4:30 PM", title: "Ceremony", note: "The most moving moment of the day — we want to share it with you" },
    { time: "5:00 PM", title: "Dinner", note: "Dinner, toasts, dancing and conversation late into the evening" },
    { time: "10:00 PM", title: "Farewell", note: "Goodbye hugs and warm memories to take home" },
  ] } },
  { type: "COUNTDOWN", content: { v: 1, title: "Counting down to our day:", doneText: "Today is our celebration!" } },
  { type: "VENUE", content: { v: 1, title: "The venue", name: "Sunny Veranda", address: "36 Lakeshore Drive, Lake Placid, New York", note: "Save the address and check the map before you leave so you can find us easily.", imageUrl: BOHEMA_SAMPLE_IMAGES[2], mapUrl: "https://www.google.com/maps/search/?api=1&query=36%20Lakeshore%20Drive%2C%20Lake%20Placid%2C%20NY", mapLabel: "Open map" } },
  { type: "TEXT", content: { v: 1, tag: "Good to know", title: "Gifts", text: "Having you with us is the best gift. If you’d like to add something more, a card with your wishes would be lovely." } },
  { type: "TEXT", content: { v: 1, tag: "Good to know", title: "Flowers", text: "Please don’t worry about a bouquet. Instead of flowers, bring a bottle of your favorite wine — we’ll open it on one of our family evenings." } },
  { type: "TEXT", content: { v: 1, tag: "Good to know", title: "A small request", text: "We’re dreaming of a calm, heartfelt atmosphere, so we kindly ask for an unplugged ceremony — let’s keep phones and cameras away." } },
  { type: "DRESSCODE", content: { v: 1, tag: "Suggestions", title: "Dress code", text: "For the photos and the overall mood, we’d love to see evening wear in the soft natural tones of our palette.", palette: ["#ded0be", "#d5bcc1", "#afbbb0", "#becad3", "#292f25"] } },
  { type: "PHOTOS", content: { v: 1, title: "Outfit ideas", items: [
    { imageUrl: BOHEMA_SAMPLE_IMAGES[3], caption: "For her" },
    { imageUrl: BOHEMA_SAMPLE_IMAGES[4], caption: "For him" },
  ] } },
  { type: "RSVP_FORM", content: { v: 1, title: "RSVP", text: "Please let us know your plans by October 15, 2027. It will help us prepare the day for everyone.", buttonLabel: "Send", attendanceLabel: "Will you be able to attend?", yesLabel: "Joyfully accepts", noLabel: "Regretfully declines", nameLabel: "Your full name", drinksLabel: "Drink preferences", successText: "Thank you! We’ve received your reply." } },
  { type: "TEXT", content: { v: 1, tag: "Wedding coordination", title: "Our wedding planner", text: "On the day, our planner Kate will be happy to help with any questions.\n+1 (555) 425-1196" } },
  { type: "TEXT", content: { v: 1, title: "See you soon!", text: "We can’t wait to share this day with you." } },
];
