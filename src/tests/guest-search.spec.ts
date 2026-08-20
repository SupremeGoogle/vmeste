/**
 * Главный тест этапа 1: гость на входе должен себя найти.
 *
 * Набор опечаток не выдуманный — это то, что реально вводят с телефона
 * в темноте: сокращённое имя, потерянная буква, соседняя клавиша,
 * латиница вместо кириллицы, одна фамилия без имени.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import { normalizeName } from "@/lib/name-normalize";
import { expandGuestName } from "@/server/services/diminutives";
import { searchGuests } from "@/server/services/guest-search";
import { randomBytes } from "node:crypto";

const NAMES = [
  "Анастасия Петрова", "Дмитрий Соколов", "Екатерина Иванова", "Александр Кузнецов",
  "Мария Смирнова", "Сергей Попов", "Ольга Васильева", "Михаил Новиков",
  "Юлия Морозова", "Андрей Волков", "Наталья Зайцева", "Владимир Соловьёв",
  "Ксения Павлова", "Артём Семёнов", "Елена Голубева", "Николай Виноградов",
  "Татьяна Богданова", "Павел Воробьёв", "Ирина Фёдорова", "Максим Никитин",
  "Анна Егорова", "Роман Макаров", "Дарья Андреева", "Илья Ковалёв",
  "Светлана Ильина", "Евгений Гусев", "Полина Титова", "Никита Кудрявцев",
  "Марина Беляева", "Константин Тарасов",
];

let eventId = "";
let otherEventId = "";

beforeAll(async () => {
  await resetDb();

  const org = await testDb.organization.create({ data: { name: "Тест", slug: "test-search" } });
  const event = await testDb.event.create({
    data: {
      orgId: org.id, title: "Тестовая свадьба", slug: "test",
      shortCode: "TESTAA", eventDate: new Date("2026-09-12"),
    },
  });
  eventId = event.id;

  const table = await testDb.seatTable.create({
    data: { orgId: org.id, eventId, label: "Стол 1", x: 100, y: 100, capacity: 40 },
  });

  for (const [i, displayName] of NAMES.entries()) {
    const guest = await testDb.guest.create({
      data: {
        orgId: org.id, eventId, displayName,
        searchKey: normalizeName(displayName),
        linkToken: randomBytes(16).toString("base64url"),
        aliases: {
          create: expandGuestName(displayName).map((alias) => ({ orgId: org.id, alias })),
        },
      },
    });
    await testDb.seat.create({
      data: { orgId: org.id, eventId, tableId: table.id, index: i, guestId: guest.id },
    });
  }

  // Второе мероприятие в другой организации с теми же именами — ловушка
  // на утечку между мероприятиями.
  const org2 = await testDb.organization.create({ data: { name: "Тест 2", slug: "test-search-2" } });
  const event2 = await testDb.event.create({
    data: {
      orgId: org2.id, title: "Чужая свадьба", slug: "other",
      shortCode: "TESTBB", eventDate: new Date("2026-09-19"),
    },
  });
  otherEventId = event2.id;
  for (const displayName of ["Анастасия Петрова", "Дмитрий Соколов"]) {
    await testDb.guest.create({
      data: {
        orgId: org2.id, eventId: otherEventId, displayName,
        searchKey: normalizeName(displayName),
        linkToken: randomBytes(16).toString("base64url"),
      },
    });
  }
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

/** Помощник: ждём, что первым найдётся именно этот человек. */
async function expectFirst(query: string, expected: string) {
  const res = await searchGuests(eventId, query);
  if (res.status !== "ok") {
    throw new Error(`«${query}» → ${res.status}, ожидался «${expected}»`);
  }
  expect(res.matches[0].displayName, `запрос «${query}»`).toBe(expected);
}

describe("поиск гостя по имени", () => {
  it("точное совпадение", async () => {
    await expectFirst("Анастасия Петрова", "Анастасия Петрова");
  });

  it("только фамилия", async () => {
    await expectFirst("Петрова", "Анастасия Петрова");
    await expectFirst("Соколов", "Дмитрий Соколов");
  });

  it("только имя", async () => {
    await expectFirst("Екатерина", "Екатерина Иванова");
  });

  it("уменьшительное имя", async () => {
    await expectFirst("Настя", "Анастасия Петрова");
    await expectFirst("Катя Иванова", "Екатерина Иванова");
    await expectFirst("Дима Соколов", "Дмитрий Соколов");
    await expectFirst("Саша Кузнецов", "Александр Кузнецов");
    await expectFirst("Маша Смирнова", "Мария Смирнова");
  });

  it("украинская i и латинские двойники", async () => {
    await expectFirst("Анастасiя", "Анастасия Петрова");
    await expectFirst("Aнастасия Петрова", "Анастасия Петрова");
  });

  it("латиница целиком", async () => {
    await expectFirst("Anastasiya Petrova", "Анастасия Петрова");
    await expectFirst("Sokolov", "Дмитрий Соколов");
  });

  it("ё написана как е", async () => {
    await expectFirst("Артем Семенов", "Артём Семёнов");
    await expectFirst("Соловьев", "Владимир Соловьёв");
  });

  it("пропущенная буква", async () => {
    await expectFirst("Анастсия Петрова", "Анастасия Петрова");
    await expectFirst("Кузнецв", "Александр Кузнецов");
  });

  it("лишняя буква", async () => {
    await expectFirst("Анастассия", "Анастасия Петрова");
  });

  it("переставленные буквы", async () => {
    await expectFirst("Смиронва", "Мария Смирнова");
  });

  it("соседняя клавиша", async () => {
    await expectFirst("Виноградав", "Николай Виноградов");
  });

  it("фамилия и имя в обратном порядке", async () => {
    await expectFirst("Петрова Анастасия", "Анастасия Петрова");
  });

  it("лишние пробелы и регистр", async () => {
    await expectFirst("  анастасия   ПЕТРОВА ", "Анастасия Петрова");
  });

  it("не находит того, кого нет в списке", async () => {
    const res = await searchGuests(eventId, "Иннокентий Барабанов");
    expect(res.status).toBe("not_found");
  });

  it("не выдаёт список по одной букве", async () => {
    expect((await searchGuests(eventId, "а")).status).toBe("too_short");
    expect((await searchGuests(eventId, "")).status).toBe("too_short");
  });

  it("не отдаёт больше пяти совпадений", async () => {
    const res = await searchGuests(eventId, "ов");
    expect(["too_many", "ok", "not_found"]).toContain(res.status);
    if (res.status === "ok") expect(res.matches.length).toBeLessThanOrEqual(5);
  });

  it("не видит гостей чужого мероприятия", async () => {
    const res = await searchGuests(otherEventId, "Анастасия Петрова");
    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.matches).toHaveLength(1);
      expect(res.matches[0].tableLabel).toBeNull(); // в чужом мероприятии рассадки нет
    }
  });

  it("возвращает стол найденного гостя", async () => {
    const res = await searchGuests(eventId, "Анастасия Петрова");
    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.matches[0].tableLabel).toBe("Стол 1");
      expect(res.matches[0].seatIndex).toBe(0);
    }
  });
});
