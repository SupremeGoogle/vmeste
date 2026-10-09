import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { LILY_SAMPLE_IMAGES } from "@/lib/invite-templates/lily-assets";

/**
 * «Лилия» — оливковые полосы, волны и контурные цветы.
 *
 * Страница идёт лентой: белая полоса с именами, волна — и глубокая
 * оливковая полоса с историей пары, снова волна — и белая с датой.
 * Заставки нет: приглашение открывается сразу, а музыку включает
 * кнопка воспроизведения под обложкой.
 */
export const LILY_TEMPLATE: InviteTemplate = {
  id: "lily",
  name: "Лилия",
  mood: "Глубокий оливковый и белый полосами, волнистые переходы, контурные лилии и рукописные заголовки. Спокойное приглашение для камерной свадьбы на природе.",
  theme: {
    ...defaultTheme(),
    template: "lily",
    bg: "#ffffff",
    card: "#f6f4ee",
    ink: "#013131",
    muted: "#7d8a72",
    accent: "#4e5744",
    line: "#dfe3d8",
    leaf: "#4e5744",
    headingFont: "didona",
    bodyFont: "grotesk",
    corner: "round",
    divider: "none",
    cover: "frame",
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
    {
      type: "COVER",
      content: {
        v: 1,
        title: "Приглашают вас на свою свадьбу",
        names: "Валерия и Давид",
        dateText: "20 ноября 2027",
        subtitle: "",
        imageUrl: LILY_SAMPLE_IMAGES[0],
        photos: [],
        footer: "",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "",
        title: "Наша история",
        text: "Мы одновременно потянулись за последним попкорном в автомате у кинотеатра. «Делить или бороться?» — улыбнулся он. Я выбрала делить, а заодно и фильм: оказалось, мы идём на один и тот же. Так начался наш вечер, а потом и что-то большее.",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "",
        title: "Дорогие гости!",
        text: "Мы хотим разделить с вами самый важный день в нашей жизни и приглашаем вас на нашу свадьбу.\nМы с нетерпением ждём возможности увидеть вас и вместе отпраздновать начало нашего совместного пути.",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До торжества осталось", doneText: "Сегодня тот самый день!" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "",
        title: "Локация",
        name: "Солнечная веранда",
        address: "г. Солнечногорск, Тимоновское шоссе, 36",
        note: "Карта поможет быстрее найти место торжества и добраться вовремя.",
        imageUrl: LILY_SAMPLE_IMAGES[1],
        mapUrl: "",
        mapLabel: "Открыть карту",
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "",
        title: "Программа дня",
        items: [
          { time: "14:00", title: "Сбор гостей", note: "Время пролетит незаметно за игристым, лёгкими закусками и общением с другими гостями" },
          { time: "14:30", title: "Свадебная церемония", note: "Вы станете свидетелями создания новой семьи — нашей семьи" },
          { time: "15:00", title: "Банкет", note: "Время вкусной еды, зажигательных танцев и развлечений" },
          { time: "22:00", title: "Финал вечера", note: "Уютные объятия и много ярких впечатлений!" },
        ],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Детали",
        title: "Подарки",
        text: "Если вы хотите подарить нам что-то ценное и нужное, мы будем признательны за вклад в наше свадебное путешествие.",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Детали",
        title: "Цветы",
        text: "Пожалуйста, не дарите нам цветы: мы не успеем их сохранить. Лучшим комплиментом будет бутылочка вашего любимого вина.",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Детали",
        title: "Формат торжества",
        text: "Праздник в формате 18+, поэтому просим заранее продумать, с кем останутся дети.",
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "",
        title: "Дресс-код",
        text: "Нам будет очень приятно, если вы учтёте наши пожелания и выберете наряд в оттенках нашей свадьбы.",
        palette: ["#4e5744", "#8c9b7c", "#c9c2ac", "#e4ded0", "#013131"],
        imageUrl: "",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "",
        title: "",
        items: [
          { imageUrl: LILY_SAMPLE_IMAGES[2], caption: "Девушки" },
          { imageUrl: LILY_SAMPLE_IMAGES[3], caption: "Мужчины" },
        ],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "",
        title: "Анкета гостя",
        text: "Ваши ответы очень помогут нам при организации свадьбы. Будем ждать ответ до 15 октября.",
        buttonLabel: "Ответить",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "",
        title: "Контакты",
        text: "Если в день торжества возникнут вопросы, звоните нашему организатору Екатерине: +7 999 000-00-00.",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "",
        title: "До встречи!",
        text: "С любовью, Валерия и Давид.",
      },
    },
  ],
};

