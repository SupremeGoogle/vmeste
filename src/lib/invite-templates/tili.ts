import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import { TILI_MEDIA, TILI_TIMELINE_ICONS } from "@/lib/invite-templates/tili-assets";

/**
 * «Тили-тесто» — перенос сайта-приглашения из репозитория-образца
 * (SupremeGoogle/wedding): тексты, фотографии, тайминг, палитра и анкета
 * такие же, как на исходной странице. Всё правится прямо на странице в
 * визуальном редакторе. Дата, напитки и ответы — из самого мероприятия.
 */
export const TILI_TEMPLATE: InviteTemplate = {
  id: "tili",
  name: "Тили-тесто",
  mood: "Тёплое и живое: конверт, гирлянда флажков, детские полароиды, календарь, тайминг со значками, тёмный блок пожеланий и анкета гостя. Музыка после открытия конверта.",
  theme: {
    ...defaultTheme(),
    template: "tili",
    bg: "#f8f1ea",
    card: "#fefcf9",
    ink: "#2a1d0d",
    muted: "#bfaf9f",
    accent: "#8b6914",
    line: "#e8dbc8",
    leaf: "#6b8c5c",
    headingFont: "antiqua",
    bodyFont: "antiqua",
    corner: "round",
    divider: "none",
    cover: "plain",
    timeline: "stack",
    sections: "flat",
    dateStyle: "display",
    intro: "none",
    decor: "none",
    paper: false,
    frame: false,
    timelineIcons: true,
    capsHeadings: true,
    align: "center",
    musicUrl: "",
  },
  blocks: [
    {
      type: "COVER",
      content: {
        v: 1,
        title: "тили ~ тили тесто",
        names: "Валерия и Давид",
        dateText: "",
        subtitle:
          "Узнали этих ребятишек?\nДа-да, это мы! Время пролетело так быстро, представляете?\nИ вот мы повзрослели и приняли решение, что пора жениться!\nПриглашаем вас присоединиться к нашему первому семейному празднику — нашей свадьбе!\nБудем рады, если это событие вы разделите вместе с нами.",
        imageUrl: "",
        photos: [
          { imageUrl: `${TILI_MEDIA}/bride-child.webp`, caption: "— интересно, кто будет\nмоим мужем, когда\nя вырасту?" },
          { imageUrl: `${TILI_MEDIA}/groom-child.webp`, caption: "— им буду я 🤍" },
        ],
        footer: "С любовью,",
      },
    },
    {
      type: "PHOTOS",
      content: {
        v: 1,
        title: "",
        items: [
          { imageUrl: `${TILI_MEDIA}/couple-1.webp`, caption: "Счастливые мгновения" },
          { imageUrl: `${TILI_MEDIA}/couple-2.webp`, caption: "Навстречу будущему" },
        ],
      },
    },
    {
      type: "CALENDAR",
      content: {
        v: 1,
        tag: "КОГДА",
        title: "МЫ ЖДЁМ ВАС",
        message: "Не пропустите важное событие этого лета — день нашей свадьбы!",
      },
    },
    {
      type: "COUNTDOWN",
      content: { v: 1, title: "До свадьбы осталось", doneText: "Сегодня наш праздник! 🎊" },
    },
    {
      type: "VENUE",
      content: {
        v: 1,
        tag: "ЛОКАЦИЯ",
        title: "МЕСТО ТОРЖЕСТВА",
        name: "Лермонтовская частная баня",
        address: "Лермонтово, Калининградская обл., 238034",
        note: "",
        imageUrl: `${TILI_MEDIA}/venue.webp`,
        mapUrl: "https://www.google.com/maps/place/Лермонтовская+частная+баня,+Лермонтово,+Калининградская+обл.,+238034/",
        mapLabel: "посмотреть на карте",
      },
    },
    {
      type: "TIMELINE",
      content: {
        v: 1,
        tag: "ПРОГРАММА ДНЯ",
        title: "ТАЙМИНГ",
        items: [
          { time: "12:30", title: "РЕГИСТРАЦИЯ БРАКА", note: "", icon: TILI_TIMELINE_ICONS[0] },
          { time: "16:00", title: "ФУРШЕТНЫЙ СТОЛ", note: "", icon: TILI_TIMELINE_ICONS[1] },
          { time: "17:00", title: "БАНКЕТ", note: "", icon: TILI_TIMELINE_ICONS[2] },
          { time: "00:00", title: "ОКОНЧАНИЕ ВЕЧЕРА", note: "праздничный салют", icon: TILI_TIMELINE_ICONS[3] },
        ],
      },
    },
    {
      type: "DRESSCODE",
      content: {
        v: 1,
        tag: "ДРЕСС-КОД",
        title: "Свадьба в цвете",
        text: "Будем рады вас видеть в красивых нарядах\nв палитре нашей свадьбы",
        palette: ["#e8dbc8", "#d4b896", "#e8c4c0", "#8b6914", "#9ead80", "#5e7a40", "#3d5a28"],
        imageUrl: `${TILI_MEDIA}/dresscode.webp`,
      },
    },
    {
      type: "TEXT",
      content: {
        v: 1,
        tag: "ПОЖЕЛАНИЯ",
        title: "",
        text:
          "Мы просим вас не дарить нам цветы,\nтак как мы не успеем насладиться их красотой на все 100%.\n\nВместо цветов мы будем признательны,\nесли вы подарите бутылку вашего любимого алкоголя.\n\nТакже мы будем очень благодарны,\nесли вы поможете нам осуществить мечту о путешествии,\nподарив ваши пожелания в конверте.",
      },
    },
    {
      type: "RSVP_FORM",
      content: {
        v: 1,
        tag: "АНКЕТА ГОСТЯ",
        title: "Пожалуйста, заполните до 20 июня 2026",
        text: "",
        buttonLabel: "Отправить",
        nameLabel: "Ваше имя и фамилия",
        attendanceLabel: "Ваше присутствие",
        yesLabel: "Обязательно приду 🎉",
        noLabel: "К сожалению, не смогу 😔",
        drinksLabel: "Предпочтения в напитках",
        musicLabel: "Какую музыку предпочитаете?",
        musicPlaceholder: "Валерий Меладзе",
        successText: "Спасибо! Ваши ответы получены.\nМы очень ждём встречи с вами!",
      },
    },
  ],
};

