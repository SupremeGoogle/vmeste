"use client";

/**
 * Список разделов приглашения — левая панель редактора, как в конструкторах
 * сайтов (docs/template-standard.md, §12).
 *
 * Здесь видно всё приглашение целиком, включая скрытые разделы: их можно
 * вернуть «глазом», не вспоминая, что было спрятано. Порядок меняется
 * перетаскиванием (или стрелками — с клавиатуры и на телефоне), щелчок по
 * строке прокручивает страницу к разделу. «+» между строками вставляет
 * новый раздел ровно в это место.
 */
import { useState } from "react";

export type SectionItem = {
  id: string; type: string; label: string; hint: string; visible: boolean;
  /** Бывает только один — копии нет. */
  single?: boolean;
  /** Нельзя убрать — только изменить (обложка). */
  permanent?: boolean;
};
export type BlockTypeOption = { type: string; label: string };

/** Что делает каждый тип раздела — подпись в меню «Добавить раздел». */
const TYPE_HINTS: Record<string, string> = {
  COVER: "Имена, дата и фото на первом экране",
  PHOTOS: "До четырёх снимков с подписями",
  CALENDAR: "Месяц с отмеченным днём свадьбы",
  COUNTDOWN: "Дни, часы и минуты до праздника",
  TIMELINE: "Программа дня по времени",
  VENUE: "Площадка, адрес и карта",
  MAP: "Как добраться и ссылки на карты",
  DRESSCODE: "Палитра и пожелания к нарядам",
  TEXT: "Заголовок и свой текст",
  WISHLIST: "Кнопка со списком подарков",
  RSVP_FORM: "Анкета: придёт ли гость",
};

export function TypePicker({
  types, onPick, onClose, title = "Добавить раздел",
}: {
  types: BlockTypeOption[];
  onPick: (type: string) => void;
  onClose: () => void;
  title?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-2xl text-stone-900">{title}</p>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100" aria-label="Закрыть">✕</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {types.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => onPick(option.type)}
              className="rounded-xl border border-stone-200 p-3 text-left transition-colors hover:border-stone-400 hover:bg-stone-50"
            >
              <span className="block text-sm font-medium text-stone-900">{option.label}</span>
              <span className="mt-0.5 block text-xs text-stone-500">{TYPE_HINTS[option.type] ?? ""}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SectionsPanel({
  sections, busy, onScrollTo, onToggle, onMove, onDuplicate, onDelete, onInsertAfter,
}: {
  sections: SectionItem[];
  busy: boolean;
  onScrollTo: (id: string) => void;
  onToggle: (id: string, visible: boolean) => void;
  onMove: (id: string, index: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (item: SectionItem) => void;
  /** `null` — вставить в самое начало. */
  onInsertAfter: (id: string | null) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const insertLine = (afterId: string | null, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => onInsertAfter(afterId)}
      disabled={busy}
      className="group/insert relative my-0.5 flex h-3 w-full items-center justify-center"
      aria-label="Добавить раздел сюда"
    >
      <span className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-transparent transition-colors group-hover/insert:bg-amber-300" />
      <span className="relative rounded-full bg-amber-200 px-2 text-[10px] leading-4 font-semibold text-stone-900 opacity-0 transition-opacity group-hover/insert:opacity-100">+</span>
    </button>
  );

  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <p className="text-sm font-medium">Разделы</p>
        <span className="text-xs text-white/50">{sections.filter((item) => item.visible).length} из {sections.length}</span>
      </div>
      <p className="px-3 pb-2 text-[11px] leading-snug text-white/50">Перетащите, чтобы поменять порядок. «+» между разделами — новый раздел в это место.</p>
      <ol className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {insertLine(null, "top")}
        {sections.map((item, index) => (
          <li key={item.id}>
            <div
              draggable={!busy}
              onDragStart={(event) => { setDragging(item.id); event.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              onDragOver={(event) => { if (dragging) { event.preventDefault(); setOver(index); } }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging && dragging !== item.id) onMove(dragging, index);
                setDragging(null);
                setOver(null);
              }}
              className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
                over === index && dragging !== item.id ? "border-amber-300 bg-white/10" : "border-transparent hover:bg-white/5"
              } ${dragging === item.id ? "opacity-40" : ""} ${item.visible ? "" : "opacity-60"}`}
            >
              <span aria-hidden className="cursor-grab px-0.5 text-white/40 select-none">⋮⋮</span>
              <button type="button" onClick={() => onScrollTo(item.id)} className="min-w-0 flex-1 text-left" title="Показать раздел на странице">
                <span className={`block truncate text-[13px] ${item.visible ? "text-white" : "text-white/60 line-through decoration-white/30"}`}>{item.label}</span>
                {item.hint && <span className="block truncate text-[11px] text-white/45">{item.hint}</span>}
              </button>
              <div className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
                <button type="button" disabled={busy || index === 0} onClick={() => onMove(item.id, index - 1)} className="rounded px-1 text-xs hover:bg-white/10 disabled:opacity-30" title="Выше">↑</button>
                <button type="button" disabled={busy || index === sections.length - 1} onClick={() => onMove(item.id, index + 1)} className="rounded px-1 text-xs hover:bg-white/10 disabled:opacity-30" title="Ниже">↓</button>
                <button type="button" disabled={busy || (item.permanent && item.visible)} onClick={() => onToggle(item.id, !item.visible)} className="rounded px-1 text-xs hover:bg-white/10 disabled:opacity-30" title={item.permanent ? "Обложку нельзя скрыть" : item.visible ? "Скрыть раздел" : "Показать раздел"}>
                  {item.visible ? "👁" : "◌"}
                </button>
                <button type="button" disabled={busy || item.single} onClick={() => onDuplicate(item.id)} className="rounded px-1 text-xs hover:bg-white/10 disabled:opacity-30" title={item.single ? "Этот раздел может быть только один" : "Копия раздела"}>⧉</button>
                <button type="button" disabled={busy || item.permanent} onClick={() => onDelete(item)} className="rounded px-1 text-xs text-red-200 hover:bg-white/10 disabled:opacity-30" title={item.permanent ? "Обложку нельзя удалить" : "Удалить раздел"}>✕</button>
              </div>
            </div>
            {insertLine(item.id, `after-${item.id}`)}
          </li>
        ))}
      </ol>
      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onInsertAfter(sections.at(-1)?.id ?? null)}
          className="w-full rounded-lg bg-amber-200 px-3 py-2 text-xs font-medium text-stone-900 disabled:opacity-50"
        >
          + Добавить раздел
        </button>
      </div>
    </div>
  );
}
