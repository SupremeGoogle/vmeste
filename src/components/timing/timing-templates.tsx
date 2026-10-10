import { TIMING_TEMPLATES } from "@/lib/timing-templates";
import { SubmitButton } from "@/components/forms/submit-button";
import { getT } from "@/server/i18n";
import type { Lang } from "@/lib/i18n";

/**
 * Шаблоны предлагаются на языке кабинета, а этапы в превью — на языке
 * мероприятия: именно такими они попадут в план ведущего и команды.
 */
export async function TimingTemplates({ apply, hasSteps, eventLang = "ru" }: { apply: (data: FormData) => Promise<void>; hasSteps: boolean; eventLang?: Lang }) {
  const t = await getT();
  const stageText = (stage: (typeof TIMING_TEMPLATES)[number]["stages"][number]) => (eventLang === "en" ? stage.en : stage);
  return (
    <details className="timing-templates" open={!hasSteps}>
      <summary>{t("Готовые сценарии", "Ready-made schedules")} <span>{t("3 шаблона", "3 templates")}</span></summary>
      <div className="timing-templates-intro">
        <h3>{t("У каждого дня свой ритм", "Every day has its own rhythm")}</h3>
        <p>{t("Выберите настроение вашего праздника. Время, ответственных и заметки можно изменить после добавления.", "Choose the mood of your celebration. You can change the times, who's in charge and the notes after adding it.")}</p>
      </div>
      <div className="timing-template-grid">
        {TIMING_TEMPLATES.map((template, index) => (
          <article key={template.id} className={`timing-template timing-template--${template.theme}`}>
            <div className="timing-template-top"><span>{t("Сценарий", "Schedule")} 0{index + 1}</span><span aria-hidden="true">{index === 0 ? "♡" : index === 1 ? "✧" : "❋"}</span></div>
            <p className="timing-template-mood">{t(template.mood, template.moodEn)}</p>
            <h4>{t(template.name, template.nameEn)}</h4>
            <p className="timing-template-subtitle">{t(template.subtitle, template.subtitleEn)}</p>
            <ol className="timing-template-stages">
              {template.stages.map((stage) => <li key={stage.time}><time>{stage.time}</time><span>{stageText(stage).title}</span></li>)}
            </ol>
            <details className="timing-template-notes">
              <summary>{t("Ответственные и заметки", "Who's in charge and notes")}</summary>
              {template.stages.map((stage) => <div key={stage.time}><strong>{stage.time} · {stageText(stage).responsible}</strong><p>{stageText(stage).notes}</p></div>)}
            </details>
            <form action={apply}>
              <input type="hidden" name="templateId" value={template.id} />
              <SubmitButton pendingText={t("Добавляем план…", "Adding the plan…")}>{hasSteps ? t("Добавить этапы", "Add steps") : t("Выбрать этот сценарий", "Choose this schedule")}<span aria-hidden="true">↗</span></SubmitButton>
            </form>
          </article>
        ))}
      </div>
      {hasSteps ? <p className="timing-template-hint">{t("Новые этапы дополнят ваш план. Пропускаются только этапы, которые совпадают по названию и времени; если вы переименовали этап или сдвинули его время, он добавится ещё раз.", "New steps will be added to your plan. Only steps with the same name and time are skipped; if you renamed a step or moved its time, it will be added again.")}</p> : <p className="timing-template-hint">{t("Все этапы будут добавлены на дату вашей свадьбы, по времени площадки.", "All steps will be added on your wedding date, in the venue's time zone.")}</p>}
    </details>
  );
}
