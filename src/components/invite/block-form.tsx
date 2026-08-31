/**
 * Поля конструктора для одного блока. Серверный компонент: обычные input
 * внутри общей формы страницы, состояние держит браузер.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { timelineToText } from "@/server/services/invite-forms";
import { ImagePicker, type PickerAsset } from "@/components/invite/image-picker";

const inputClass = "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm";

function Field({
  label, name, value, hint, placeholder, multiline, rows = 3,
}: {
  label: string;
  name: string;
  value: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-stone-500">{label}</span>
      {multiline ? (
        <textarea name={name} rows={rows} defaultValue={value} placeholder={placeholder} className={inputClass} />
      ) : (
        <input name={name} defaultValue={value} placeholder={placeholder} className={inputClass} />
      )}
      {hint ? <span className="mt-1 block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

export function BlockFields({
  block, eventId, assets,
}: {
  block: InviteBlockView;
  eventId: string;
  /** Уже загруженные картинки мероприятия — из них выбирают обложку. */
  assets: PickerAsset[];
}) {
  switch (block.type) {
    case "COUNTDOWN": {
      const c = block.content as BlockContentMap["COUNTDOWN"];
      return (
        <>
          <Field label="Заголовок" name="title" value={c.title} />
          <Field
            label="Текст в день свадьбы" name="doneText" value={c.doneText}
            hint="Появится вместо чисел, когда день наступит. Дата берётся из настроек мероприятия."
          />
        </>
      );
    }
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      return (
        <>
          <Field label="Имена" name="names" value={c.names} placeholder="Анна и Пётр" />
          <Field label="Заголовок" name="title" value={c.title} />
          <Field label="Дата словами" name="dateText" value={c.dateText} placeholder="12 сентября 2026" />
          <Field label="Подпись" name="subtitle" value={c.subtitle} multiline />
          <div>
            <span className="text-xs text-stone-500">Фотография на обложке</span>
            <div className="mt-2">
              <ImagePicker eventId={eventId} name="imageUrl" value={c.imageUrl} assets={assets} />
            </div>
            <span className="mt-2 block text-xs text-stone-400">
              Загрузите свой снимок или выберите из уже загруженных. Как
              именно он ляжет — во всю ширину или в рамке — задаётся в
              «Оформлении» выше.
            </span>
          </div>
        </>
      );
    }
    case "TIMELINE": {
      const c = block.content as BlockContentMap["TIMELINE"];
      return (
        <>
          <Field label="Заголовок" name="title" value={c.title} />
          <Field
            label="Пункты" name="items" value={timelineToText(c.items)} multiline rows={6}
            placeholder={"16:00 | Сбор гостей | у входа\n17:00 | Церемония"}
            hint="Строка на пункт: время | что происходит | уточнение."
          />
        </>
      );
    }
    case "VENUE": {
      const c = block.content as BlockContentMap["VENUE"];
      return (
        <>
          <Field label="Заголовок" name="title" value={c.title} />
          <Field label="Название площадки" name="name" value={c.name} />
          <Field label="Адрес" name="address" value={c.address} multiline rows={2} />
          <Field label="Как найти" name="note" value={c.note} multiline />
        </>
      );
    }
    case "DRESSCODE": {
      const c = block.content as BlockContentMap["DRESSCODE"];
      return (
        <>
          <Field label="Заголовок" name="title" value={c.title} />
          <Field label="Текст" name="text" value={c.text} multiline />
          <Field
            label="Палитра" name="palette" value={c.palette.join(", ")}
            placeholder="#c8b7a6, #6b705c" hint="Цвета через запятую, до восьми."
          />
        </>
      );
    }
    case "MAP": {
      const c = block.content as BlockContentMap["MAP"];
      return (
        <>
          <Field label="Заголовок" name="title" value={c.title} />
          <Field label="Ссылка на Яндекс Карты" name="yandexUrl" value={c.yandexUrl} />
          <Field label="Ссылка на Google Maps" name="googleUrl" value={c.googleUrl} />
          <Field label="Комментарий" name="note" value={c.note} multiline rows={2} />
        </>
      );
    }
    case "TEXT": {
      const c = block.content as BlockContentMap["TEXT"];
      return (
        <>
          <Field label="Заголовок (необязательно)" name="title" value={c.title} />
          <Field label="Текст" name="text" value={c.text} multiline rows={5} />
        </>
      );
    }
    case "RSVP_FORM": {
      const c = block.content as BlockContentMap["RSVP_FORM"];
      return (
        <>
          <Field label="Заголовок" name="title" value={c.title} />
          <Field label="Текст" name="text" value={c.text} multiline rows={2} />
          <Field label="Надпись на кнопке" name="buttonLabel" value={c.buttonLabel} />
        </>
      );
    }
  }
}
