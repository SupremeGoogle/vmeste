/**
 * PrismaClient + страж мультиарендности.
 *
 * Третий слой защиты из PLAN.md §1.2. Первые два — составные внешние ключи
 * в схеме и репозитории с обязательным контекстом. Этот слой ловит то, что
 * прошло мимо них: запрос к таблице мероприятия без фильтра по eventId.
 *
 * В dev — бросает ошибку сразу, чтобы забытый фильтр не дожил до прода.
 * В prod — пишет в лог и не роняет свадьбу из-за нашей паранойи.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Модели, где строка всегда принадлежит одному мероприятию. */
const EVENT_SCOPED = new Set([
  "InviteBlock",
  "EventAsset",
  "Guest",
  "GuestAlias",
  "MealOption",
  "SeatTable",
  "Seat",
  "Photo",
  "Wish",
  "Raffle",
  "RaffleEntry",
  "ScreenToken",
  "GuestActionLog",
]);

/** Операции, у которых обязан быть фильтр. create/createMany проверяются
 *  отдельно: там eventId должен быть в data. */
const FILTERED_OPS = new Set([
  "findFirst", "findMany", "findUnique", "findUniqueOrThrow", "findFirstOrThrow",
  "update", "updateMany", "delete", "deleteMany", "count", "aggregate",
]);

function hasEventScope(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if ("eventId" in obj || "orgId" in obj) return true;
  // where: { AND: [...] } / OR / NOT
  for (const key of ["AND", "OR", "NOT"] as const) {
    const nested = obj[key];
    if (Array.isArray(nested) && nested.some(hasEventScope)) return true;
    if (nested && !Array.isArray(nested) && hasEventScope(nested)) return true;
  }
  // составные уникальные ключи: where: { eventId_id: {...} }
  for (const k of Object.keys(obj)) {
    if (k.includes("eventId") || k.includes("orgId")) return true;
  }
  return false;
}

/**
 * Единственное исключение из правила «фильтр по eventId обязателен»:
 * вход по глобально уникальному секрету.
 *
 * Гость приходит по именной ссылке, а проектор в зале — по своему токену,
 * и ни тот ни другой никакого eventId не знают: мероприятие определяется
 * как раз из токена. Оба секрета случайные и длинные (128 и 192 бита),
 * подобрать их нельзя.
 *
 * Список закрытый и именно по паре «модель + поле»: обычный `id` сюда
 * не попадает никогда — забытый фильтр по мероприятию должен падать,
 * ради этого страж и написан. Когда `/api/media` понадобилось читать фото,
 * в адрес добавили eventId, а не строку в этот список.
 */
const TOKEN_ENTRY_POINTS: Record<string, string> = {
  Guest: "linkToken",
  ScreenToken: "token",
};

function isTokenEntry(model: string, where: unknown): boolean {
  const field = TOKEN_ENTRY_POINTS[model];
  if (!field) return false;
  return !!where && typeof where === "object" && field in (where as object);
}

function report(message: string) {
  if (process.env.NODE_ENV === "production") {
    console.error(`[tenancy] ${message}`);
    return;
  }
  throw new Error(
    `[tenancy] ${message}\n` +
      `Запрос к данным мероприятия без фильтра по eventId/orgId. ` +
      `Ходите в БД через src/server/repositories/*, они подмешивают контекст сами.`,
  );
}

function createClient() {
  // Prisma 7 подключается через driver adapter: пул pg живёт в приложении,
  // а не внутри Rust-движка. Это же даёт LISTEN/NOTIFY на этапе 6.
  // В тестах — отдельная база, чтобы прогон не стирал наполнение для ручной проверки.
  const connectionString =
    process.env.NODE_ENV === "test"
      ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
      : process.env.DATABASE_URL;

  const adapter = new PrismaPg({ connectionString });
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && EVENT_SCOPED.has(model)) {
            const a = args as Record<string, unknown> | undefined;
            if (
              FILTERED_OPS.has(operation) &&
              !hasEventScope(a?.where) &&
              !isTokenEntry(model, a?.where)
            ) {
              report(`${model}.${operation}: нет eventId/orgId в where`);
            }
            if (operation === "create" && !hasEventScope(a?.data)) {
              report(`${model}.create: нет eventId/orgId в data`);
            }
          }
          return query(args);
        },
      },
    },
  });
}

type ExtendedClient = ReturnType<typeof createClient>;

// В dev Next.js перезагружает модули на каждое изменение — без глобального
// кеша получим десятки коннектов и «too many clients» через полчаса работы.
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedClient };

export const db: ExtendedClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
