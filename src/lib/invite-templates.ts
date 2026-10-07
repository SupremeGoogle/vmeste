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
import { ZEFIR_TEMPLATE, CRAYON_TEMPLATE } from "@/lib/invite-templates/scrapbook";
import { GAZETTE_TEMPLATE, PROTOKOL_TEMPLATE, POSTCARD_TEMPLATE } from "@/lib/invite-templates/editorial";
import { CONSTELLATION_TEMPLATE } from "@/lib/invite-templates/constellation";
import { EVERGREEN_TEMPLATE } from "@/lib/invite-templates/evergreen";
import { PEARL_TEMPLATE } from "@/lib/invite-templates/pearl";
import { PRISM_TEMPLATE } from "@/lib/invite-templates/prism";
import { RUBY_TEMPLATE } from "@/lib/invite-templates/ruby";
import { SILK_TEMPLATE } from "@/lib/invite-templates/silk";
import { TILI_TEMPLATE } from "@/lib/invite-templates/tili";
import { TUSCANY_TEMPLATE } from "@/lib/invite-templates/tuscany";
import { VINYL_TEMPLATE } from "@/lib/invite-templates/vinyl";
import { AQUARELLE_TEMPLATE } from "@/lib/invite-templates/aquarelle";
import { LILY_TEMPLATE } from "@/lib/invite-templates/lily";
import { BOHEMA_TEMPLATE } from "@/lib/invite-templates/bohema";
import { KRASKI_TEMPLATE } from "@/lib/invite-templates/kraski";
import { SERDCE_TEMPLATE } from "@/lib/invite-templates/serdce";
import { ANTIC_TEMPLATE } from "@/lib/invite-templates/antic";
import { SKVOZ_VREMYA_TEMPLATE } from "@/lib/invite-templates/skvoz-vremya";
import { BURGUNDY_TEMPLATE } from "@/lib/invite-templates/burgundy";
import { ROSERAIE_TEMPLATE } from "@/lib/invite-templates/roseraie";
import { FLORAL_GARDEN_TEMPLATE } from "@/lib/invite-templates/floral-garden";
import { ISKRA_TEMPLATE } from "@/lib/invite-templates/iskra";
import { WEDWED_TEMPLATES } from "@/lib/invite-templates/wedwed";

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

/**
 * Общий стандарт для всех шаблонов: в каждом есть виш-лист, и стоит он
 * перед анкетой — сначала «что подарить», потом «придёте ли». Добавляется
 * здесь, а не в каждом файле шаблона: новый шаблон получит его сам.
 */
function withStandardSections(template: InviteTemplate): InviteTemplate {
  let blocks = template.blocks;
  // Таймер есть в каждом шаблоне (стандарт, §1 и §11): после календаря,
  // а без него — сразу за обложкой.
  if (!blocks.some((block) => block.type === "COUNTDOWN")) {
    const calendar = blocks.findIndex((block) => block.type === "CALENDAR");
    const cover = blocks.findIndex((block) => block.type === "COVER");
    const at = (calendar !== -1 ? calendar : cover) + 1;
    blocks = [...blocks.slice(0, at), DEFAULT_COUNTDOWN_BLOCK, ...blocks.slice(at)];
  }
  // Анкета в каждом шаблоне (стандарт, §2): перед прощанием, если оно
  // последнее, иначе в конце.
  if (!blocks.some((block) => block.type === "RSVP_FORM")) {
    const last = blocks.at(-1);
    const at = last?.type === "TEXT" ? blocks.length - 1 : blocks.length;
    blocks = [...blocks.slice(0, at), DEFAULT_RSVP_BLOCK, ...blocks.slice(at)];
  }
  if (!blocks.some((block) => block.type === "WISHLIST")) {
    const rsvp = blocks.findIndex((block) => block.type === "RSVP_FORM");
    const at = rsvp === -1 ? blocks.length : rsvp;
    blocks = [...blocks.slice(0, at), DEFAULT_WISHLIST_BLOCK, ...blocks.slice(at)];
  }
  return blocks === template.blocks ? template : { ...template, blocks };
}

const ALL_TEMPLATES: InviteTemplate[] = [
  GAZETTE_TEMPLATE,
  PROTOKOL_TEMPLATE,
  POSTCARD_TEMPLATE,
  ZEFIR_TEMPLATE,
  CRAYON_TEMPLATE,
  EVERGREEN_TEMPLATE,
  SILK_TEMPLATE,
  PEARL_TEMPLATE,
  TUSCANY_TEMPLATE,
  RUBY_TEMPLATE,
  CONSTELLATION_TEMPLATE,
  PRISM_TEMPLATE,
  TILI_TEMPLATE,
  VINYL_TEMPLATE,
  AQUARELLE_TEMPLATE,
  LILY_TEMPLATE,
  BOHEMA_TEMPLATE,
  KRASKI_TEMPLATE,
  SERDCE_TEMPLATE,
  ANTIC_TEMPLATE,
  SKVOZ_VREMYA_TEMPLATE,
  BURGUNDY_TEMPLATE,
  ROSERAIE_TEMPLATE,
  FLORAL_GARDEN_TEMPLATE,
  ISKRA_TEMPLATE,
  ...WEDWED_TEMPLATES,
];

export const INVITE_TEMPLATES: InviteTemplate[] = ALL_TEMPLATES.map(withStandardSections);

/** То, что показывает витрина: всё, кроме снятых с показа шаблонов. */
export const PICKABLE_TEMPLATES: InviteTemplate[] = INVITE_TEMPLATES.filter(
  (template) => !template.retired,
);

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
