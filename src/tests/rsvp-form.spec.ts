/**
 * Конструктор анкеты RSVP: проверка ответов и полный путь через базу —
 * от вопросов организатора до снимка ответов у гостя.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Страница ответа читает тему через кеш Next.js — вне сервера Next его нет.
vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: T) => fn,
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
}));
import { randomBytes } from "node:crypto";
import { resetDb, testDb } from "./helpers/db";
import { checkAnswers, formatAnswer, readAnswers, type RsvpQuestion } from "@/lib/rsvp-form";
import { submitRsvp } from "@/server/services/rsvp";
import { addRsvpQuestion, effectiveRsvpQuestions, listRsvpQuestions, updateRsvpQuestion } from "@/server/repositories/rsvp-questions";
import { rsvpFieldsHtml } from "@/server/guest-html/rsvp-fields";
import { normalizeName } from "@/lib/name-normalize";

const q = (id: string, type: RsvpQuestion["type"], extra: Partial<RsvpQuestion> = {}): RsvpQuestion => ({
  id, type, title: `Вопрос ${id}`, description: "", required: false, options: [], ...extra,
});

describe("проверка ответов", () => {
  const questions = [
    q("a", "SHORT_TEXT", { required: true }),
    q("b", "SINGLE_CHOICE", { options: ["Да", "Нет"] }),
    q("c", "MULTIPLE_CHOICE", { options: ["Такси", "Автобус", "Сам"] }),
    q("d", "RATING"),
    q("e", "DATE"),
  ];

  it("обязательный вопрос требуют только у тех, кто придёт", () => {
    expect(checkAnswers(questions, { a: [""] }, "ACCEPTED")).toMatchObject({ ok: false });
    expect(checkAnswers(questions, { a: [""] }, "DECLINED")).toMatchObject({ ok: true });
  });

  it("чужой вариант не принимается", () => {
    expect(checkAnswers(questions, { a: ["ok"], b: ["Может быть"] }, "ACCEPTED")).toMatchObject({ ok: false });
    expect(checkAnswers(questions, { a: ["ok"], c: ["Такси", "Вертолёт"] }, "ACCEPTED")).toMatchObject({ ok: false });
  });

  it("собирает снимок: несколько вариантов — в порядке вопроса, оценка и дата проверяются", () => {
    const result = checkAnswers(questions, { a: ["", "Анна"], c: ["Сам", "Такси"], d: ["4"], e: ["2027-04-23"] }, "ACCEPTED");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answers.map((answer) => [answer.questionId, answer.value])).toEqual([
      ["a", "Анна"], ["c", ["Такси", "Сам"]], ["d", "4"], ["e", "2027-04-23"],
    ]);
    expect(formatAnswer(result.answers[3])).toBe("23.04.2027");
    expect(checkAnswers(questions, { a: ["x"], d: ["7"] }, "ACCEPTED").ok).toBe(false);
  });

  it("вопрос, которого не было на странице, сохраняет прежний ответ", () => {
    const previous = [{ questionId: "b", title: "старое название", type: "SINGLE_CHOICE" as const, value: "Да" }];
    const result = checkAnswers(questions, { a: ["x"] }, "ACCEPTED", previous);
    expect(result.ok && result.answers.find((answer) => answer.questionId === "b")).toMatchObject({ value: "Да", title: "Вопрос b" });
  });

  it("ответ на удалённый организатором вопрос переживает повторный ответ гостя", () => {
    const previous = [{ questionId: "gone", title: "Парковка?", type: "SINGLE_CHOICE" as const, value: "Да" }];
    const result = checkAnswers(questions, { a: ["x"] }, "ACCEPTED", previous);
    expect(result.ok && result.answers.find((answer) => answer.questionId === "gone")).toMatchObject({ title: "Парковка?", value: "Да" });
  });

  it("снятые все флажки стирают ответ: пустое скрытое значение говорит, что вопрос был", () => {
    const form = new FormData();
    form.append("q:c", "");
    const raw = readAnswers(form, questions);
    expect(raw.c).toEqual([""]);
    const previous = [{ questionId: "c", title: "", type: "MULTIPLE_CHOICE" as const, value: ["Такси"] }];
    const result = checkAnswers(questions, { ...raw, a: ["x"] }, "ACCEPTED", previous);
    expect(result.ok && result.answers.some((answer) => answer.questionId === "c")).toBe(false);
  });

  it("поля рисуются обычными элементами формы, меню и бар — своими именами полей", () => {
    const html = rsvpFieldsHtml([q("m", "MEAL"), q("b", "SINGLE_CHOICE", { options: ["Да"] })], {
      meals: [{ id: "meal1", title: "Рыба" }], drinks: [], selectedMeal: "meal1", selectedDrinks: [], answers: [],
    });
    expect(html).toContain('name="mealOptionId" value="meal1" checked');
    expect(html).toContain('name="q:b"');
    expect(html).not.toContain("drinkOptionIds");
  });

  it("песня для диджея пишется в musicWish, а у шаблона со своим полем не дублируется", () => {
    const ctx = { meals: [], drinks: [], selectedMeal: null, selectedDrinks: [], answers: [], musicWish: "Queen & <ABBA>" };
    const html = rsvpFieldsHtml([q("s", "MUSIC", { title: "Какую песню поставить?" })], ctx);
    expect(html).toContain('name="musicWish"');
    expect(html).toContain('value="Queen &amp; &lt;ABBA&gt;"');
    expect(html).not.toContain('name="q:s"');
    expect(rsvpFieldsHtml([q("s", "MUSIC")], { ...ctx, skip: { music: true } })).toBe("");
  });
});

describe("анкета через базу", () => {
  beforeEach(resetDb);
  afterAll(() => testDb.$disconnect());

  async function world() {
    const org = await testDb.organization.create({ data: { name: "rf", slug: "rf" } });
    const event = await testDb.event.create({
      data: {
        orgId: org.id, title: "Свадьба", slug: "rf", shortCode: "RF0001", eventDate: new Date("2027-04-23"),
        mealOptions: { create: [{ title: "Рыба", order: 0 }] },
      },
      include: { mealOptions: true },
    });
    const token = randomBytes(16).toString("base64url");
    const guest = await testDb.guest.create({
      data: { orgId: org.id, eventId: event.id, displayName: "Анна Петрова", searchKey: normalizeName("Анна Петрова"), linkToken: token },
    });
    return { ctx: { orgId: org.id, eventId: event.id, userId: "u", role: "OWNER" } as never, eventId: event.id, token, guestId: guest.id, mealId: event.mealOptions[0].id };
  }

  it("без конструктора анкета — меню и бар; при первом открытии они становятся строками", async () => {
    const w = await world();
    expect((await effectiveRsvpQuestions(w.eventId)).map((question) => question.type)).toEqual(["MEAL", "DRINKS"]);
    const listed = await listRsvpQuestions(w.ctx);
    expect(listed.map((question) => question.type)).toEqual(["MEAL", "DRINKS"]);
    expect(await testDb.rsvpQuestion.count({ where: { eventId: w.eventId } })).toBe(2);
    // Второго меню не добавить.
    expect(await addRsvpQuestion(w.ctx, "MEAL")).toMatchObject({ ok: false });
  });

  it("ответ гостя сохраняется снимком, обязательное меню требуется у пришедших", async () => {
    const w = await world();
    await listRsvpQuestions(w.ctx);
    const added = await addRsvpQuestion(w.ctx, "SINGLE_CHOICE");
    if (!added.ok) throw new Error(added.message);
    await updateRsvpQuestion(w.ctx, added.question.id, { title: "Нужна парковка?", options: ["Да", "Нет"], required: true });
    const meal = (await effectiveRsvpQuestions(w.eventId)).find((question) => question.type === "MEAL")!;
    await updateRsvpQuestion(w.ctx, meal.id, { required: true });

    expect(await submitRsvp(w.token, { status: "ACCEPTED", answers: { [added.question.id]: ["Да"] } })).toMatchObject({ ok: false, message: "Выберите блюдо" });
    expect(await submitRsvp(w.token, { status: "ACCEPTED", mealOptionId: w.mealId, answers: { [added.question.id]: [""] } })).toMatchObject({ ok: false });
    expect(await submitRsvp(w.token, { status: "ACCEPTED", mealOptionId: w.mealId, answers: { [added.question.id]: ["", "Да"] } })).toMatchObject({ ok: true });

    const guest = await testDb.guest.findUniqueOrThrow({ where: { id: w.guestId } });
    expect(guest.mealOptionId).toBe(w.mealId);
    expect(guest.rsvpAnswers).toEqual([{ questionId: added.question.id, title: "Нужна парковка?", type: "SINGLE_CHOICE", value: "Да" }]);

    // Отказавшегося не заставляют отвечать на обязательное.
    expect(await submitRsvp(w.token, { status: "DECLINED", answers: { [added.question.id]: [""] } })).toMatchObject({ ok: true });
  });

  it("два одновременных первых открытия конструктора не задваивают меню и бар", async () => {
    const w = await world();
    await Promise.all([listRsvpQuestions(w.ctx), listRsvpQuestions(w.ctx), listRsvpQuestions(w.ctx)]);
    const rows = await testDb.rsvpQuestion.findMany({ where: { eventId: w.eventId } });
    expect(rows.map((row) => row.type).sort()).toEqual(["DRINKS", "MEAL"]);
  });

  it("выключенное потом блюдо остаётся у гостя, а не ломает повторный ответ", async () => {
    const w = await world();
    expect(await submitRsvp(w.token, { status: "ACCEPTED", mealOptionId: w.mealId })).toMatchObject({ ok: true });
    await testDb.mealOption.update({ where: { id: w.mealId }, data: { active: false } });
    // Анкета возвращает прежний выбор скрытым полем — это не «чужое блюдо».
    expect(await submitRsvp(w.token, { status: "ACCEPTED", mealOptionId: w.mealId })).toMatchObject({ ok: true });
    expect((await testDb.guest.findUniqueOrThrow({ where: { id: w.guestId } })).mealOptionId).toBe(w.mealId);
  });

  it("страница ответа: убранное меню уходит скрытым полем, после ошибки введённое не пропадает", async () => {
    const { GET, POST } = await import("@/app/i/[eventSlug]/[token]/rsvp/route");
    const w = await world();
    await submitRsvp(w.token, { status: "ACCEPTED", mealOptionId: w.mealId });
    await listRsvpQuestions(w.ctx);
    const added = await addRsvpQuestion(w.ctx, "SINGLE_CHOICE");
    if (!added.ok) throw new Error(added.message);
    await updateRsvpQuestion(w.ctx, added.question.id, { title: "Парковка?", options: ["Да", "Нет"], required: true });
    const meal = (await effectiveRsvpQuestions(w.eventId)).find((question) => question.type === "MEAL")!;
    await testDb.rsvpQuestion.delete({ where: { id: meal.id } });

    const params = { params: Promise.resolve({ eventSlug: "rf", token: w.token }) };
    const page = await (await GET(new Request(`http://x/i/rf/${w.token}/rsvp`), params)).text();
    expect(page).toContain(`<input type="hidden" name="mealOptionId" value="${w.mealId}">`);

    const form = new FormData();
    form.set("status", "ACCEPTED");
    form.set("comment", "без орехов");
    form.append(`q:${added.question.id}`, "");
    const response = await POST(new Request(`http://x/i/rf/${w.token}/rsvp`, { method: "POST", body: form }), params);
    expect(response.status).toBe(422);
    const again = await response.text();
    expect(again).toContain("Ответьте на вопрос «Парковка?»");
    expect(again).toContain("без орехов</textarea>");
    expect(again).toMatch(/value="ACCEPTED" checked/);
  });
});

describe("анкета внутри шаблонов со встроенной формой", () => {
  const INLINE = ["tili", "bohema", "kraski", "serdce", "antic", "skvoz-vremya"];

  it.each(INLINE)("%s: вопросы конструктора — внутри формы перед кнопкой, убранный бар не рисуется", async (id) => {
    const { findTemplate } = await import("@/lib/invite-templates");
    const { readBlockContent } = await import("@/lib/invite-blocks");
    const { renderBlocks } = await import("@/server/guest-html/invite-html");
    const template = findTemplate(id)!;
    const blocks = template.blocks.map((block, index) => ({
      id: `b${index}`, type: block.type, order: index, visible: true, ...readBlockContent(block.type, block.content),
    })) as never;
    const extraFields = rsvpFieldsHtml([q("t", "SINGLE_CHOICE", { title: "Нужна ли парковка?", options: ["Да", "Нет"] })], {
      meals: [], drinks: [], selectedMeal: null, selectedDrinks: [], answers: [],
    });
    const rsvp = {
      action: "/i/slug/token/rsvp", guestName: "Анна", status: "PENDING" as const,
      drinks: [{ id: "d1", title: "Вино" }], chosenDrinks: [], musicWish: "",
      keep: { mealOptionId: null, comment: "", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [] },
      saved: false, error: null, extraFields,
    };
    const html = renderBlocks(blocks, "/i/slug/token/rsvp", null, new Date("2027-04-23"), template.theme, "UTC", { rsvp });
    const form = html.slice(html.indexOf('action="/i/slug/token/rsvp"'), html.indexOf("</form>", html.indexOf('action="/i/slug/token/rsvp"')));
    expect(form).toContain('name="q:t"');
    expect(form.indexOf('name="q:t"')).toBeLessThan(form.lastIndexOf('type="submit"'));
    expect(form).toContain('name="drinkOptionIds"');

    const hidden = renderBlocks(blocks, "/i/slug/token/rsvp", null, new Date("2027-04-23"), template.theme, "UTC", { rsvp: { ...rsvp, drinksHidden: true } });
    expect(hidden).not.toContain('name="drinkOptionIds"');
  });
});
