/**
 * Поля конструктора для одного блока. Серверный компонент: обычные input
 * внутри общей формы страницы, состояние держит браузер.
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";
import { timelineToText } from "@/server/services/invite-forms";

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

export function BlockFields({ block }: { block: InviteBlockView }) {
  switch (block.type) {
    case "COVER": {
      const c = block.content as BlockContentMap["COVER"];
      return (
        <>
          <Field label="Имена" name="names" value={c.names} placeholder="Анна и Пётр" />
          <Field label="Заголовок" name="title" value={c.title} />
          <Field label="Дата словами" name="dateText" value={c.dateText} placeholder="12 сентября 2026" />
          <Field label="Подпись" name="subtitle" value={c.subtitle} multiline />
          <Field
            label="Ссылка на фотографию" name="imageUrl" value={c.imageUrl}
            hint="Пока только внешняя ссылка: загрузка файлов появится вместе с фотогалереей."
          />
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
