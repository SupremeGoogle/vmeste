/**
 * Готовый шаблон приглашения.
 *
 * Шаблон — это две вещи сразу: тема оформления и набор блоков, с которого
 * человек начинает. Второе важнее первого. Пустое приглашение с красивой
 * палитрой — это по-прежнему пустой лист, перед которым садятся и не
 * знают, что писать. Шаблон отвечает на вопрос «а что вообще принято
 * писать в приглашении», и уже потом — «как оно выглядит».
 *
 * Поэтому блоки приходят с заполненным текстом-примером, а не пустыми —
 * но имена, адрес и фотографии оставлены плейсхолдерами: это чужая
 * история, а не готовый рассказ про Аню и Мишу, который надо стирать
 * целиком перед тем, как писать свой.
 *
 * Шаблон один — «История»: живое приглашение со своей структурой (детские
 * фотографии, календарь месяца, тайминг со значками, дресс-код, пожелания)
 * по образцу присланного сайта. Раньше их было четыре — экран выбора
 * с одной карточкой проще, и в него не нужно класть то, что ещё не
 * готово. Дальше шаблонов станет больше, но каждый — это отдельная
 * проверенная структура, а не смена палитры.
 *
 * Общие правила всех шаблонов — docs/template-standard.md.
 */
import type { BlockType } from "@/generated/prisma/enums";
import type { InviteTheme } from "@/lib/invite-theme";
import type { Lang } from "@/lib/i18n";
import { ZEFIR_TEMPLATE, CRAYON_TEMPLATE, ZEFIR_BLOCKS_EN, CRAYON_BLOCKS_EN } from "@/lib/invite-templates/scrapbook";
import { GAZETTE_TEMPLATE, PROTOKOL_TEMPLATE, POSTCARD_TEMPLATE, GAZETTE_BLOCKS_EN, PROTOKOL_BLOCKS_EN, POSTCARD_BLOCKS_EN } from "@/lib/invite-templates/editorial";
import { CONSTELLATION_TEMPLATE, CONSTELLATION_BLOCKS_EN } from "@/lib/invite-templates/constellation";
import { EVERGREEN_TEMPLATE, EVERGREEN_BLOCKS_EN } from "@/lib/invite-templates/evergreen";
import { PEARL_TEMPLATE, PEARL_BLOCKS_EN } from "@/lib/invite-templates/pearl";
import { PRISM_TEMPLATE, PRISM_BLOCKS_EN } from "@/lib/invite-templates/prism";
import { RUBY_TEMPLATE, RUBY_BLOCKS_EN } from "@/lib/invite-templates/ruby";
import { SILK_TEMPLATE, SILK_BLOCKS_EN } from "@/lib/invite-templates/silk";
import { TILI_TEMPLATE, TILI_BLOCKS_EN } from "@/lib/invite-templates/tili";
import { TUSCANY_TEMPLATE, TUSCANY_BLOCKS_EN } from "@/lib/invite-templates/tuscany";
import { VINYL_TEMPLATE, VINYL_BLOCKS_EN } from "@/lib/invite-templates/vinyl";
import { AQUARELLE_TEMPLATE, AQUARELLE_BLOCKS_EN } from "@/lib/invite-templates/aquarelle";
import { LILY_TEMPLATE, LILY_BLOCKS_EN } from "@/lib/invite-templates/lily";
import { BOHEMA_TEMPLATE, BOHEMA_BLOCKS_EN } from "@/lib/invite-templates/bohema";
import { KRASKI_TEMPLATE, KRASKI_BLOCKS_EN } from "@/lib/invite-templates/kraski";
import { SERDCE_TEMPLATE, SERDCE_BLOCKS_EN } from "@/lib/invite-templates/serdce";
import { ANTIC_TEMPLATE, ANTIC_BLOCKS_EN } from "@/lib/invite-templates/antic";
import { SKVOZ_VREMYA_TEMPLATE, SKVOZ_VREMYA_BLOCKS_EN } from "@/lib/invite-templates/skvoz-vremya";
import { BURGUNDY_TEMPLATE, BURGUNDY_BLOCKS_EN } from "@/lib/invite-templates/burgundy";
import { ROSERAIE_TEMPLATE, ROSERAIE_BLOCKS_EN } from "@/lib/invite-templates/roseraie";
import { FLORAL_GARDEN_TEMPLATE, FLORAL_GARDEN_BLOCKS_EN } from "@/lib/invite-templates/floral-garden";
import { ISKRA_TEMPLATE, ISKRA_BLOCKS_EN } from "@/lib/invite-templates/iskra";
import { WEDWED_TEMPLATES } from "@/lib/invite-templates/wedwed";
import { CELEBRATION_TEMPLATES, celebrationTemplate, isCelebrationTemplate } from "@/lib/invite-templates/celebration";

