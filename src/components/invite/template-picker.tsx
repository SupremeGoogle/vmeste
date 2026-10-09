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
import { shuffledTemplates } from "@/lib/invite-templates";
import { PhonePreview } from "@/components/invite/phone-preview";
import { TEMPLATE_COPY_EN } from "@/app/(app)/_landing/templates-en";
import { makeT, type Lang } from "@/lib/i18n";

export function TemplatePicker({
  action, currentId, slug, lang = "ru",
}: {
  action: (formData: FormData) => Promise<void>;
  currentId: string;
  slug: string;
  /** Язык кабинета: названия и описания шаблонов — из TEMPLATE_COPY_EN. */
  lang?: Lang;
}) {
  const t = makeT(lang);
  return (
    <>
    <p className="mb-6 text-sm text-stone-500">{t("Нажмите на телефон — шаблон откроется в редакторе, ваши тексты и фотографии сохранятся.", "Tap a phone to open that template in the editor — your text and photos will be kept.")}</p>
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {shuffledTemplates().map((template) => {
        const current = template.id === currentId;
        const copy = lang === "en" ? TEMPLATE_COPY_EN[template.id] : undefined;
        const name = copy?.name ?? template.name;

        return (
          <form key={template.id} action={action} className="flex flex-col">
            <input type="hidden" name="template" value={template.id} />
            <input type="hidden" name="slug" value={slug} />

            {/* Витрина как у готовых приглашений: шаблон в корпусе телефона,
                внутри — живой образец, а не нарисованная копия. */}
            <PhonePreview templateId={template.id} name={name} current={current} lang={lang} />

            <p className="mt-3 text-center text-sm text-stone-900">
              {name}
              {current && <span className="ml-2 text-xs text-stone-500">{t("— выбран", "— selected")}</span>}
            </p>
            <p className="mt-1 flex-1 text-center text-xs leading-relaxed text-stone-600">{copy?.mood ?? template.mood}</p>
            {/* Образец открывается для любого шаблона: маршрут
                /templates/[id] собирает его из самого шаблона, и список
                исключений здесь означал бы только одно — про новый
                шаблон забыли. */}
            <a href={`/templates/${template.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 text-center text-xs text-stone-700 underline underline-offset-4">
              {t("Посмотреть макет и анимации ↗", "See the full design and animations ↗")}
            </a>

          </form>
        );
      })}
    </div>
    </>
  );
}