/** Образец для английской свадьбы: те же разделы и фотографии. */
export const TILI_BLOCKS_EN: TemplateBlock[] = [
  {
    type: "COVER",
    content: {
      v: 1,
      title: "first comes love ~ then comes marriage",
      names: "Emily & James",
      dateText: "",
      subtitle:
        "Recognize these two little ones?\nYes, it’s us! Time really does fly, doesn’t it?\nWell, we’ve grown up — and we’ve decided it’s time to get married!\nWe’d love for you to join our very first celebration as a family — our wedding!\nIt would mean the world to share this day with you.",
      imageUrl: "",
      photos: [
        { imageUrl: `${TILI_MEDIA}/bride-child.webp`, caption: "— I wonder who\nI’ll marry when\nI grow up?" },
        { imageUrl: `${TILI_MEDIA}/groom-child.webp`, caption: "— that’ll be me 🤍" },
      ],
      footer: "With love,",
    },
  },
  {
    type: "PHOTOS",
    content: {
      v: 1,
      title: "",
      items: [
        { imageUrl: `${TILI_MEDIA}/couple-1.webp`, caption: "Happy moments" },
        { imageUrl: `${TILI_MEDIA}/couple-2.webp`, caption: "Into the future" },
      ],
    },
  },
  {
    type: "CALENDAR",
    content: {
      v: 1,
      tag: "WHEN",
      title: "SAVE THE DATE",
      message: "Don’t miss the biggest day of our summer — our wedding day!",
    },
  },
  {
    type: "COUNTDOWN",
    content: { v: 1, title: "Counting down to our wedding", doneText: "Today is the day! 🎊" },
  },
  {
    type: "VENUE",
    content: {
      v: 1,
      tag: "LOCATION",
      title: "THE VENUE",
      name: "Willow Creek Farm",
      address: "Sonoma, California",
      note: "",
      imageUrl: `${TILI_MEDIA}/venue.webp`,
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Sonoma%2C%20California",
      mapLabel: "view on map",
    },
  },
  {
    type: "TIMELINE",
    content: {
      v: 1,
      tag: "THE DAY",
      title: "SCHEDULE",
      items: [
        { time: "12:30 PM", title: "CEREMONY", note: "", icon: TILI_TIMELINE_ICONS[0] },
        { time: "4:00 PM", title: "COCKTAIL HOUR", note: "", icon: TILI_TIMELINE_ICONS[1] },
        { time: "5:00 PM", title: "DINNER", note: "", icon: TILI_TIMELINE_ICONS[2] },
        { time: "12:00 AM", title: "GRAND FINALE", note: "fireworks", icon: TILI_TIMELINE_ICONS[3] },
      ],
    },
  },
  {
    type: "DRESSCODE",
    content: {
      v: 1,
      tag: "DRESS CODE",
      title: "Dressed in color",
      text: "We’d love to see you dressed up\nin the colors of our wedding",
      palette: ["#e8dbc8", "#d4b896", "#e8c4c0", "#8b6914", "#9ead80", "#5e7a40", "#3d5a28"],
      imageUrl: `${TILI_MEDIA}/dresscode.webp`,
    },
  },
  {
    type: "TEXT",
    content: {
      v: 1,
      tag: "A FEW WISHES",
      title: "",
      text:
        "Please don’t bring us flowers —\nwe won’t have time to enjoy them as much as they deserve.\n\nInstead of flowers, we’d be grateful\nfor a bottle of your favorite drink.\n\nAnd if you’d like to help make our travel dreams come true,\na card with your wishes would mean so much.",
    },
  },
  {
    type: "RSVP_FORM",
    content: {
      v: 1,
      tag: "RSVP",
      title: "Kindly reply by June 20",
      text: "",
      buttonLabel: "Send",
      nameLabel: "Your full name",
      attendanceLabel: "Will you be there?",
      yesLabel: "Wouldn’t miss it 🎉",
      noLabel: "Sadly, I can’t make it 😔",
      drinksLabel: "Drink preferences",
      musicLabel: "What music do you love?",
      musicPlaceholder: "Fleetwood Mac",
      successText: "Thank you! We’ve got your reply.\nWe can’t wait to see you!",
    },
  },
];