export type TemplateBlock = {
  type: BlockType;
  content: Record<string, unknown>;
  /** Скрыт в новом приглашении: раздел есть, но включает его организатор. */
  visible?: boolean;
};

export type InviteTemplate = {
  id: string;
  name: string;
  /** Одна строка о характере — её читают, выбирая шаблон. */
  mood: string;
  theme: InviteTheme;
  blocks: TemplateBlock[];
  /**
   * Образец для английской свадьбы (`Event.language === "en"`): те же
   * разделы в том же порядке и те же картинки, тексты — на английском.
   * Нет поля — английская свадьба получает русский образец.
   */
  blocksEn?: TemplateBlock[];
  /** Надписи шаблона (`theme.labels`) для английской свадьбы. */
  labelsEn?: Record<string, string>;
  /**
   * Снят с витрины: новым мероприятиям не предлагается, но остаётся в
   * списке — у кого приглашение уже собрано по нему, оно должно
   * открываться и дальше.
   */
  retired?: boolean;
  /**
   * Текущая версия дизайна. Повышается только при несовместимой переделке —
   * тогда старые приглашения рендерятся по своей закреплённой версии.
   * Нет поля — версия 1.
   */
  version?: number;
};

/** Таймер по умолчанию — для шаблонов, где его не было в образце. */
export const DEFAULT_COUNTDOWN_BLOCK: TemplateBlock = {
  type: "COUNTDOWN",
  content: { v: 1, title: "До свадьбы осталось", doneText: "Сегодня наш праздник!" },
};

/** Анкета по умолчанию — для шаблонов, где её не было в образце. */
export const DEFAULT_RSVP_BLOCK: TemplateBlock = {
  type: "RSVP_FORM",
  content: {
    v: 1,
    tag: "Ответ гостя",
    title: "Подтвердите присутствие",
    text: "Пожалуйста, ответьте заранее — это поможет нам всё спланировать.",
    buttonLabel: "Отправить ответ",
  },
};

/** Раздел «Виш-лист» по умолчанию — один на все шаблоны. */
export const DEFAULT_WISHLIST_BLOCK: TemplateBlock = {
  type: "WISHLIST",
  content: {
    v: 1,
    tag: "Подарки",
    title: "Наш виш-лист",
    text: "Если захотите порадовать нас подарком — вот что нам пригодится. Отметьте подарок, чтобы его не выбрал кто-то ещё.",
    openLabel: "Открыть виш-лист",
    buttonLabel: "Я подарю это",
    envelopeTitle: "",
  },
  // По стандарту виш-лист в новом приглашении выключен: включают его,
  // когда в нём появятся подарки (docs/template-standard.md, §1).
  visible: false,
};

/** Те же разделы по умолчанию — для английского образца. */
export const DEFAULT_COUNTDOWN_BLOCK_EN: TemplateBlock = {
  type: "COUNTDOWN",
  content: { v: 1, title: "Counting down to our wedding", doneText: "Today is the day!" },
};

export const DEFAULT_RSVP_BLOCK_EN: TemplateBlock = {
  type: "RSVP_FORM",
  content: {
    v: 1,
    tag: "RSVP",
    title: "Will you join us?",
    text: "Please reply early — it helps us plan everything.",
    buttonLabel: "Send reply",
  },
};

export const DEFAULT_WISHLIST_BLOCK_EN: TemplateBlock = {
  type: "WISHLIST",
  content: {
    v: 1,
    tag: "Gifts",
    title: "Our gift list",
    text: "If you’d like to treat us to a gift, here are a few things we’d love. Mark a gift so no one else picks it too.",
    openLabel: "Open gift list",
    buttonLabel: "I’ll give this",
    envelopeTitle: "",
  },
  visible: false,
};

const STANDARD_RU = { countdown: DEFAULT_COUNTDOWN_BLOCK, rsvp: DEFAULT_RSVP_BLOCK, wishlist: DEFAULT_WISHLIST_BLOCK };
const STANDARD_EN = { countdown: DEFAULT_COUNTDOWN_BLOCK_EN, rsvp: DEFAULT_RSVP_BLOCK_EN, wishlist: DEFAULT_WISHLIST_BLOCK_EN };

