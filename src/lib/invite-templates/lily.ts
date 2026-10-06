import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
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
