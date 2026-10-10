import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import { timingTemplateSteps } from "@/lib/timing-templates";
import { makeT, type Lang } from "@/lib/i18n";

/**
 * Append a complete scenario atomically; keep custom, completed and edited stages.
 * Повтором считается только этап с тем же названием и временем: происхождение
 * этапа из шаблона не хранится, поэтому отредактированный этап добавится снова
 * (подсказка в components/timing/timing-templates.tsx говорит об этом прямо).
 * `lang` — язык сообщений (кабинета); сами этапы — на языке мероприятия.
 */
export async function applyTimingTemplate(ctx: EventContext, templateId: string, lang: Lang = "ru") {
  const t = makeT(lang);
  try {
    return await db.$transaction(async (tx) => {
      const event = await tx.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { eventDate: true, timezone: true, language: true } });
      if (!event) return { ok: false, message: t("Мероприятие не найдено", "Event not found") };
      const stages = timingTemplateSteps(templateId, event.eventDate, event.timezone, event.language === "en" ? "en" : "ru");
      if (!stages) return { ok: false, message: t("Не удалось добавить сценарий — выберите шаблон из списка", "Couldn't add the schedule — choose a template from the list") };
      const existing = await tx.dayStep.findMany({ where: { eventId: ctx.eventId, orgId: ctx.orgId }, select: { title: true, startsAt: true } });
      const keys = new Set(existing.map((stage) => `${stage.startsAt.toISOString()}|${stage.title}`));
      const additions = stages.filter((stage) => !keys.has(`${stage.startsAt.toISOString()}|${stage.title}`));
      if (!additions.length) return { ok: true, message: t("Этапы этого сценария уже есть в вашем плане", "The steps from this schedule are already in your plan") };
      await tx.dayStep.createMany({ data: additions.map((stage) => ({ ...stage, orgId: ctx.orgId, eventId: ctx.eventId, action: "NONE" as const, reminderMinutes: 0 })) });
      return { ok: true, message: t("Сценарий добавлен. Теперь можно настроить время, ответственных и заметки", "Schedule added. Now you can adjust the times, who's in charge and the notes") };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return { ok: false, message: t("План только что изменился. Нажмите на сценарий ещё раз", "The plan just changed. Click the schedule again") };
    }
    throw error;
  }
}
