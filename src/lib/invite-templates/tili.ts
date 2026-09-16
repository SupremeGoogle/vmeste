import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate } from "@/lib/invite-templates";
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
        names: "Диана и Виктор",
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
        title: "Color wedding",
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
