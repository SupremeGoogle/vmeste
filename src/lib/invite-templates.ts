/**
 * Готовые шаблоны приглашения.
 *
 * Шаблон — это две вещи сразу: тема оформления и набор блоков, с которого
 * человек начинает. Второе важнее первого. Пустое приглашение с красивой
 * палитрой — это по-прежнему пустой лист, перед которым садятся и не
 * знают, что писать. Шаблон отвечает на вопрос «а что вообще принято
 * писать в приглашении», и уже потом — «как оно выглядит».
 *
 * Поэтому блоки приходят с заполненным текстом-примером, а не пустыми:
 * человеку править готовое куда легче, чем сочинять с нуля, и он сразу
 * видит, как это будет выглядеть у гостя.
 *
 * Три шаблона выбраны так, чтобы отличаться не оттенком, а характером:
 * светлый воздушный, тёмный вечерний и строгий современный. Четвёртый
 * «такой же, но бежевее» не нужен никому.
 */
import type { BlockType } from "@/generated/prisma/enums";
import type { InviteTheme } from "@/lib/invite-theme";
import { defaultTheme } from "@/lib/invite-theme";

export type TemplateBlock = {
  type: BlockType;
  content: Record<string, unknown>;
};

export type InviteTemplate = {
  id: string;
  name: string;
  /** Одна строка о характере — её читают, выбирая шаблон. */
  mood: string;
  theme: InviteTheme;
  blocks: TemplateBlock[];
};

/** Общие блоки: расписание, место, дорога, дресс-код, ответ. */
function commonBlocks(): TemplateBlock[] {
  return [
    {
      type: "TIMELINE",
      content: {
        v: 1,
        title: "Расписание дня",
        items: [
          { time: "15:30", title: "Сбор гостей", note: "Welcome-напитки на террасе" },
          { time: "16:00", title: "Церемония", note: "" },
          { time: "17:00", title: "Фуршет и фотографии", note: "" },
          { time: "18:30", title: "Ужин", note: "" },
          { time: "22:00", title: "Первый танец", note: "" },
          { time: "00:00", title: "Завершение", note: "" },
        ],
      },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        title: "Где",
        name: "Усадьба «Рябинка»",
        address: "Московская область, Одинцовский район,\nдеревня Раздоры, 14",
        note: "Территория закрытая, на въезде назовите свою фамилию.",
      },
    },
    {
      type: "MAP",
      content: {
        v: 1,
        title: "Как добраться",
        yandexUrl: "",
        googleUrl: "",
        note: "От Москвы 40 минут по Рублёво-Успенскому шоссе. Парковка бесплатная, места хватит всем.",
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        title: "Подтвердите присутствие",
        text: "Нам важно знать заранее — чтобы рассадить всех рядом с теми, с кем хочется сидеть.",
        buttonLabel: "Ответить",
      },
    },
  ];
}

