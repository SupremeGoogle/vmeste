import { defaultTheme } from "@/lib/invite-theme";
import type { InviteTemplate, TemplateBlock } from "@/lib/invite-templates";
import type { Lang } from "@/lib/i18n";

export const CELEBRATION_IDS = ["gravure", "disco", "coral", "chrome"] as const;
export type CelebrationDesign = typeof CELEBRATION_IDS[number];
export const isCelebrationTemplate = (id: string): id is CelebrationDesign => CELEBRATION_IDS.some(value => value === id);

export const CELEBRATION_COPY = {
  gravure: { ru: { name: "Гравюра", mood: "Бордовые гравюры роз, жемчужная бумага и чёрно-белые фотографии. Спокойные появления и классическая антиква." }, en: { name: "Engraving", mood: "Burgundy rose engravings, pearl paper and black-and-white photographs. Gentle reveals and timeless serif typography." }, bg: "#eeece9", ink: "#383531", accent: "#7f243f", palette: ["#e9e5df", "#96928e", "#7f243f", "#28394e"] },
  disco: { ru: { name: "Диско-бал", mood: "Зеркальные шары, фотографии со скотчем, розовые акценты и бегущие ленты. Приглашение на самую яркую вечеринку." }, en: { name: "Disco Ball", mood: "Floating mirror balls, taped photographs, blush accents and moving ribbons. An invitation to your brightest party." }, bg: "#eeeadf", ink: "#24231f", accent: "#b16e78", palette: ["#24231f", "#f6f1e6", "#a6a6a8", "#c79aab"] },
  coral: { ru: { name: "Коралловое письмо", mood: "Тёплый коралл, тонкие банты, сердца и детские фотографии. Нежная история с мягкими переходами и розовыми разделами." }, en: { name: "Coral Letter", mood: "Warm coral, delicate bows, hearts and childhood photographs. A tender story with soft transitions and rose-colored sections." }, bg: "#fcebe6", ink: "#684954", accent: "#a65373", palette: ["#e5b2bf", "#dbc8b3", "#9fa78d", "#a65373"] },
  chrome: { ru: { name: "Хромовый вечер", mood: "Рифлёный металл, кинематографичные фотографии, оливковые ленты и вращающийся диск. Смелая типографика и глитч-переходы." }, en: { name: "Chrome Evening", mood: "Ribbed metal, cinematic photographs, olive ribbons and a spinning disc. Bold typography and glitch transitions." }, bg: "#faf7ee", ink: "#252629", accent: "#5e6546", palette: ["#24324c", "#252629", "#d7d8d6", "#5e6546"] },
};

