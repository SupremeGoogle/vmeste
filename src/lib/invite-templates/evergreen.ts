import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
import { EVERGREEN_SAMPLE_IMAGES } from "@/lib/invite-templates/evergreen-assets";

/** Dark editorial invitation based on the supplied mobile reference. */
export const EVERGREEN_TEMPLATE: InviteTemplate = {
  id: "evergreen",
  name: "Эвергрин",
  mood: "Камерная вечерняя классика: глубокий зелёный, слоновая кость, тонкое золото и крупные фотографии. Текст и два снимка меняются прямо на странице.",
  theme: {
    ...defaultTheme(),
    template: "evergreen",
    bg: "#172018",
    card: "#f4f0e8",
    ink: "#1d241e",
    muted: "#737268",
    accent: "#a4834d",
    line: "#d8d0c2",
    leaf: "#324737",
    headingFont: "didona",
    bodyFont: "antiqua",
    corner: "soft",
    divider: "line",
    cover: "photo",
    timeline: "row",
    sections: "flat",
    dateStyle: "line",
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
        title: "Вместе — навсегда",
        names: "Валерия и Давид",
        dateText: "18 октября 2027",
        subtitle: "Приглашаем вас разделить с нами день, с которого начнётся наша семья",
        imageUrl: EVERGREEN_SAMPLE_IMAGES[0],
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        title: "Самые важные моменты становятся прекраснее, когда рядом близкие",
        text: "Мы будем счастливы видеть вас среди гостей нашего праздника. Давайте вместе сохраним этот вечер в памяти — тёплым, искренним и наполненным любовью.",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Локация",
        title: "Место нашей встречи",
        items: [{ imageUrl: EVERGREEN_SAMPLE_IMAGES[1], caption: "Вилла над морем · церемония на закате" }],
      },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        title: "Локация",
        name: "Вилла Санта Лючия",
        address: "Побережье Амальфи, Италия",
        note: "Сбор гостей в 16:00. Точный маршрут мы отправим ближе к празднику.",
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "Детали свадебного дня",
        title: "Этот день",
        items: [
          { time: "16:00", title: "Встреча гостей", note: "Аперитив на террасе" },
          { time: "16:30", title: "Церемония", note: "Самые важные слова" },
          { time: "18:00", title: "Ужин", note: "Тосты и истории о любви" },
          { time: "20:30", title: "Танцы", note: "Праздник под звёздами" },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "Дресс-код",
        title: "Дресс-код",
        text: "Будем рады вечерним образам в спокойной природной палитре.",
        palette: ["#172018", "#344637", "#857358", "#c1b7a5", "#eee8dc"],
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        tag: "Наша история в кадрах",
        title: "Мгновения, из которых сложится наша история",
        items: [
          { imageUrl: EVERGREEN_SAMPLE_IMAGES[2], caption: "Прикосновение, которое говорит больше слов" },
          { imageUrl: EVERGREEN_SAMPLE_IMAGES[3], caption: "Ужин при свечах над морем" },
          { imageUrl: EVERGREEN_SAMPLE_IMAGES[4], caption: "И пусть музыка не заканчивается" },
        ],
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "Ответ на приглашение",
        title: "Мы будем ждать вас",
        text: "Пожалуйста, подтвердите присутствие заранее — так мы сможем позаботиться о каждом госте.",
        buttonLabel: "Ответить на приглашение",
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "С любовью",
        title: "До встречи, с любовью",
        text: "Спасибо, что вы рядом. Впереди — наш самый красивый вечер.",
      },
    },
  ],
};
