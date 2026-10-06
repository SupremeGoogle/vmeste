/**
 * Шаблон на витрине — в том же корпусе iPhone, что и приглашение на обзоре
 * мероприятия (`IphoneFrame`). Внутри — снимок первого экрана образца
 * /templates/[id] (scripts/template-previews.mjs): 23 живых фрейма грузили
 * бы 23 приглашения разом, и на телефоне витрина открывалась десятки секунд.
 * Живой образец с анимациями — по ссылке «Посмотреть макет» под телефоном.
 * Снимка нет (новый шаблон) — показываем живой фрейм, как раньше.
 *
 * Сам телефон — кнопка выбора шаблона: нажатие отправляет форму, и
 * организатор сразу попадает в редактор. Фрейм касаний не принимает —
 * колесо мыши над ним прокручивало бы образец вместо списка.
 */
import { IphoneFrame } from "@/components/invite/iphone-frame";
import PREVIEWS from "@/lib/template-previews.json";

const BARS: Record<string, string> = PREVIEWS;

export function PhonePreview({ templateId, name, current }: { templateId: string; name: string; current: boolean }) {
  return (
    <div className="group relative mx-auto w-fit pt-2">
      {current && (
        <span className="absolute -left-2 top-8 z-40 rounded-sm bg-[#141416] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white">
          Выбран
        </span>
      )}
      <div className={`transition-transform duration-300 group-hover:-translate-y-1 ${current ? "rounded-[2.9rem] ring-2 ring-stone-900 ring-offset-4" : ""}`}>
        <IphoneFrame
          src={`/templates/${templateId}`}
          image={BARS[templateId] ? { src: `/media/template-previews/${templateId}.webp`, bar: BARS[templateId] } : undefined}
          title={`Образец «${name}»`}
          width={214}
        />
      </div>

      {/* Кнопка поверх всего телефона: фрейм внутри <button> держать нельзя. */}
      <button
        type="submit"
        aria-label={`Выбрать шаблон «${name}» и открыть редактор`}
        className="absolute inset-x-0 bottom-0 top-2 z-30 cursor-pointer rounded-[2.9rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900"
      />
    </div>
  );
}