/**
 * Общий стандарт для всех шаблонов: в каждом есть виш-лист, и стоит он
 * перед анкетой — сначала «что подарить», потом «придёте ли». Добавляется
 * здесь, а не в каждом файле шаблона: новый шаблон получит его сам.
 */
function withStandardSections(template: InviteTemplate): InviteTemplate {
  const blocks = standardBlocks(template.blocks, STANDARD_RU);
  const blocksEn = template.blocksEn && standardBlocks(template.blocksEn, STANDARD_EN);
  return blocks === template.blocks && blocksEn === template.blocksEn ? template : { ...template, blocks, ...(blocksEn ? { blocksEn } : {}) };
}

function standardBlocks(source: TemplateBlock[], standard: typeof STANDARD_RU): TemplateBlock[] {
  let blocks = source;
  // Таймер есть в каждом шаблоне (стандарт, §1 и §11): после календаря,
  // а без него — сразу за обложкой.
  if (!blocks.some((block) => block.type === "COUNTDOWN")) {
    const calendar = blocks.findIndex((block) => block.type === "CALENDAR");
    const cover = blocks.findIndex((block) => block.type === "COVER");
    const at = (calendar !== -1 ? calendar : cover) + 1;
    blocks = [...blocks.slice(0, at), standard.countdown, ...blocks.slice(at)];
  }
  // Анкета в каждом шаблоне (стандарт, §2): перед прощанием, если оно
  // последнее, иначе в конце.
  if (!blocks.some((block) => block.type === "RSVP_FORM")) {
    const last = blocks.at(-1);
    const at = last?.type === "TEXT" ? blocks.length - 1 : blocks.length;
    blocks = [...blocks.slice(0, at), standard.rsvp, ...blocks.slice(at)];
  }
  if (!blocks.some((block) => block.type === "WISHLIST")) {
    const rsvp = blocks.findIndex((block) => block.type === "RSVP_FORM");
    const at = rsvp === -1 ? blocks.length : rsvp;
    blocks = [...blocks.slice(0, at), standard.wishlist, ...blocks.slice(at)];
  }
  return blocks;
}

const ALL_TEMPLATES: InviteTemplate[] = [
  // Образцы «праздничного» семейства сами умеют английский.
  ...CELEBRATION_TEMPLATES.map((template) => isCelebrationTemplate(template.id) ? { ...template, blocksEn: celebrationTemplate(template.id, "en").blocks } : template),
  { ...GAZETTE_TEMPLATE, blocksEn: GAZETTE_BLOCKS_EN },
  { ...PROTOKOL_TEMPLATE, blocksEn: PROTOKOL_BLOCKS_EN },
  { ...POSTCARD_TEMPLATE, blocksEn: POSTCARD_BLOCKS_EN },
  { ...ZEFIR_TEMPLATE, blocksEn: ZEFIR_BLOCKS_EN },
  { ...CRAYON_TEMPLATE, blocksEn: CRAYON_BLOCKS_EN },
  { ...EVERGREEN_TEMPLATE, blocksEn: EVERGREEN_BLOCKS_EN },
  { ...SILK_TEMPLATE, blocksEn: SILK_BLOCKS_EN },
  { ...PEARL_TEMPLATE, blocksEn: PEARL_BLOCKS_EN },
  { ...TUSCANY_TEMPLATE, blocksEn: TUSCANY_BLOCKS_EN },
  { ...RUBY_TEMPLATE, blocksEn: RUBY_BLOCKS_EN },
  { ...CONSTELLATION_TEMPLATE, blocksEn: CONSTELLATION_BLOCKS_EN },
  { ...PRISM_TEMPLATE, blocksEn: PRISM_BLOCKS_EN },
  { ...TILI_TEMPLATE, blocksEn: TILI_BLOCKS_EN },
  { ...VINYL_TEMPLATE, blocksEn: VINYL_BLOCKS_EN },
  { ...AQUARELLE_TEMPLATE, blocksEn: AQUARELLE_BLOCKS_EN },
  { ...LILY_TEMPLATE, blocksEn: LILY_BLOCKS_EN },
  { ...BOHEMA_TEMPLATE, blocksEn: BOHEMA_BLOCKS_EN },
  { ...KRASKI_TEMPLATE, blocksEn: KRASKI_BLOCKS_EN },
  { ...SERDCE_TEMPLATE, blocksEn: SERDCE_BLOCKS_EN },
  { ...ANTIC_TEMPLATE, blocksEn: ANTIC_BLOCKS_EN },
  { ...SKVOZ_VREMYA_TEMPLATE, blocksEn: SKVOZ_VREMYA_BLOCKS_EN },
  { ...BURGUNDY_TEMPLATE, blocksEn: BURGUNDY_BLOCKS_EN },
  { ...ROSERAIE_TEMPLATE, blocksEn: ROSERAIE_BLOCKS_EN },
  { ...FLORAL_GARDEN_TEMPLATE, blocksEn: FLORAL_GARDEN_BLOCKS_EN },
  { ...ISKRA_TEMPLATE, blocksEn: ISKRA_BLOCKS_EN },
  ...WEDWED_TEMPLATES,
];

