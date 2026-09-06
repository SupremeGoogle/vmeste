/**
 * Наполнение базы для разработки.
 *
 * Две организации с ПОХОЖИМИ данными — это не для красоты: одинаковые имена
 * гостей в разных мероприятиях единственный способ заметить, что где-то
 * потерялся фильтр по eventId. Если поиск «Анастасия Петрова» вернёт двоих —
 * мультиарендность течёт.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeName } from "../src/lib/name-normalize";
import { expandGuestName } from "../src/server/services/diminutives";
import { hashPassword } from "../src/server/auth/password";
import { randomBytes, randomInt } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const shortCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const token = () => randomBytes(16).toString("base64url");

const GUESTS_A = [
  "Анастасия Петрова", "Дмитрий Соколов", "Екатерина Иванова", "Александр Кузнецов",
  "Мария Смирнова", "Сергей Попов", "Ольга Васильева", "Михаил Новиков",
  "Юлия Морозова", "Андрей Волков", "Наталья Зайцева", "Владимир Соловьёв",
  "Ксения Павлова", "Артём Семёнов", "Елена Голубева", "Николай Виноградов",
  "Татьяна Богданова", "Павел Воробьёв", "Ирина Фёдорова", "Максим Никитин",
  "Анна Егорова", "Роман Макаров", "Дарья Андреева", "Илья Ковалёв",
  "Светлана Ильина", "Евгений Гусев", "Полина Титова", "Никита Кудрявцев",
  "Марина Беляева", "Константин Тарасов", "Александра Белова", "Георгий Комаров",
  "Вероника Орлова", "Станислав Киселёв", "Любовь Макарова", "Тимур Афанасьев",
  "Алиса Щербакова", "Ярослав Наумов", "Валентина Лебедева", "Денис Медведев",
];

const GUESTS_B = [
  // намеренно пересекается с A — ловушка для утечки между мероприятиями
  "Анастасия Петрова", "Дмитрий Соколов", "Пётр Романов", "Лидия Чернова",
  "Виктор Гаврилов", "София Дроздова", "Арсений Быков", "Маргарита Сорокина",
];

const TABLES_A = [
  { label: "Президиум", shape: "HEAD" as const, x: 500, y: 120, width: 320, height: 90, capacity: 4 },
  { label: "Стол 1", shape: "ROUND" as const, x: 220, y: 300, capacity: 8 },
  { label: "Стол 2", shape: "ROUND" as const, x: 500, y: 300, capacity: 8 },
  { label: "Стол 3", shape: "ROUND" as const, x: 780, y: 300, capacity: 8 },
  { label: "Стол 4", shape: "ROUND" as const, x: 360, y: 520, capacity: 8 },
  { label: "Стол 5", shape: "ROUND" as const, x: 640, y: 520, capacity: 8 },
];

/**
 * Блоки приглашения. Наполняются в seed, потому что пустой конструктор
 * ничего не рассказывает о том, как приглашение выглядит собранным.
 */
function inviteBlocks(names: string, dateText: string, venue: string) {
  return [
    {
      type: "COVER" as const, order: 0,
      content: { v: 1, title: "Мы женимся", names, dateText, subtitle: "", imageUrl: "" },
    },
    {
      type: "TIMELINE" as const, order: 1,
      content: {
        v: 1, title: "Тайминг дня",
        items: [
          { time: "15:30", title: "Сбор гостей", note: "у входа в парк" },
          { time: "16:00", title: "Церемония", note: "" },
          { time: "17:00", title: "Фуршет", note: "" },
          { time: "18:30", title: "Ужин и танцы", note: "" },
          { time: "23:00", title: "Прощальный вальс", note: "" },
        ],
      },
    },
    {
      type: "VENUE" as const, order: 2,
      content: {
        v: 1, title: "Где", name: venue,
        address: "Московская область, деревня Гребнево, ул. Парковая, 1",
        note: "Парковка за главными воротами, въезд со стороны пруда.",
      },
    },
    {
      type: "MAP" as const, order: 3,
      content: {
        v: 1, title: "Как добраться",
        yandexUrl: "https://yandex.ru/maps/",
        googleUrl: "",
        note: "От метро ходит трансфер в 15:00 — напишите нам, если нужно место.",
      },
    },
    {
      type: "DRESSCODE" as const, order: 4,
      content: {
        v: 1, title: "Дресс-код",
        text: "Пастельные тона и никакого белого.\nНа траве каблуки утонут — возьмите вторую пару обуви.",
        palette: ["#c8b7a6", "#6b705c", "#a5a58d", "#ddbea9"],
      },
    },
    {
      type: "RSVP_FORM" as const, order: 5,
      content: {
        v: 1, title: "Подтвердите присутствие",
        text: "Ответьте, пожалуйста, до 1 сентября — нам нужно передать список на кухню.",
        buttonLabel: "Ответить",
      },
    },
  ];
}

