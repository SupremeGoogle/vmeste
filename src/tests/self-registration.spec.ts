/**
 * Самозапись по общей ссылке и сообщения в адресе — самые «открытые»
 * места сервиса: туда может прийти кто угодно, с любого телефона и с
 * любой ссылкой.
 *
 * Сценарии из жизни:
 *  — с одного телефона отвечает вся семья: ответ мужа не должен лечь
 *    поверх ответа жены;
 *  — гость жмёт «отправить» дважды или поправляет имя — двойника нет;
 *  — в общий чат с открытой ссылкой приходит спамер;
 *  — кто-то присылает гостям ссылку на настоящее приглашение с
 *    поддельным «сообщением об ошибке».
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, resetDb } from "./helpers/db";

// Cookie-банка одного телефона: гостевая сессия живёт в ней между запросами.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
}));

const { POST: join } = await import("@/app/i/[eventSlug]/join/route");
const { samePerson, selfRegistrationNameProblem } = await import("@/server/services/self-registration");
const { flashQuery, readFlash, flashText, signNote, verifiedNote } = await import("@/server/guest-html/flash");

let ip = 0;
async function send(slug: string, fields: Record<string, string>) {
  const form = new FormData();
  form.set("from", "invite");
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  // Свой адрес на каждый запрос — лимит «с одного адреса» здесь не проверяется.
  ip += 1;
  const response = await join(
    new Request(`http://localhost/i/${slug}/join`, { method: "POST", body: form, headers: { "x-forwarded-for": `10.0.0.${ip}` } }),
    { params: Promise.resolve({ eventSlug: slug }) },
  );
  return { status: response.status, location: response.headers.get("location") ?? "" };
}

async function makeEvent(slug: string, opts: { deadline?: Date } = {}) {
  const org = await testDb.organization.create({ data: { name: slug, slug } });
  return testDb.event.create({
    data: {
      orgId: org.id, title: `Свадьба ${slug}`, slug, shortCode: Math.random().toString(36).slice(2, 8).toUpperCase(), status: "PUBLISHED",
      eventDate: new Date(Date.now() + 90 * 24 * 3600 * 1000), rsvpDeadline: opts.deadline ?? null,
    },
  });
}

const guests = (eventId: string) =>
  testDb.guest.findMany({ where: { eventId, archivedAt: null, parentGuestId: null }, orderBy: { createdAt: "asc" }, select: { displayName: true, rsvpStatus: true, selfRegistered: true } });

beforeEach(async () => {
  await resetDb();
  jar.clear();
});
afterAll(async () => {
  await resetDb();
  await testDb.$disconnect();
});

describe("тот же ли это человек", () => {
  it.each([
    ["Мария Иванова", "Мария", true],
    ["Мария", "Маша", true],
    ["Маша Иванова", "Мария Иванова", true],
    ["мария", "МАРИЯ ", true],
    ["Алина", "Олег", false],
    ["Александр", "Александра", false],
    ["Иван Петров", "Пётр Иванов", false],
    ["", "Мария", false],
  ])("«%s» и «%s» → %s", (known, typed, same) => {
    expect(samePerson(known, typed)).toBe(same);
  });

  it("имя со ссылкой или без букв не принимаем", () => {
    expect(selfRegistrationNameProblem("Мария")).toBeNull();
    expect(selfRegistrationNameProblem("Анна-Мария О'Нил")).toBeNull();
    expect(selfRegistrationNameProblem("   ")).not.toBeNull();
    expect(selfRegistrationNameProblem("12345")).not.toBeNull();
    expect(selfRegistrationNameProblem("Дешёвые кредиты http://spam.example")).not.toBeNull();
    expect(selfRegistrationNameProblem("пишите t.me/spam")).not.toBeNull();
    expect(selfRegistrationNameProblem("casino.ru")).not.toBeNull();
  });
});

describe("сообщения в адресе подписаны", () => {
  const secret = "s3cret";

  it("свой текст проходит, поддельный — нет", () => {
    const query = flashQuery(secret, "invalid", "Ответьте на вопрос «Трансфер»");
    expect(readFlash(query, secret)).toEqual({ error: "invalid", message: "Ответьте на вопрос «Трансфер»" });

    const forged = new URLSearchParams({ error: "invalid", msg: "Переведите 5000 ₽ на карту 2200 0000 0000 0000" });
    expect(readFlash(forged, secret).message).toBeNull();
    expect(flashText(readFlash(forged, secret))).toBe("Проверьте заполнение формы.");

    // Подпись от другого текста или чужого мероприятия не подходит.
    forged.set("sig", query.get("sig")!);
    expect(readFlash(forged, secret).message).toBeNull();
    expect(readFlash(query, "другой-секрет").message).toBeNull();
  });

  it("неизвестный код ошибки — общий текст, а не что-то из адреса", () => {
    const flash = readFlash(new URLSearchParams({ error: "<script>" }), secret);
    expect(flash.error).toBe("invalid");
    expect(flashText(flash)).toBe("Проверьте заполнение формы.");
  });

  it("результат брони подарка — только подписанный", () => {
    const sig = signNote(secret, "gift", "Готово, подарок за вами");
    expect(verifiedNote(secret, "gift", "Готово, подарок за вами", sig)).toBe("Готово, подарок за вами");
    expect(verifiedNote(secret, "gift", "Срочно переведите деньги", sig)).toBeNull();
    expect(verifiedNote(secret, "gift", "Готово, подарок за вами", null)).toBeNull();
  });
});

describe("самозапись по общей ссылке", () => {
  it("новый гость появляется в списке и уходит на свою именную ссылку", async () => {
    const event = await makeEvent("selfreg-new");
    const result = await send(event.slug, { guestName: "Алина Смирнова", status: "ACCEPTED" });
    expect(result.status).toBe(303);
    expect(result.location).toMatch(new RegExp(`^/i/${event.slug}/[^/?]+\\?ok=1#rsvp$`));
    expect(await guests(event.id)).toEqual([{ displayName: "Алина Смирнова", rsvpStatus: "ACCEPTED", selfRegistered: true }]);
  });

  it("повторная отправка и поправленное имя — тот же гость, без двойника", async () => {
    const event = await makeEvent("selfreg-twice");
    await send(event.slug, { guestName: "Мария", status: "ACCEPTED" });
    await send(event.slug, { guestName: "Мария", status: "ACCEPTED" });
    await send(event.slug, { guestName: "Маша Иванова", status: "DECLINED" });
    const list = await guests(event.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ displayName: "Маша Иванова", rsvpStatus: "DECLINED" });
  });

  it("с одного телефона отвечают двое: ответ мужа не затирает ответ жены", async () => {
    const event = await makeEvent("selfreg-family");
    await send(event.slug, { guestName: "Алина", status: "ACCEPTED" });
    await send(event.slug, { guestName: "Олег", status: "DECLINED" });
    expect(await guests(event.id)).toEqual([
      { displayName: "Алина", rsvpStatus: "ACCEPTED", selfRegistered: true },
      { displayName: "Олег", rsvpStatus: "DECLINED", selfRegistered: true },
    ]);
  });

  it("жена ответила по именной ссылке, муж — по общей: жена остаётся собой", async () => {
    const event = await makeEvent("selfreg-invited");
    const { POST: personalRsvp } = await import("@/app/i/[eventSlug]/[token]/rsvp/route");
    const wife = await testDb.guest.create({
      data: { orgId: event.orgId, eventId: event.id, displayName: "Александра Ким", searchKey: "александра ким", linkToken: "wife-token-0001" },
    });
    const form = new FormData();
    form.set("guestName", "Александра Ким");
    form.set("status", "ACCEPTED");
    await personalRsvp(new Request(`http://localhost/i/${event.slug}/wife-token-0001/rsvp`, { method: "POST", body: form }), {
      params: Promise.resolve({ eventSlug: event.slug, token: "wife-token-0001" }),
    });
    expect(jar.size).toBe(1); // телефон теперь «помнит» жену

    await send(event.slug, { guestName: "Александр Ким", status: "DECLINED" });
    const after = await testDb.guest.findUnique({ where: { id: wife.id }, select: { displayName: true, rsvpStatus: true } });
    expect(after).toEqual({ displayName: "Александра Ким", rsvpStatus: "ACCEPTED" });
    expect((await guests(event.id)).map((guest) => guest.displayName)).toEqual(["Александра Ким", "Александр Ким"]);
  });

  it("спам со ссылкой в имени — без гостя, с понятной ошибкой", async () => {
    const event = await makeEvent("selfreg-spam");
    const result = await send(event.slug, { guestName: "Казино http://spam.example", status: "ACCEPTED" });
    expect(result.status).toBe(303);
    const query = new URLSearchParams(result.location.split("?")[1].split("#")[0]);
    expect(query.get("error")).toBe("invalid");
    expect(query.get("msg")).toBe("В имени не должно быть ссылок и адресов.");
    expect(query.get("sig")).toBeTruthy();
    expect(await guests(event.id)).toHaveLength(0);
  });

  it("пустое имя — ошибка «напишите имя», гость не заводится", async () => {
    const event = await makeEvent("selfreg-empty");
    const result = await send(event.slug, { guestName: "   ", status: "ACCEPTED" });
    expect(new URLSearchParams(result.location.split("?")[1].split("#")[0]).get("error")).toBe("name");
    expect(await guests(event.id)).toHaveLength(0);
  });

  it("срок ответа прошёл — гостя не заводим", async () => {
    const event = await makeEvent("selfreg-late", { deadline: new Date(Date.now() - 60_000) });
    const result = await send(event.slug, { guestName: "Опоздавший Гость", status: "ACCEPTED" });
    expect(new URLSearchParams(result.location.split("?")[1].split("#")[0]).get("error")).toBe("deadline");
    expect(await guests(event.id)).toHaveLength(0);
  });

  it("черновик приглашения по общей ссылке не принимает ответы", async () => {
    const event = await makeEvent("selfreg-draft");
    await testDb.event.update({ where: { id: event.id }, data: { status: "DRAFT" } });
    const result = await send(event.slug, { guestName: "Гость Черновика", status: "ACCEPTED" });
    expect(result.status).toBe(404);
    expect(await guests(event.id)).toHaveLength(0);
  });
});
