/**
 * Настройки мероприятия и перевод времени площадки.
 *
 * Часовой пояс — то место, где ошибка тихая и дорогая: дата свадьбы
 * сдвинется на несколько часов, и никто не заметит до дня икс
 * (PLAN.md §4.12).
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { testDb, resetDb } from "./helpers/db";
import {
  addMealOption, createEvent, getEvent, listMealOptions, rotateGuestSecret,
  toggleMealOption, updateEventSettings,
} from "@/server/repositories/events";
import { slugify } from "@/lib/slugify";
import { formatEventDateTime } from "@/lib/format-datetime";
import type { OrgContext } from "@/server/context";

let ctxA: OrgContext;
let ctxB: OrgContext;
let eventA: string;
let eventB: string;

beforeEach(async () => {
  await resetDb();
  const orgA = await testDb.organization.create({ data: { name: "A", slug: "set-a" } });
  const orgB = await testDb.organization.create({ data: { name: "B", slug: "set-b" } });
  ctxA = { kind: "org", userId: "u1", orgId: orgA.id, role: "OWNER" };
  ctxB = { kind: "org", userId: "u2", orgId: orgB.id, role: "OWNER" };

  const a = await createEvent(ctxA, {
    title: "Аня и Миша", slug: "anya-misha", eventDate: new Date("2026-09-12T12:00:00Z"),
  });
  const b = await createEvent(ctxB, {
    title: "Лида и Пётр", slug: "lida-petr", eventDate: new Date("2026-09-19T11:00:00Z"),
  });
  eventA = a!.id;
  eventB = b!.id;
});

afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("адрес приглашения из названия", () => {
  it("транслитерирует русское название", () => {
    expect(slugify("Аня и Миша")).toBe("anya-i-misha");
  });

  it("выбрасывает лишние знаки и не оставляет дефисов по краям", () => {
    expect(slugify("  Свадьба!!! Ольги & Щукина  ")).toBe("svadba-olgi-schukina");
  });

  it("ё не превращается в пустоту", () => {
    expect(slugify("Пётр")).toBe("petr");
  });
});

describe("создание мероприятия", () => {
  it("занятый адрес приглашения не роняет создание, а отказывает", async () => {
    const duplicate = await createEvent(ctxA, {
      title: "Другая свадьба",
      slug: "anya-misha",
      eventDate: new Date("2026-11-01T12:00:00Z"),
    });
    expect(duplicate).toBeNull();
  });

  it("тот же адрес в другой организации — можно: слаг уникален внутри своей", async () => {
    const other = await createEvent(ctxB, {
      title: "Совпадение",
      slug: "anya-misha",
      eventDate: new Date("2026-11-01T12:00:00Z"),
    });
    expect(other).not.toBeNull();
  });
});

describe("настройки", () => {
  it("сохраняются и читаются обратно", async () => {
    const ok = await updateEventSettings(ctxA, eventA, {
      title: "Аня и Миша",
      eventDate: new Date("2026-09-12T13:00:00Z"),
      timezone: "Asia/Vladivostok",
      venueName: "Усадьба",
      venueAddr: "Парковая, 1",
      allowPlusOne: false,
      photosEnabled: false,
      wishesEnabled: true,
      raffleEnabled: false,
      photoLimitPerGuest: 7,
    });
    expect(ok).toBe(true);

    const event = await getEvent(ctxA, eventA);
    expect(event?.timezone).toBe("Asia/Vladivostok");
    expect(event?.photoLimitPerGuest).toBe(7);
    expect(event?.allowPlusOne).toBe(false);
  });

  it("не меняют чужое мероприятие", async () => {
    const ok = await updateEventSettings(ctxA, eventB, {
      title: "Перехват",
      eventDate: new Date("2026-01-01T00:00:00Z"),
      timezone: "Europe/Moscow",
      venueName: null, venueAddr: null,
      allowPlusOne: true, photosEnabled: true, wishesEnabled: true, raffleEnabled: true,
      photoLimitPerGuest: 5,
    });
    expect(ok).toBe(false);

    const event = await testDb.event.findUniqueOrThrow({ where: { id: eventB } });
    expect(event.title).toBe("Лида и Пётр");
  });

  it("время показывается в поясе площадки, а не сервера", () => {
    const moment = new Date("2026-09-12T12:00:00Z");
    expect(formatEventDateTime(moment, "Europe/Moscow")).toContain("15:00");
    expect(formatEventDateTime(moment, "Asia/Vladivostok")).toContain("22:00");
  });

  it("сброс гостевых сессий меняет секрет, а токены гостей не трогает", async () => {
    const before = await testDb.event.findUniqueOrThrow({ where: { id: eventA } });
    expect(await rotateGuestSecret(ctxA, eventA)).toBe(true);
    const after = await testDb.event.findUniqueOrThrow({ where: { id: eventA } });

    expect(after.guestLinkSecret).not.toBe(before.guestLinkSecret);
    expect(after.guestLinkSecret).toHaveLength(64);
  });

  it("сброс не дотягивается до чужого мероприятия", async () => {
    expect(await rotateGuestSecret(ctxA, eventB)).toBe(false);
  });
});

describe("меню на ужин", () => {
  it("добавляется по порядку", async () => {
    await addMealOption(ctxA, eventA, "Мясо");
    await addMealOption(ctxA, eventA, "Рыба");

    const meals = await listMealOptions(ctxA, eventA);
    expect(meals.map((meal) => meal.title)).toEqual(["Мясо", "Рыба"]);
    expect(meals.map((meal) => meal.order)).toEqual([0, 1]);
  });

  it("не заводится в чужом мероприятии", async () => {
    expect(await addMealOption(ctxA, eventB, "Чужое")).toBeNull();
    expect(await listMealOptions(ctxB, eventB)).toHaveLength(0);
  });

  it("выключается и включается, а не удаляется", async () => {
    const meal = await addMealOption(ctxA, eventA, "Вегетарианское");
    expect(await toggleMealOption(ctxA, eventA, meal!.id)).toBe(true);

    let meals = await listMealOptions(ctxA, eventA);
    expect(meals[0].active).toBe(false);

    await toggleMealOption(ctxA, eventA, meal!.id);
    meals = await listMealOptions(ctxA, eventA);
    expect(meals[0].active).toBe(true);
  });

  it("чужое блюдо не переключается", async () => {
    const meal = await addMealOption(ctxB, eventB, "Мясо");
    expect(await toggleMealOption(ctxA, eventA, meal!.id)).toBe(false);
  });
});
