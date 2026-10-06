import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { SILK_SAMPLE_IMAGES } from "@/lib/invite-templates/silk-assets";

/** Romantic destination-wedding invitation inspired by silk and pressed flowers. */
export const SILK_TEMPLATE: InviteTemplate = {
  id: "silk",
  name: "Шёлк",
  mood: "Романтичный свадебный день в одной локации: пудровый шёлк, винные акценты, волнообразные карточки, фотоколлаж и лёгкая ботаническая анимация.",
  theme: {
    ...defaultTheme(),
    template: "silk",
    bg: "#ead4cf",
    card: "#fff8f2",
    ink: "#5b302f",
    muted: "#8d6f69",
    accent: "#a84f49",
    line: "#e6c8c0",
    leaf: "#9a665e",
    headingFont: "didona",
    bodyFont: "antiqua",
    corner: "round",
    divider: "line",
    cover: "photo",
    timeline: "row",
    sections: "card",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: true,
    frame: false,
    timelineIcons: true,
    capsHeadings: false,
    align: "center",
  },
  blocks: [
    {
      type: "COVER",
      content: {
        v: 1,
        title: "Вы приглашены на нашу свадьбу",
        names: "Валерия и Давид",
        dateText: "14 октября 2027 · Амальфи, Италия",
        subtitle: "Одна любовь. Новая глава. Целая жизнь вместе.",
        imageUrl: SILK_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "Разные места · одна любовь",
        title: "Наша история",
        text: "Разные города, одна дорога и бесконечно много причин улыбаться друг другу. Мы хотим прожить этот новый день рядом с теми, кто нам особенно дорог.",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Один прекрасный день",
        title: "Атмосфера нашего дня",
        items: [
          { imageUrl: SILK_SAMPLE_IMAGES[1], caption: "Церемония на террасе над морем" },
          { imageUrl: SILK_SAMPLE_IMAGES[2], caption: "Ужин при свечах в саду виллы" },
          { imageUrl: SILK_SAMPLE_IMAGES[0], caption: "Один день, который останется с нами" },
        ],
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До встречи у моря", doneText: "Наш праздник начинается сегодня!" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "Единственная локация",
        title: "Единственная локация",
        name: "Вилла Челестина",
        address: "Побережье Амальфи, Италия",
        note: "Церемония, ужин и вечерняя программа пройдут здесь.",
        imageUrl: SILK_SAMPLE_IMAGES[1],
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Главный день",
        title: "Главный день",
        items: [
          { time: "16:00", title: "Сбор гостей", note: "Лимонад и аперитив на террасе" },
          { time: "17:00", title: "Церемония", note: "Закат и самые важные слова" },
          { time: "18:30", title: "Праздничный ужин", note: "Тосты, свечи и итальянская кухня" },
          { time: "21:00", title: "Танцы", note: "Музыка до поздней ночи" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Палитра вечера",
        text: "Будем рады лёгким вечерним образам в оттенках розового вина, пудры и тёплого песка.",
        palette: ["#6f292d", "#a84f49", "#d49a91", "#ead0c8", "#f6ebe5"],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ответ на приглашение",
        title: "Будете с нами?",
        text: "Пожалуйста, подтвердите присутствие заранее. Мы хотим подготовить этот день с заботой о каждом госте.",
        buttonLabel: "Отправить ответ",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "С любовью",
        title: "С благодарностью и любовью",
        text: "Собираем красивые воспоминания вместе с вами.",
      },
    },
  ],
};
