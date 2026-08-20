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

async function seedEvent(opts: {
  orgId: string;
  title: string;
  slug: string;
  date: Date;
  venue: string;
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

  let seatCursor = 0;
  for (const displayName of opts.guests) {
    const guest = await db.guest.create({
      data: {
        orgId: opts.orgId,
        eventId: event.id,
        displayName,
        searchKey: normalizeName(displayName),
        linkToken: token(),
        rsvpStatus: "ACCEPTED",
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
    guests: GUESTS_B,
    tables: TABLES_A.slice(0, 3),
    seatEveryone: true,
  });

  console.log("\nГотово.");
  console.log(`  Организатор:   planner@example.com / password123`);
  console.log(`  «${eventA.title}»  код входа: ${eventA.shortCode}  (${GUESTS_A.length} гостей)`);
  console.log(`  «${eventB.title}»  код входа: ${eventB.shortCode}  (${GUESTS_B.length} гостей)`);
  console.log(`\n  Вход гостя: http://localhost:3000/e/${eventA.shortCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