/** Every design uses the same editable sections, guest form and wishlist pipeline. */
export function celebrationTemplate(id: CelebrationDesign, language: Lang = "ru"): InviteTemplate {
  const c = CELEBRATION_COPY[id];
  const t = (ru: string, en: string) => language === "en" ? en : ru;
  const image = (name: string) => `/media/invite-${id}/${name}.webp`;
  const titles = {
    gravure: [t("Приглашение", "Invitation"), t("Наш день в календаре", "Save our date"), t("До нашей встречи", "Until we meet"), t("Программа дня", "The order of the day"), t("Место нашей встречи", "The setting"), t("Дресс-код", "Dress code"), t("Наша история", "Our story"), "RSVP", t("Мы очень ждём этот день", "We cannot wait to see you")],
    disco: [t("Свадьба…", "A wedding…"), t("Сохраните дату", "Save the date"), t("До самой яркой вечеринки", "Until the party of our lives"), t("Тайминг дня", "Let the good times roll"), t("Локация", "Meet us here"), t("Что надеть", "Dress to dance"), t("Вместе — ярче", "Brighter together"), t("Вы с нами?", "Are you in?"), t("До встречи на танцполе!", "See you on the dance floor!")],
    coral: [t("Мы женимся", "We are getting married"), t("Наш счастливый день", "Our happy day"), t("До начала нашей семьи", "Until our next chapter"), t("Тайминг дня", "A day to remember"), t("Локация свадьбы", "A little garden celebration"), t("Палитра нашего дня", "The colors of our day"), t("Узнаёте этих малышей?", "Recognize these little ones?"), t("Анкета гостя", "Kindly reply"), t("С любовью и предвкушением", "With love and butterflies")],
    chrome: [t("Мы женимся!", "We are getting married!"), t("Сохраните эту дату", "Save this date"), t("До нашего вечера", "Until our evening"), t("Формат вечера", "The evening, in motion"), t("Место встречи", "The place to be"), t("Дресс-код", "Dress code"), t("Кадры нашей истории", "Frames of our story"), t("Анкета", "RSVP"), t("Ждём встречи с вами!", "Meet you in the next chapter!")],
  }[id];
  const venue = t(id === "gravure" ? "Кедровая поляна" : id === "coral" ? "Розовый сад" : id === "disco" ? "Вилла под звёздами" : "Галерея", id === "gravure" ? "Cedar Grove" : id === "coral" ? "The Rose Garden" : id === "disco" ? "Villa Under the Stars" : "The Gallery");
  const address = t("Москва, Садовая улица, 12", "12 Garden Street, Moscow");
  const blocks: TemplateBlock[] = [
    { type: "COVER", content: { v: 1, names: t("Валерия и Давид", "Valeria and David"), title: titles[0], dateText: "12.09.2027", subtitle: t(id === "disco" ? "Берите хорошее настроение и удобную обувь. Нас ждут музыка, объятия и танцы до самой ночи." : "Мы начинаем самую красивую главу нашей истории. Будем счастливы, если в этот день вы будете рядом.", id === "disco" ? "Bring your favorite people energy and your dancing shoes. There will be music, hugs and a night to remember." : "Our most beautiful chapter is about to begin. Nothing would make us happier than sharing it with you."), imageUrl: image("hero"), photos: [], footer: t("С любовью", "With love") } },
    { type: "CALENDAR", content: { v: 1, title: titles[1], message: t("Отметьте эту дату — мы очень ждём встречи с вами.", "Circle this date. We cannot wait to celebrate with you.") } },
    { type: "COUNTDOWN", content: { v: 1, title: titles[2], doneText: t("Сегодня наша свадьба!", "Today is our wedding day!") } },
    { type: "TIMELINE", content: { v: 1, title: titles[3], items: [
      { time: "15:00", title: t("Встреча гостей", "Welcome drinks"), note: t("Первые объятия и бокал игристого", "A first hug and a glass of sparkling wine") },
      { time: "16:00", title: t("Церемония", "The ceremony"), note: t("Главные слова в кругу самых близких", "Our favorite people. Our most important words.") },
      { time: "17:00", title: t("Праздничный ужин", "Dinner and toasts"), note: t("Тёплые истории, любимая музыка и вкусная еда", "Good food, favorite songs and stories to keep") },
      { time: "21:00", title: t(id === "disco" ? "Все на танцпол!" : "Торт и танцы", id === "disco" ? "Everybody on the dance floor!" : "Cake and dancing"), note: t("Самый сладкий момент и танцы до ночи", "Something sweet, then one more dance") },
    ] } },
    { type: "VENUE", content: { v: 1, title: titles[4], name: venue, address, note: t("Здесь мы соберём наших любимых людей. Кнопка откроет карту и поможет построить маршрут.", "This is where our favorite people come together. Open the map to plan your journey."), imageUrl: image("venue"), mapUrl: "https://www.google.com/maps/search/?api=1&query=Moscow%20Sadovaya%2012", mapLabel: t("Проложить маршрут", "Get directions") } },
    { type: "DRESSCODE", content: { v: 1, title: titles[5], text: t(id === "disco" ? "Чёрный, айвори, серебро и пыльная роза. Пайетки, атлас и смелые акценты приветствуются!" : "Будем рады, если наша палитра вдохновит ваш образ. Выберите оттенок, в котором вам комфортно.", id === "disco" ? "Black, ivory, silver and dusty rose. Sequins, satin and a little sparkle are very welcome!" : "We would love our palette to inspire your outfit. Choose a shade that feels like you."), palette: c.palette, imageUrl: image("outfits") } },
    { type: "PHOTOS", content: { v: 1, title: titles[6], items: id === "coral" ? [
      { imageUrl: "/media/invite-coral/childhood.webp", caption: t("Когда-то мы были вот такими", "Once upon a time, this was us") },
      { imageUrl: image("couple"), caption: t("А теперь начинаем нашу семью", "And now, a family of our own") },
    ] : [ { imageUrl: image("couple"), caption: t("Вместе начинается наша история", "This is where our story begins") }, { imageUrl: image("hero"), caption: t("Целая жизнь впереди", "A whole lifetime ahead") } ] } },
    { type: "TEXT", content: { v: 1, tag: t("Маленькая просьба", "A little note"), title: t("Вместо цветов", "Instead of flowers"), text: t("Ваше присутствие — лучший подарок. Вместо букета будем рады бутылочке любимого вина для наших будущих семейных вечеров.", "Having you there is the best gift. Instead of flowers, a bottle of your favorite wine would be lovely for our future evenings together.") } },
    { type: "RSVP_FORM", content: { v: 1, title: titles[7], text: t("Пожалуйста, подтвердите присутствие заранее, чтобы мы могли продумать праздник для каждого из вас.", "Please let us know if you can join us, so we can make this day special for everyone."), nameLabel: t("Ваше имя и фамилия", "Your full name"), attendanceLabel: t("Будем праздновать вместе?", "Will you celebrate with us?"), yesLabel: t("С радостью приду", "Joyfully accepts"), noLabel: t("К сожалению, не получится", "Regretfully declines"), drinksLabel: t("Что нальём вам в бокал?", "What would you like to drink?"), buttonLabel: t("Отправить ответ", "Send reply"), successText: t("Спасибо! До встречи на нашей свадьбе.", "Thank you! See you on our wedding day.") } },
    { type: "TEXT", content: { v: 1, tag: t("С любовью", "With love"), title: titles[8], text: t("Пусть этот день станет тёплым воспоминанием, которое мы сохраним вместе с вами. Если возникнут вопросы, свяжитесь с нами.", "Let us make memories we will keep forever. If you have any questions, just get in touch with us.") } },
  ];
  return { id, version: 1, ...c[language], theme: { ...defaultTheme(), template: id, language, bg: c.bg, card: c.bg, ink: c.ink, accent: c.accent, muted: c.ink, line: c.accent, leaf: c.accent, headingFont: id === "chrome" ? "grotesk" : "didona", bodyFont: "grotesk", corner: "sharp", divider: "none", sections: "flat", intro: "none", decor: "none", cover: "plain", frame: false, paper: false, capsHeadings: false }, blocks };
}

/** Translate sample copy only. Custom text and saved data are never rewritten. */
export function celebrationSampleTranslations(id: CelebrationDesign): Map<string, string> {
  const translations = new Map<string, string>();
  const walk = (ru: unknown, en: unknown) => {
    if (typeof ru === "string" && typeof en === "string" && ru !== en) translations.set(ru, en);
    else if (ru && en && typeof ru === "object" && typeof en === "object") for (const key of Object.keys(ru)) walk((ru as Record<string, unknown>)[key], (en as Record<string, unknown>)[key]);
  };
  walk(celebrationTemplate(id).blocks, celebrationTemplate(id, "en").blocks);
  return translations;
}

export const CELEBRATION_TEMPLATES = CELEBRATION_IDS.map(id => celebrationTemplate(id));
