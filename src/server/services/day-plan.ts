/**
 * Тайминг дня: этапы, командная ссылка и запуск действий с этапа.
 *
 * Запуск этапа сначала атомарно захватывает его (PENDING → RUNNING): два
 * телефона, нажавшие одновременно, не проведут розыгрыш дважды. Победитель
 * дополнительно защищён проверкой в raffle.ts. Если запуск оборвался
 * (закрыли вкладку, пропала связь), через две минуты этап можно запустить
 * снова.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import { localTimeToUtc, stepInput, stepInputMessage } from "@/lib/wedding-day";
import { makeT, type Lang, type T } from "@/lib/i18n";
import { drawWinner, fixEntries } from "@/server/services/raffle";
import { setScreenMode } from "@/server/services/screen";

/** Ошибка, текст которой можно показать человеку по командной ссылке. */
class PlanError extends Error {}

const STALL_MS = 120_000;

type Result = { ok: boolean; message: string };

export function listDaySteps(ctx: EventContext) {
  return db.dayStep.findMany({
    where: { eventId: ctx.eventId, orgId: ctx.orgId },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
}

/** Доступ по командной ссылке — как сотрудник, но только к плану. */
export async function teamPlanAccess(token: string): Promise<EventContext | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const event = await db.event.findUnique({ where: { teamPlanToken: token }, select: { id: true, orgId: true, status: true } });
  if (!event || event.status === "ARCHIVED") return null;
  return { kind: "org", userId: "team-link", orgId: event.orgId, eventId: event.id, role: "STAFF" };
}

/** Новая ссылка взамен старой или отключение доступа совсем. */
export async function changeTeamLink(ctx: EventContext, revoke: boolean) {
  return db.event.updateMany({
    where: { id: ctx.eventId, orgId: ctx.orgId },
    data: { teamPlanToken: revoke ? null : randomBytes(24).toString("base64url") },
  });
}

/** `lang` — язык сообщений: у организатора язык кабинета, по командной ссылке — язык мероприятия. */
export async function saveDayStep(ctx: EventContext, id: string, input: unknown, lang: Lang = "ru"): Promise<Result> {
  const t = makeT(lang);
  const parsed = stepInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: stepInputMessage(issue.path[0], issue.message, lang) };
  }
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { timezone: true } });
  if (!event) return { ok: false, message: t("Мероприятие не найдено", "Event not found") };

  const { localTime, raffleId, ...fields } = parsed.data;
  const startsAt = localTimeToUtc(localTime, event.timezone);
  if (!startsAt) return { ok: false, message: t("Такого времени нет в часовом поясе площадки — проверьте дату и время", "That time doesn't exist in the venue's time zone — check the date and time") };
  if (fields.action === "RAFFLE") {
    const raffle = await db.raffle.findFirst({ where: { id: raffleId, eventId: ctx.eventId, orgId: ctx.orgId }, select: { id: true } });
    if (!raffle) return { ok: false, message: t("Выберите розыгрыш — или сначала создайте его на вкладке «Розыгрыш»", "Choose a raffle — or create one first on the Raffle tab") };
  }

  const data = { ...fields, startsAt, raffleId: fields.action === "RAFFLE" ? raffleId : null };
  if (id) {
    const updated = await db.dayStep.updateMany({ where: { id, eventId: ctx.eventId, orgId: ctx.orgId, status: "PENDING" }, data });
    if (!updated.count) return { ok: false, message: t("Этап уже выполнен или запускается — изменить его нельзя", "This step is already done or running — it can't be changed") };
    return { ok: true, message: t("Этап сохранён", "Step saved") };
  }
  await db.dayStep.create({ data: { ...data, eventId: ctx.eventId, orgId: ctx.orgId } });
  return { ok: true, message: t("Этап добавлен", "Step added") };
}

export async function runDayStep(ctx: EventContext, stepId: string, lang: Lang = "ru"): Promise<Result> {
  const t = makeT(lang);
  const scope = { id: stepId, eventId: ctx.eventId, orgId: ctx.orgId };
  const step = await db.dayStep.findFirst({ where: scope });
  if (!step) return { ok: false, message: t("Этап не найден", "Step not found") };

  const runStartedAt = new Date();
  const locked = await db.dayStep.updateMany({
    where: {
      ...scope,
      OR: [{ status: "PENDING" }, { status: "RUNNING", runStartedAt: { lt: new Date(Date.now() - STALL_MS) } }],
    },
    data: { status: "RUNNING", runStartedAt },
  });
  if (!locked.count) return { ok: false, message: t("Этап уже выполнен или его запускают с другого телефона", "This step is already done or is being run from another phone") };

  try {
    if (step.action === "RAFFLE") await runRaffle(ctx, step.raffleId, t);
    else if (step.action !== "NONE") {
      const mode = step.action === "SCREEN_PHOTOS" ? "PHOTOS" : step.action === "SCREEN_WISHES" ? "WISHES" : "MIXED";
      if (!(await setScreenMode(ctx, ctx.eventId, mode))) throw new PlanError(t("Не удалось переключить экран", "Couldn't switch the screen"));
    }
    await db.dayStep.updateMany({
      where: { ...scope, status: "RUNNING", runStartedAt },
      data: { status: "DONE", completedAt: new Date() },
    });
    return {
      ok: true,
      message: step.action === "NONE"
        ? t(`«${step.title}» — готово`, `“${step.title}” — done`)
        : t(`«${step.title}» — экран переключён`, `“${step.title}” — screen switched`),
    };
  } catch (error) {
    await db.dayStep.updateMany({
      where: { ...scope, status: "RUNNING", runStartedAt },
      data: { status: "PENDING", runStartedAt: null },
    });
    // Текст внутренних ошибок базы и хранилища по командной ссылке не показываем.
    return { ok: false, message: error instanceof PlanError ? error.message : t("Не получилось. Попробуйте ещё раз", "That didn't work. Please try again") };
  }
}

/** Розыгрыш с этапа: зафиксировать участников, выбрать победителя, вывести на экран. */
async function runRaffle(ctx: EventContext, raffleId: string | null, t: T) {
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { raffleEnabled: true } });
  if (!event?.raffleEnabled) throw new PlanError(t("Розыгрыш выключен в настройках свадьбы", "The raffle is turned off in the wedding settings"));
  if (!raffleId) throw new PlanError(t("К этапу не привязан розыгрыш", "No raffle is linked to this step"));
  const raffle = await db.raffle.findFirst({ where: { id: raffleId, eventId: ctx.eventId, orgId: ctx.orgId }, select: { drawnAt: true } });
  if (!raffle) throw new PlanError(t("Розыгрыш удалён — выберите другой в этапе", "The raffle was deleted — choose another one in the step"));

  if (!raffle.drawnAt) {
    const fixed = await fixEntries(ctx, raffleId);
    if (!fixed.ok && fixed.reason !== "drawn") throw new PlanError(fixed.message);
    const drawn = await drawWinner(ctx, raffleId);
    if (!drawn.ok && drawn.reason !== "drawn") throw new PlanError(drawn.message);
  }
  await db.event.updateMany({ where: { id: ctx.eventId, orgId: ctx.orgId }, data: { activeRaffleId: raffleId } });
  if (!(await setScreenMode(ctx, ctx.eventId, "RAFFLE"))) throw new PlanError(t("Не удалось переключить экран", "Couldn't switch the screen"));
}
