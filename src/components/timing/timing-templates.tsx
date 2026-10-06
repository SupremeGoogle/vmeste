import { TIMING_TEMPLATES } from "@/lib/timing-templates";
import { SubmitButton } from "@/components/forms/submit-button";

export function TimingTemplates({ apply, hasSteps }: { apply: (data: FormData) => Promise<void>; hasSteps: boolean }) {
  return (
    <details className="timing-templates" open={!hasSteps}>
      <summary>Готовые сценарии <span>3 шаблона</span></summary>
      <div className="timing-templates-intro">
        <h3>У каждого дня свой ритм</h3>
        <p>Выберите настроение вашего праздника. Время, ответственных и заметки можно изменить после добавления.</p>
      </div>
      <div className="timing-template-grid">
        {TIMING_TEMPLATES.map((template, index) => (
          <article key={template.id} className={`timing-template timing-template--${template.theme}`}>
            <div className="timing-template-top"><span>Сценарий 0{index + 1}</span><span aria-hidden="true">{index === 0 ? "♡" : index === 1 ? "✧" : "❋"}</span></div>
            <p className="timing-template-mood">{template.mood}</p>
            <h4>{template.name}</h4>
            <p className="timing-template-subtitle">{template.subtitle}</p>
            <ol className="timing-template-stages">
              {template.stages.map((stage) => <li key={stage.time}><time>{stage.time}</time><span>{stage.title}</span></li>)}
            </ol>
            <details className="timing-template-notes">
              <summary>Ответственные и заметки</summary>
              {template.stages.map((stage) => <div key={stage.time}><strong>{stage.time} · {stage.responsible}</strong><p>{stage.notes}</p></div>)}
            </details>
            <form action={apply}>
              <input type="hidden" name="templateId" value={template.id} />
              <SubmitButton pendingText="Добавляем план…">{hasSteps ? "Добавить этапы" : "Выбрать этот сценарий"}<span aria-hidden="true">↗</span></SubmitButton>
            </form>
          </article>
        ))}
      </div>
      {hasSteps ? <p className="timing-template-hint">Новые этапы дополнят ваш план. Уже добавленные этапы этого сценария не повторятся.</p> : <p className="timing-template-hint">Все этапы будут добавлены на дату вашей свадьбы, по времени площадки.</p>}
    </details>
  );
}