async function seedEvent(opts: {
  orgId: string;
  title: string;
  slug: string;
  date: Date;
  venue: string;
  dateText: string;
  guests: string[];
  tables: typeof TABLES_A;
  seatEveryone: boolean;
}) {
  const event = await db.event.create({
    data: {
      orgId: opts.orgId,
      title: opts.title,
      slug: opts.slug,
      shortCode: shortCode(),
      status: "PUBLISHED",
      eventDate: opts.date,
      venueName: opts.venue,
      rsvpDeadline: new Date(opts.date.getTime() - 12 * 24 * 3600 * 1000),
      blocks: {
        // orgId не указываем: во вложенном create Prisma подставляет оба
        // поля связи сама, а явное значение даёт «Unknown argument» (CLAUDE.md).
        create: inviteBlocks(opts.title, opts.dateText, opts.venue),
      },
      mealOptions: {
        create: [
          { title: "Мясо", order: 0 },
          { title: "Рыба", order: 1 },
          { title: "Вегетарианское", order: 2 },
        ],
      },
    },
  });

  for (const t of opts.tables) {
    const table = await db.seatTable.create({
      data: {
        orgId: opts.orgId,
        eventId: event.id,
        label: t.label,
        shape: t.shape,
        x: t.x,
        y: t.y,
        width: t.width ?? 120,
        height: t.height ?? 120,
        capacity: t.capacity,
        seats: {
          create: Array.from({ length: t.capacity }, (_, index) => ({
            orgId: opts.orgId,
            index,
          })),
        },
      },
      include: { seats: { orderBy: { index: "asc" } } },
    });
    void table;
  }

  const freeSeats = await db.seat.findMany({
    where: { eventId: event.id },
    orderBy: [{ tableId: "asc" }, { index: "asc" }],
  });

  const meals = await db.mealOption.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
  });

  let seatCursor = 0;
  for (const [index, displayName] of opts.guests.entries()) {
    // Ответы намеренно вперемешку: сводка на «все придут» выглядит
    // одинаково правильной при любой ошибке в подсчётах.
    const rsvpStatus = index % 7 === 3 ? "DECLINED" : index % 5 === 0 ? "PENDING" : "ACCEPTED";
    const guest = await db.guest.create({
      data: {
        orgId: opts.orgId,
        eventId: event.id,
        displayName,
        searchKey: normalizeName(displayName),
        linkToken: token(),
        rsvpStatus,
        rsvpAt: rsvpStatus === "PENDING" ? null : new Date(),
        linkOpenedAt: rsvpStatus === "PENDING" && index % 2 === 0 ? null : new Date(),
        plusOneAllowed: index % 4 === 0,
        mealOptionId:
          rsvpStatus === "ACCEPTED" && meals.length > 0
            ? meals[index % meals.length].id
            : null,
        aliases: {
          create: expandGuestName(displayName).map((alias) => ({
            orgId: opts.orgId,
            alias,
          })),
        },
      },
    });

    // Часть гостей оставляем нерассаженными — так виднее пустые места в UI.
    if (opts.seatEveryone && seatCursor < freeSeats.length - 3) {
      await db.seat.update({
        where: { id: freeSeats[seatCursor].id },
        data: { guestId: guest.id },
      });
      seatCursor++;
    }
  }

  return event;
}

async function main() {
  console.log("Очистка...");
  await db.organization.deleteMany({});
  await db.user.deleteMany({});

  const passwordHash = await hashPassword("password123");

  const orgA = await db.organization.create({
    data: {
      name: "Студия «Вместе»",
      slug: "vmeste",
      members: {
        create: {
          role: "OWNER",
          user: { create: { email: "planner@example.com", name: "Организатор Аня", passwordHash } },
        },
      },
    },
  });

  const orgB = await db.organization.create({
    data: {
      name: "Агентство «Соседи»",
      slug: "sosedi",
      members: {
        create: {
          role: "OWNER",
          user: { create: { email: "other@example.com", name: "Организатор Борис", passwordHash } },
        },
      },
    },
  });

  const eventA = await seedEvent({
    orgId: orgA.id,
    title: "Аня и Миша",
    slug: "anya-misha",
    date: new Date("2026-09-12T15:00:00Z"),
    venue: "Усадьба Гребнево",
    dateText: "12 сентября 2026",
    guests: GUESTS_A,
    tables: TABLES_A,
    seatEveryone: true,
  });

  const eventB = await seedEvent({
    orgId: orgB.id,
    title: "Лида и Пётр",
    slug: "lida-petr",
    date: new Date("2026-09-19T14:00:00Z"),
    venue: "Лофт на Мойке",
    dateText: "19 сентября 2026",
    guests: GUESTS_B,
    tables: TABLES_A.slice(0, 3),
    seatEveryone: true,
  });

  console.log("\nГотово.");
  console.log(`  Организатор:   planner@example.com / password123`);
  console.log(`  «${eventA.title}»  код входа: ${eventA.shortCode}  (${GUESTS_A.length} гостей)`);
  console.log(`  «${eventB.title}»  код входа: ${eventB.shortCode}  (${GUESTS_B.length} гостей)`);
  const sample = await db.guest.findFirst({
    where: { eventId: eventA.id, rsvpStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n  Вход гостя:  http://localhost:3000/e/${eventA.shortCode}`);
  console.log(`  Приглашение: http://localhost:3000/i/${eventA.slug}`);
  if (sample) {
    console.log(
      `  Именное:     http://localhost:3000/i/${eventA.slug}/${sample.linkToken}  (${sample.displayName})`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
