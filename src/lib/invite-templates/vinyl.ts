import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { VINYL_SAMPLE_IMAGES } from "@/lib/invite-templates/vinyl-assets";

/**
 * «Винил» — шумная розовая свадьба-вечеринка.
 *
 * Открывается не конвертом, а пластинкой: гость нажимает на неё, игла
 * опускается, и приглашение раскрывается. Дальше — розовый фон, крупные
 * оранжевые имена, снимки, разбросанные под углом, и подписи капсом
 * вразрядку. Шаблон для тех, у кого на свадьбе главное — танцы.
 */
export const VINYL_TEMPLATE: InviteTemplate = {
  id: "vinyl",
  name: "Винил",
  mood: "Розовая вечеринка с пластинкой на обложке: оранжевые заголовки, снимки под углом, искорки и много танцев.",
  theme: {
    ...defaultTheme(),
    template: "vinyl",
    bg: "#f7dbe8",
    card: "#fdf3f6",
    ink: "#3a2630",
    muted: "#947885",
    accent: "#e8794a",
    line: "#f0c3d8",
    leaf: "#f2a9c6",
    headingFont: "didona",
    bodyFont: "grotesk",
    corner: "round",
    divider: "none",
    cover: "photo",
    timeline: "stack",
    sections: "flat",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: false,
    frame: false,
    timelineIcons: false,
    capsHeadings: true,
    align: "center",
  },
  blocks: [
    {
      type: "COVER",
      content: {
        v: 1,
        title: "Приглашаем вас на нашу свадьбу",
        names: "Валерия и Давид",
        dateText: "20 ноября 2027",
        subtitle: "Будет много танцев, объятий и любви!",
        imageUrl: VINYL_SAMPLE_IMAGES[0],
        // Пять плиток вокруг имён: живые кадры вперемешку с фотографиями
        // пары — обложка из одних только анимаций читается как коллаж
        // мемов, а не как приглашение.
        photos: [
          { imageUrl: VINYL_SAMPLE_IMAGES[1], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[2], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[5], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[6], caption: "" },
        ],
        footer: "С любовью, Валерия и Давид",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Дорогие гости",
        title: "Мы женимся!",
        text: "С огромным волнением и радостью приглашаем вас разделить с нами этот особенный день. Это будет незабываемый вечер, и мы очень хотим, чтобы вы стали его частью.",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До торжества осталось", doneText: "Сегодня тот самый день — мы вас ждём!" },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Расписание",
        title: "Тайминг",
        items: [
          { time: "15:30", title: "Сбор гостей", note: "Время пролетит незаметно за игристым, лёгкими закусками и общением" },
          { time: "16:00", title: "Выездная регистрация", note: "На всякий случай приготовьте носовые платочки" },
          { time: "16:30", title: "Начало торжества", note: "Время вкусной еды, зажигательных танцев и развлечений" },
          { time: "00:00", title: "Завершение торжества", note: "Уютные объятия и много ярких впечатлений" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Наряды",
        title: "Дресс-код",
        text: "Для нас главное — ваше присутствие! Но мы будем очень рады, если вы поддержите стиль вечера и выберете наряд в нашей палитре.",
        palette: ["#d8557f", "#b98a92", "#ddc98a", "#dfa13c", "#5d5a2a"],
        imageUrl: "",
      },
    },
    {
      // Примеры образов сразу под палитрой: цвет в кружке и цвет на живом
      // человеке — разные вещи, и гости одеваются по второму.
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "",
        title: "",
        items: [
          { imageUrl: VINYL_SAMPLE_IMAGES[9], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[10], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[11], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[12], caption: "" },
        ],
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "",
        title: "",
        items: [
          { imageUrl: VINYL_SAMPLE_IMAGES[7], caption: "" },
          { imageUrl: VINYL_SAMPLE_IMAGES[8], caption: "" },
        ],
      },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Место",
        title: "Где всё случится",
        name: "Усадьба «Вишнёвый сад»",
        address: "Московская обл., д. Полушкино, Садовая улица, 7",
        note: "Приходите чуть раньше — встретим вас у входа.",
        imageUrl: VINYL_SAMPLE_IMAGES[4],
        mapUrl: "",
        mapLabel: "Открыть карту",
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Анкета гостя",
        title: "Будете с нами?",
        text: "Ваши ответы очень помогут нам с подготовкой. Пожалуйста, ответьте до 15 октября.",
        buttonLabel: "Ответить",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "20 · 11 · 27",
        title: "До встречи на танцполе!",
        text: "С любовью, Валерия и Давид.",
      },
    },
  ],
};
