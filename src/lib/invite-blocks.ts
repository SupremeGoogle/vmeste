/**
 * Схемы содержимого блоков приглашения (PLAN.md §4.11).
 *
 * `InviteBlock.content` — это `Json`, и без схемы он через месяц превратится
 * в свалку из полей, которые кто-то когда-то положил. Поэтому: одна zod-схема
 * на каждый `BlockType`, разбор И на записи, И на чтении.
 *
 * Ключевое решение — **чтение никогда не бросает**. Приглашение открывает
 * гость по ссылке из смс, и «страница упала, потому что в блоке лишнее поле»
 * — недопустимый исход. Если содержимое не разобралось, показывается
 * значение по умолчанию, а расхождение видно организатору в конструкторе.
 *
 * Версия схемы (`v`) лежит в самом содержимом: при добавлении поля миграция
 * делается «на чтении» (см. `migrate`), строки в БД не переписываются.
 */
import { z } from "zod";
import type { BlockType } from "@/generated/prisma/enums";

/** Текущая версия содержимого. Растёт, когда меняется форма данных. */
export const BLOCK_SCHEMA_VERSION = 1;

const version = z.number().int().min(1).default(BLOCK_SCHEMA_VERSION);
const shortText = z.string({ error: "нужен текст" }).trim().max(120, "не длиннее 120 символов");
const longText = z.string({ error: "нужен текст" }).trim().max(2000, "не длиннее 2000 символов");
/** Цвет палитры дресс-кода: только #rgb/#rrggbb — значение уходит в style. */
const color = z
  .string({ error: "нужен цвет" })
  .regex(/^#[0-9a-fA-F]{3,8}$/, "цвет пишется как #c8b7a6");
/**
 * Ссылки: только http(s). Гостю нельзя подсунуть `javascript:` из конструктора.
 * Сообщения по-русски: их читает организатор в конструкторе, а не разработчик
 * в консоли — умолчания zod («Invalid URL») в интерфейсе выглядят чужеродно.
 */
const httpUrl = z
  .string({ error: "нужна ссылка" })
  .trim()
  .max(500, "ссылка слишком длинная")
  .refine((u) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(u), {
    message: "нужна ссылка целиком, вида https://…",
  });

/**
 * Картинка блока: либо внешняя ссылка, либо наш собственный адрес вида
 * `/api/asset/{eventId}/{assetId}` — то, что отдаёт загрузчик.
 *
 * Свой путь описан отдельным выражением, а не «любой строкой, начинающейся
 * с /»: относительный адрес в атрибуте `src` — это ровно то место, куда
 * при небрежности попадает `//evil.example/x` и превращается в запрос на
 * чужой домен. Здесь пройдут только идентификаторы, которые выдали мы.
 */
const imageRef = httpUrl
  .or(z.string().regex(/^\/api\/asset\/[a-z0-9]+\/[a-z0-9]+$/, "неизвестный адрес картинки"))
  .or(z.literal(""));

export const blockContentSchemas = {
  /**
   * Обратный отсчёт до свадьбы. Целевое время не хранится в блоке: оно
   * и так есть у мероприятия (`Event.eventDate`), и две даты в двух
   * местах — это гарантированное расхождение в тот единственный день,
   * когда оно важно.
   */
  COUNTDOWN: z.object({
    v: version,
    title: shortText.default("До свадьбы осталось"),
    /** Что показать, когда день наступил. */
    doneText: shortText.default("Сегодня наш праздник!"),
  }),

  COVER: z.object({
    v: version,
    title: shortText.default("Мы женимся"),
    names: shortText.default(""),
    dateText: shortText.default(""),
    subtitle: longText.default(""),
    imageUrl: imageRef.default(""),
  }),
  TIMELINE: z.object({
    v: version,
    title: shortText.default("Тайминг дня"),
    items: z
      .array(
        z.object({
          // Время площадки, а не браузера: хранится строкой ровно так, как
          // его напечатал организатор (PLAN.md §4.12 — про сам день события).
          time: z.string().trim().max(10).default(""),
          title: shortText.default(""),
          note: shortText.default(""),
        }),
      )
      .max(30)
      .default([]),
  }),
  VENUE: z.object({
    v: version,
    title: shortText.default("Где"),
    name: shortText.default(""),
    address: longText.default(""),
    note: longText.default(""),
  }),
  DRESSCODE: z.object({
    v: version,
    title: shortText.default("Дресс-код"),
    text: longText.default(""),
    palette: z.array(color).max(8).default([]),
  }),
  MAP: z.object({
    v: version,
    title: shortText.default("Как добраться"),
    // Карта не встраивается: iframe стороннего сервиса — это +300 КБ и
    // сторонние скрипты на странице, которую открывают с телефона в дороге.
    // Вместо него — ссылки, они открываются в родном приложении карт.
    yandexUrl: httpUrl.or(z.literal("")).default(""),
    googleUrl: httpUrl.or(z.literal("")).default(""),
    note: longText.default(""),
  }),
  TEXT: z.object({
    v: version,
    title: shortText.default(""),
    text: longText.default(""),
  }),
  RSVP_FORM: z.object({
    v: version,
    title: shortText.default("Подтвердите присутствие"),
    text: longText.default(""),
    buttonLabel: shortText.default("Ответить"),
  }),

  /**
   * Галерея фотографий (полароиды). Универсальный блок: детские снимки
   * под обложкой, пара фотографий пары где-то ниже — один и тот же тип,
   * поставленный дважды с разным содержимым, а не два отдельных типа
   * блока ради одной и той же вёрстки.
   *
   * Фиксированные четыре слота, а не динамический список: конструктор
   * не тянет за собой клиентский компонент со «добавить фото» — организатор
   * заполняет столько слотов, сколько есть фотографий, остальные остаются
   * пустыми и не рисуются (см. `readBlockContent`/сборку формы).
   */
  PHOTOS: z.object({
    v: version,
    title: shortText.default(""),
    items: z
      .array(
        z.object({
          imageUrl: imageRef.default(""),
          caption: shortText.default(""),
        }),
      )
      .max(4)
      .default([]),
  }),

  /**
   * Календарь месяца с большой датой. Как и у отсчёта, дата не хранится
   * в блоке — она берётся у мероприятия (`Event.eventDate`), иначе два
   * места хранения одной даты разойдутся ровно в тот день, когда это
   * важно.
   */
  CALENDAR: z.object({
    v: version,
    title: shortText.default("Мы ждём вас"),
    message: longText.default(""),
  }),
} as const satisfies Record<BlockType, z.ZodType>;

export type BlockContentMap = {
  [K in BlockType]: z.infer<(typeof blockContentSchemas)[K]>;
};
export type AnyBlockContent = BlockContentMap[BlockType];

/** Порядок в панели «добавить блок» и человеческие названия типов. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  COVER: "Обложка",
  PHOTOS: "Фотографии",
  COUNTDOWN: "Обратный отсчёт",
  CALENDAR: "Календарь",
  TIMELINE: "Тайминг",
  VENUE: "Место",
  DRESSCODE: "Дресс-код",
  MAP: "Как добраться",
  TEXT: "Текст",
  RSVP_FORM: "Форма ответа",
};

export const BLOCK_ORDER: BlockType[] = [
  "COVER", "PHOTOS", "CALENDAR", "COUNTDOWN", "TIMELINE", "VENUE", "MAP", "DRESSCODE", "TEXT", "RSVP_FORM",
];

/** Пустое содержимое блока: все поля со значениями по умолчанию. */
export function defaultContent<T extends BlockType>(type: T): BlockContentMap[T] {
  return blockContentSchemas[type].parse({}) as BlockContentMap[T];
}

/**
 * Разбор на ЗАПИСИ: строгий. Кривое содержимое до базы не доходит,
 * ошибка возвращается организатору в конструктор.
 */
/** Человеческие названия полей: организатор не знает, что такое `yandexUrl`. */
const FIELD_LABELS: Record<string, string> = {
  title: "Заголовок",
  names: "Имена",
  dateText: "Дата словами",
  subtitle: "Подпись",
  imageUrl: "Ссылка на фотографию",
  items: "Пункты тайминга",
  name: "Название площадки",
  address: "Адрес",
  note: "Комментарий",
  text: "Текст",
  palette: "Палитра",
  yandexUrl: "Ссылка на Яндекс Карты",
  googleUrl: "Ссылка на Google Maps",
  buttonLabel: "Надпись на кнопке",
  message: "Текст",
};

export function parseBlockContent<T extends BlockType>(
  type: T,
  raw: unknown,
): { ok: true; content: BlockContentMap[T] } | { ok: false; message: string } {
  const result = blockContentSchemas[type].safeParse(raw ?? {});
  if (result.success) return { ok: true, content: result.data as BlockContentMap[T] };
  const first = result.error.issues[0];
  const field = String(first.path[0] ?? "");
  return {
    ok: false,
    message: `${FIELD_LABELS[field] ?? field ?? "Содержимое"}: ${first.message}`,
  };
}

/**
 * Миграция «на чтении». Пока версия одна, поэтому тело пустое, но точка
 * расширения нужна сразу: когда появится v2, здесь будет `if (v < 2) ...`,
 * и ни одна строка в БД переписываться не будет.
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  return raw;
}

/**
 * Разбор на ЧТЕНИИ: терпимый, не бросает никогда.
 * `degraded: true` означает, что содержимое не разобралось целиком и часть
 * полей взята по умолчанию — организатору это показывается предупреждением.
 */
export function readBlockContent<T extends BlockType>(
  type: T,
  raw: unknown,
): { content: BlockContentMap[T]; degraded: boolean } {
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? migrate(raw as Record<string, unknown>)
    : {};

  const strict = blockContentSchemas[type].safeParse(source);
  if (strict.success) {
    return { content: strict.data as BlockContentMap[T], degraded: false };
  }

  // Поле за полем: испорченный элемент тайминга не должен унести всю страницу.
  const salvaged: Record<string, unknown> = {};
  const shape = (blockContentSchemas[type] as unknown as z.ZodObject).shape as Record<
    string,
    z.ZodType
  >;
  for (const key of Object.keys(shape)) {
    const field = shape[key].safeParse(source[key]);
    if (field.success) salvaged[key] = field.data;
  }
  const relaxed = blockContentSchemas[type].safeParse(salvaged);

  return {
    content: (relaxed.success ? relaxed.data : defaultContent(type)) as BlockContentMap[T],
    degraded: true,
  };
}
