/**
 * Оформление приглашения: шаблон и его настройки.
 *
 * Раньше приглашение было одно на всех: набор блоков в жёсткой вёрстке
 * из `guest-html/invite-html.ts`. Для сервиса, которым пользуется одна
 * студия, этого хватало. Как только приглашение стало продуктом, стало
 * видно главное возражение пары: «оно у всех одинаковое».
 *
 * Поэтому здесь появляется тема — небольшой набор значений, который
 * целиком определяет вид приглашения, и три готовых шаблона, из которых
 * человек выбирает отправную точку. Дальше он может поменять в теме
 * что угодно: любой цвет, шрифт заголовков, форму углов, разделитель,
 * выключить рамку. Шаблон — это не клетка, а первое приближение.
 *
 * Почему тема, а не «свой CSS»: пользовательский CSS на странице, которую
 * открывают по ссылке из смс, — это и дыра в безопасности (его придётся
 * санитизировать не хуже HTML), и гарантированно сломанная вёрстка на
 * половине телефонов. Ограниченный набор осей даёт непохожие приглашения
 * и при этом ни одного способа сделать нечитаемо.
 *
 * Значения проверяются той же дорогой, что содержимое блоков
 * (`invite-blocks.ts`): строго на записи, терпимо на чтении. Приглашение
 * открывают по ссылке из смс — падать ему нельзя ни при каких данных
 * в базе.
 */
import { z } from "zod";

/** Цвет в том же формате, что в блоках: значение уходит прямо в `style=`. */
const color = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{3,8}$/, "цвет пишется как #c8b7a6");

/**
 * Шрифты только системные — как и везде в проекте. Веб-шрифт это плюс сто
 * килобайт и запрос на сторонний домен на странице, которую открывают с
 * телефона в дороге; вдобавок тест `invite-html.spec.ts` прямо запрещает
 * `<link>` на гостевой странице. Три стека дают достаточно разный характер:
 * антиква для классики, гротеск для современного, и антиква с крупными
 * засечками для вечернего.
 */
export const FONT_STACKS = {
  antiqua: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif`,
  grotesk: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`,
  didona: `"Didot", "Bodoni 72", "Playfair Display", Georgia, "Times New Roman", serif`,
} as const;

export type FontKey = keyof typeof FONT_STACKS;

export const FONT_LABEL: Record<FontKey, string> = {
  antiqua: "антиква — классическая",
  grotesk: "гротеск — современный",
  didona: "с тонкими засечками — вечерний",
};

export const CORNER_LABEL = {
  sharp: "прямые",
  soft: "слегка скруглённые",
  round: "круглые",
} as const;

export const DIVIDER_LABEL = {
  none: "без разделителя",
  line: "тонкая линия",
  diamond: "линия с ромбом",
  leaf: "веточка",
} as const;

export const COVER_LABEL = {
  plain: "только текст",
  photo: "фотография во всю ширину",
  frame: "фотография в рамке",
} as const;

export const INVITE_THEME_VERSION = 1;

export const inviteThemeSchema = z.object({
  v: z.number().int().min(1).default(INVITE_THEME_VERSION),

  /** Шаблон, с которого начали. Нужен только чтобы показать выбор в панели. */
  template: z.string().trim().max(40).default("powder"),

  bg: color.default("#faf7f2"),
  card: color.default("#fffdf9"),
  ink: color.default("#2b2622"),
  muted: color.default("#7c7168"),
  accent: color.default("#8b6f47"),
  line: color.default("#e6ddd1"),

  headingFont: z.enum(["antiqua", "grotesk", "didona"]).default("antiqua"),
  bodyFont: z.enum(["antiqua", "grotesk", "didona"]).default("antiqua"),

  corner: z.enum(["sharp", "soft", "round"]).default("soft"),
  divider: z.enum(["none", "line", "diamond", "leaf"]).default("diamond"),
  cover: z.enum(["plain", "photo", "frame"]).default("plain"),

  /** Рамка по краю листа — тонкая линия внутри отступа. */
  frame: z.boolean().default(false),
  /** Крупные заглавные в заголовках разделов. */
  capsHeadings: z.boolean().default(true),
  /** Выравнивание текста по центру или по левому краю. */
  align: z.enum(["center", "left"]).default("center"),
});

export type InviteTheme = z.infer<typeof inviteThemeSchema>;

/** Значения по умолчанию — они же тема, если в базе пусто. */
export function defaultTheme(): InviteTheme {
  return inviteThemeSchema.parse({});
}

/**
 * Разбор на записи — строгий. Сообщение человеческое: его показывают
 * прямо в форме настроек.
 */
export function parseTheme(raw: unknown): { ok: true; theme: InviteTheme } | { ok: false; message: string } {
  const result = inviteThemeSchema.safeParse(raw);
  if (result.success) return { ok: true, theme: result.data };

  const issue = result.error.issues[0];
  const field = String(issue?.path[0] ?? "");
  const label = THEME_FIELD_LABELS[field] ?? "Оформление";
  return { ok: false, message: `${label}: ${issue?.message ?? "неверное значение"}` };
}

/**
 * Разбор на чтении — терпимый, никогда не бросает. Тема хранится в JSON;
 * если в базе окажется мусор (ручная правка, откат миграции, старая
 * версия), приглашение обязано открыться — пусть и в цветах по умолчанию.
 */
export function readTheme(raw: unknown): InviteTheme {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return defaultTheme();

  const strict = inviteThemeSchema.safeParse(raw);
  if (strict.success) return strict.data;

  // Спасаем уцелевшие поля по одному: одна испорченная строка не должна
  // обнулять весь подбор цветов, который человек делал вечер.
  const shape = (inviteThemeSchema as z.ZodObject<z.ZodRawShape>).shape;
  const salvaged: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(shape)) {
    const value = (raw as Record<string, unknown>)[key];
    const parsed = (field as z.ZodType).safeParse(value);
    if (parsed.success) salvaged[key] = parsed.data;
  }

  const second = inviteThemeSchema.safeParse(salvaged);
  return second.success ? second.data : defaultTheme();
}

export const THEME_FIELD_LABELS: Record<string, string> = {
  bg: "Фон страницы",
  card: "Фон листа",
  ink: "Основной текст",
  muted: "Второстепенный текст",
  accent: "Акцент",
  line: "Линии",
  headingFont: "Шрифт заголовков",
  bodyFont: "Шрифт текста",
  corner: "Углы",
  divider: "Разделитель",
  cover: "Обложка",
  frame: "Рамка",
  capsHeadings: "Заглавные в заголовках",
  align: "Выравнивание",
  template: "Шаблон",
};

/** Радиус скругления в rem по выбранной форме углов. */
export const CORNER_RADIUS: Record<InviteTheme["corner"], string> = {
  sharp: "0",
  soft: "0.75rem",
  round: "1.75rem",
};