export const INVITE_TEMPLATES: InviteTemplate[] = [
  {
    id: "powder",
    name: "Пудра",
    mood: "Светлое и воздушное: кремовая бумага, тёплое золото, антиква. Подходит дневной свадьбе на воздухе.",
    theme: {
      ...defaultTheme(),
      template: "powder",
      bg: "#f7f1ea",
      card: "#fffdf9",
      ink: "#3b322c",
      muted: "#8a7c70",
      accent: "#b08968",
      line: "#e8dccd",
      headingFont: "antiqua",
      bodyFont: "antiqua",
      corner: "soft",
      divider: "leaf",
      cover: "photo",
      frame: false,
      capsHeadings: true,
      align: "center",
      decor: "corners",
      paper: true,
      leaf: "#9fae84",
    },
    blocks: [
      {
        type: "COVER",
        content: {
          v: 1,
          title: "Мы женимся",
          names: "Аня и Миша",
          dateText: "15 августа 2026",
          subtitle: "Дорогие наши! Мы будем счастливы разделить с вами этот день.",
          imageUrl: "",
        },
      },
      {
        type: "TEXT",
        content: {
          v: 1,
          title: "",
          text: "Восемь лет назад мы случайно оказались за одним столом.\nВ этом августе мы снова соберём всех за одним столом — уже не случайно.",
        },
      },
      ...commonBlocks(),
      {
        type: "DRESSCODE",
        content: {
          v: 1,
          title: "Дресс-код",
          text: "Будем рады, если вы поддержите палитру дня. Никакой строгости — главное, чтобы вам было удобно танцевать.",
          palette: ["#f2e5d7", "#e3c9b4", "#c9a68a", "#9fae84", "#6b7a53"],
        },
      },
    ],
  },

  {
    id: "emerald",
    name: "Изумруд",
    mood: "Тёмное и вечернее: глубокая зелень, золото, тонкие засечки. Для банкета при свечах.",
    theme: {
      ...defaultTheme(),
      template: "emerald",
      bg: "#12211c",
      card: "#1a2e27",
      ink: "#f2ece0",
      muted: "#a9bdb0",
      accent: "#cbab6d",
      line: "#2f4a40",
      headingFont: "didona",
      bodyFont: "antiqua",
      corner: "sharp",
      divider: "diamond",
      cover: "frame",
      frame: true,
      frameOrnament: true,
      capsHeadings: true,
      align: "center",
      paper: true,
      timelineIcons: true,
      leaf: "#7d9470",
    },
    blocks: [
      {
        type: "COVER",
        content: {
          v: 1,
          title: "Приглашение",
          names: "Аня и Миша",
          dateText: "15 августа 2026",
          subtitle: "Вечер, свечи и все, кого мы любим, — в одном зале.",
          imageUrl: "",
        },
      },
      ...commonBlocks(),
      {
        type: "DRESSCODE",
        content: {
          v: 1,
          title: "Дресс-код",
          text: "Вечерний. Тёмная зелень, изумруд, чернильный синий, золото — но если у вас есть любимое платье другого цвета, приходите в нём.",
          palette: ["#12211c", "#1e3a30", "#2f4a40", "#cbab6d", "#f2ece0"],
        },
      },
      {
        type: "TEXT",
        content: {
          v: 1,
          title: "О подарках",
          text: "Самый дорогой подарок — вы рядом. Если всё же захочется большего, мы копим на свадебное путешествие: конверт будет очень кстати, а цветы, к сожалению, завянут раньше, чем мы вернёмся.",
        },
      },
    ],
  },

  {
    id: "paper",
    name: "Бумага",
    mood: "Строгое и современное: белый лист, чёрный гротеск, крупные цифры, ничего лишнего.",
    theme: {
      ...defaultTheme(),
      template: "paper",
      bg: "#ffffff",
      card: "#ffffff",
      ink: "#111111",
      muted: "#6b6b6b",
      accent: "#111111",
      line: "#e2e2e2",
      headingFont: "grotesk",
      bodyFont: "grotesk",
      corner: "sharp",
      divider: "line",
      cover: "plain",
      frame: false,
      capsHeadings: false,
      align: "left",
    },
    blocks: [
      {
        type: "COVER",
        content: {
          v: 1,
          title: "",
          names: "Аня\nи Миша",
          dateText: "15.08.2026",
          subtitle: "Усадьба «Рябинка», 16:00",
          imageUrl: "",
        },
      },
      ...commonBlocks(),
      {
        type: "DRESSCODE",
        content: {
          v: 1,
          title: "Дресс-код",
          text: "Смарт-кэжуал. Без спортивной обуви — площадка с деревянным настилом.",
          palette: ["#111111", "#6b6b6b", "#c9c9c9", "#ffffff"],
        },
      },
    ],
  },

  {
    id: "envelope",
    name: "Конверт",
    mood: "Плотная кремовая бумага, золото и разрядка в именах. Разделы белыми карточками, расписание столбиком, дата крупными цифрами.",
    theme: {
      ...defaultTheme(),
      template: "envelope",
      bg: "#f4eee5",
      card: "#fffdfa",
      ink: "#3a3128",
      muted: "#a3927c",
      accent: "#b3925c",
      line: "#e7dccb",
      headingFont: "didona",
      bodyFont: "antiqua",
      corner: "round",
      divider: "leaf",
      cover: "photo",
      dateStyle: "display",
      timeline: "stack",
      sections: "card",
      intro: "envelope",
      decor: "corners",
      paper: true,
      frame: true,
      frameOrnament: true,
      timelineIcons: true,
      leaf: "#a8b48c",
      capsHeadings: true,
      align: "center",
    },
    blocks: [
      {
        type: "COVER",
        content: {
          v: 1,
          title: "",
          names: "Аня и Миша",
          dateText: "15 / 08 / 26",
          subtitle: "Да-да, это мы! Время пролетело так быстро, представляете?\nПриглашаем вас разделить с нами наш первый семейный праздник.",
          imageUrl: "",
        },
      },
      {
        type: "COUNTDOWN",
        content: { v: 1, title: "До свадьбы осталось", doneText: "Сегодня наш праздник!" },
      },
      ...commonBlocks(),
      {
        type: "DRESSCODE",
        content: {
          v: 1,
          title: "Дресс-код",
          text: "Будем рады, если вы поддержите палитру дня: шампань, пудра, песочный, оливковый. Никакой строгости — главное, чтобы вам было удобно танцевать.",
          palette: ["#f8f1ea", "#e8dbc8", "#e8c4c0", "#c8a87a", "#9ead80", "#5e7a40"],
        },
      },
      {
        type: "TEXT",
        content: {
          v: 1,
          title: "Пожелания",
          text: "Цветы, к сожалению, завянут уже к утру — а вот конверт очень пригодится нам в свадебном путешествии.\nИ ещё: самый дорогой подарок — то, что вы будете рядом.",
        },
      },
    ],
  },
];


export function findTemplate(id: string): InviteTemplate | null {
  return INVITE_TEMPLATES.find((template) => template.id === id) ?? null;
}