/** Образец для английской свадьбы: те же разделы и снимки. */
export const LILY_BLOCKS_EN: TemplateBlock[] = [
  { type: "COVER", content: { v: 1, title: "invite you to their wedding", names: "Emily & James", dateText: "November 20, 2027", subtitle: "", imageUrl: LILY_SAMPLE_IMAGES[0], photos: [], footer: "" } },
  { type: "TEXT", content: { v: 1, tag: "", title: "Our story", text: "We both reached for the last bag of popcorn at the movie theater at the very same moment. “Share or fight for it?” he smiled. I chose to share — and it turned out we were seeing the same film, too. That’s how our evening began, and then something much bigger." } },
  { type: "TEXT", content: { v: 1, tag: "", title: "Dear friends and family,", text: "We want to share the most important day of our lives with you, and we’d be honored to have you at our wedding.\nWe can’t wait to see you and celebrate the beginning of our journey together." } },
  { type: "COUNTDOWN", content: { v: 1, title: "Counting down to the big day", doneText: "Today is the day!" } },
  { type: "VENUE", content: { v: 1, tag: "", title: "Location", name: "The Sunny Veranda", address: "36 Lakeview Road, Lake Geneva, Wisconsin", note: "The map will help you find the venue quickly and arrive on time.", imageUrl: LILY_SAMPLE_IMAGES[1], mapUrl: "", mapLabel: "Open map" } },
  { type: "TIMELINE", content: { v: 1, tag: "", title: "Order of the day", items: [
    { time: "2:00 PM", title: "Guests arrive", note: "Time will fly with bubbly, light bites and catching up with other guests" },
    { time: "2:30 PM", title: "Ceremony", note: "You’ll witness the start of a new family — ours" },
    { time: "3:00 PM", title: "Dinner", note: "Great food, a lively dance floor and plenty of fun" },
    { time: "10:00 PM", title: "Farewell", note: "Warm hugs and lots of happy memories!" },
  ] } },
  { type: "TEXT", content: { v: 1, tag: "Details", title: "Gifts", text: "If you’d like to give us something meaningful, a contribution to our honeymoon would make us very grateful." } },
  { type: "TEXT", content: { v: 1, tag: "Details", title: "Flowers", text: "Please don’t bring flowers — we won’t be able to keep them. A bottle of your favorite wine would be the loveliest compliment." } },
  { type: "TEXT", content: { v: 1, tag: "Details", title: "Adults only", text: "Our celebration is adults only, so please plan ahead for childcare." } },
  { type: "DRESSCODE", content: { v: 1, tag: "", title: "Dress code", text: "It would mean a lot to us if you chose an outfit in the shades of our wedding.", palette: ["#4e5744", "#8c9b7c", "#c9c2ac", "#e4ded0", "#013131"], imageUrl: "" } },
  { type: "PHOTOS", content: { v: 1, tag: "", title: "", items: [
    { imageUrl: LILY_SAMPLE_IMAGES[2], caption: "For her" },
    { imageUrl: LILY_SAMPLE_IMAGES[3], caption: "For him" },
  ] } },
  { type: "RSVP_FORM", content: { v: 1, tag: "", title: "RSVP", text: "Your answers will really help us plan the wedding. Please reply by October 15.", buttonLabel: "Reply" } },
  { type: "TEXT", content: { v: 1, tag: "", title: "Contacts", text: "If you have any questions on the day, please call our wedding planner, Kate: +1 555 000 0000." } },
  { type: "TEXT", content: { v: 1, tag: "", title: "See you soon!", text: "With love, Emily & James." } },
];