export const INVITE_TEMPLATES: InviteTemplate[] = ALL_TEMPLATES.map(withStandardSections);

/** То, что показывает витрина: всё, кроме снятых с показа шаблонов. */
export const PICKABLE_TEMPLATES: InviteTemplate[] = INVITE_TEMPLATES.filter(
  (template) => !template.retired,
);

/**
 * Шаблоны в случайном порядке — так их показывают витрина и главная:
 * при фиксированном порядке первые три шаблона выбирали все, а до
 * последних никто не доматывал. Мешать только на сервере, иначе разметка
 * сервера и браузера не совпадёт.
 */
export function shuffledTemplates(list: InviteTemplate[] = PICKABLE_TEMPLATES): InviteTemplate[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Имена пары из образца шаблона («Валерия и Давид»): их подстановка
 * меняет на настоящие во всех текстах — подписи «С любовью, …»,
 * заголовках, календаре, — а не только на обложке.
 */
export function templateSampleNames(id: string, lang: Lang = "ru"): string {
  const template = findTemplate(id);
  const cover = template && templateBlocks(template, lang).find((block) => block.type === "COVER");
  const names = (cover?.content as { names?: unknown } | undefined)?.names;
  return typeof names === "string" ? names.trim() : "";
}

/** Образец шаблона на языке свадьбы; английского нет — русский. */
export function templateBlocks(template: InviteTemplate, lang: Lang | null | undefined): TemplateBlock[] {
  return lang === "en" && template.blocksEn ? template.blocksEn : template.blocks;
}

/** Тема шаблона на языке свадьбы: язык и, для английской, свои надписи. */
export function templateTheme(template: InviteTemplate, lang: Lang | null | undefined): InviteTheme {
  const language: Lang = lang === "en" ? "en" : "ru";
  return { ...template.theme, language, ...(language === "en" && template.labelsEn ? { labels: { ...template.theme.labels, ...template.labelsEn } } : {}) };
}

export function findTemplate(id: string): InviteTemplate | null {
  return INVITE_TEMPLATES.find((template) => template.id === id) ?? null;
}

/**
 * Удалённые шаблоны и чем их заменить у уже собранных приглашений
 * (docs/template-standard.md, §10). Близкие по духу: «История» — тёплая,
 * с детскими фото и календарём, как «Тили-тесто»; «Обещание» — итальянский
 * сад с розами, как «Розарий».
 */
export const REPLACED_TEMPLATES: Record<string, string> = {
  story: "tili",
  promise: "roseraie",
};

/**
 * Тема с живым шаблоном. Приглашение на удалённом шаблоне открывается в
 * его замене: оформление — от замены, а всё, что настроила пара (данные
 * свадьбы, музыка, свои цвета и шрифты, заставка), остаётся.
 */
export function liveTheme(theme: InviteTheme): InviteTheme {
  const replacement = REPLACED_TEMPLATES[theme.template];
  const target = replacement ? findTemplate(replacement) : null;
  if (!target) return theme;
  return {
    ...target.theme,
    templateVersion: target.version ?? 1,
    ...(theme.wedding ? { wedding: theme.wedding } : {}),
    ...(theme.musicUrl ? { musicUrl: theme.musicUrl } : {}),
    ...(theme.style ? { style: theme.style } : {}),
    ...(theme.introOff ? { introOff: theme.introOff } : {}),
    ...(theme.removedComponents ? { removedComponents: theme.removedComponents } : {}),
  };
}
