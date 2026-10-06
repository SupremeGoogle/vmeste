/**
 * Выбор шаблона приглашения.
 *
 * Каждый шаблон показан не названием, а живым образцом в корпусе
 * телефона (PhonePreview): приглашение открывают с телефона, и выбирают
 * его глазами. Список названий («Пудра», «Изумруд», «Бумага») не говорит
 * ничего.
 *
 * Выбор — нажатие на сам телефон: шаблон применяется к приглашению
 * (тексты и фотографии организатора сохраняются) и сразу открывается
 * редактор. Отдельных кнопок «применить» под телефоном больше нет — они
 * повторяли то же действие вторым и третьим способом.
 */
import { PICKABLE_TEMPLATES } from "@/lib/invite-templates";
import { PhonePreview } from "@/components/invite/phone-preview";

export function TemplatePicker({
  action, currentId, slug,
}: {
  action: (formData: FormData) => Promise<void>;
  currentId: string;
  slug: string;
}) {
  return (
    <>
    <p className="mb-6 text-sm text-stone-500">Нажмите на телефон — шаблон откроется в редакторе, ваши тексты и фотографии сохранятся.</p>
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {PICKABLE_TEMPLATES.map((template) => {
        const current = template.id === currentId;

        return (
          <form key={template.id} action={action} className="flex flex-col">
            <input type="hidden" name="template" value={template.id} />
            <input type="hidden" name="slug" value={slug} />

            {/* Витрина как у готовых приглашений: шаблон в корпусе телефона,
                внутри — живой образец, а не нарисованная копия. */}
            <PhonePreview templateId={template.id} name={template.name} current={current} />

            <p className="mt-3 text-center text-sm text-stone-900">
              {template.name}
              {current && <span className="ml-2 text-xs text-stone-500">— выбран</span>}
            </p>
            <p className="mt-1 flex-1 text-center text-xs leading-relaxed text-stone-600">{template.mood}</p>
            {/* Образец открывается для любого шаблона: маршрут
                /templates/[id] собирает его из самого шаблона, и список
                исключений здесь означал бы только одно — про новый
                шаблон забыли. */}
            <a href={`/templates/${template.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 text-center text-xs text-stone-700 underline underline-offset-4">
              Посмотреть макет и анимации ↗
            </a>

          </form>
        );
      })}
    </div>
    </>
  );
}
