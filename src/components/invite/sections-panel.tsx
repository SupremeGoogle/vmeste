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

export type ComponentItem = { blockId: string; key: string; label: string; removed: boolean };

type IconName = "up" | "down" | "eye" | "hidden" | "copy" | "trash" | "layers" | "chevron";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    up: "m5 12 5-5 5 5M10 7v10", down: "m5 8 5 5 5-5M10 3v10",
    eye: "M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5ZM12 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    hidden: "m3 3 14 14M8 5.3A9 9 0 0 1 10 5c5 0 8 5 8 5a14 14 0 0 1-3 3M5 6.4A15 15 0 0 0 2 10s3 5 8 5a9 9 0 0 0 3-.5",
    copy: "M7 7h10v10H7zM3 13V3h10", trash: "M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12M8 8v6M12 8v6",
    layers: "m10 3 8 4-8 4-8-4 8-4ZM2 10l8 4 8-4M2 13l8 4 8-4", chevron: "m7 5 5 5-5 5",
  };
  return <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={paths[name]} /></svg>;
}

export function SectionsPanel({
  sections, components, busy, onScrollTo, onToggle, onMove, onDuplicate, onDelete, onInsertAfter, onComponentAction, onScrollToComponent,
}: {
  sections: SectionItem[];
  components: ComponentItem[];
  busy: boolean;
  onScrollTo: (id: string) => void;
  onToggle: (id: string, visible: boolean) => void;
  onMove: (id: string, index: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (item: SectionItem) => void;
  onInsertAfter: (id: string | null) => void;
  onComponentAction: (blockId: string, key: string, action: "remove" | "restore") => void;
  onScrollToComponent: (blockId: string, key: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const controlClass = "flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-200 disabled:cursor-default disabled:opacity-25";
  const insertLine = (afterId: string | null) => (
    <button type="button" onClick={() => onInsertAfter(afterId)} disabled={busy}
      className="group/insert flex h-5 w-full items-center gap-2 px-3 disabled:opacity-30" aria-label="Добавить раздел сюда">
      <span className="h-px flex-1 bg-white/5 transition-colors group-hover/insert:bg-amber-200/40" />
      <span className="text-[11px] text-white/35 transition-colors group-hover/insert:text-amber-200">+</span>
      <span className="h-px flex-1 bg-white/5 transition-colors group-hover/insert:bg-amber-200/40" />
    </button>
  );
  const componentList = (id: string) => (
    <ul className="space-y-1 border-t border-white/10 px-2 py-2" aria-label="Элементы раздела">
      {components.filter(component => component.blockId === id).map(component => (
        <li key={component.key} className="flex items-center gap-1 rounded-lg bg-black/10 pl-2">
          <button type="button" disabled={component.removed} onClick={() => onScrollToComponent(id, component.key)} title={component.label}
            className={`min-w-0 flex-1 py-2 text-left text-[11px] leading-snug ${component.removed ? "text-white/35 line-through" : "text-white/70 hover:text-amber-100"}`}>
            <span className="block truncate">{component.label}</span>
          </button>
          <button type="button" disabled={busy} onClick={() => onComponentAction(id, component.key, component.removed ? "restore" : "remove")}
            title={component.removed ? "Вернуть элемент" : "Удалить элемент"} aria-label={`${component.removed ? "Вернуть" : "Удалить"}: ${component.label}`}
            className={component.removed ? "shrink-0 rounded-lg px-2 py-2 text-[11px] text-amber-200 hover:bg-white/5 disabled:opacity-30" : `${controlClass} shrink-0 hover:text-red-200`}>
            {component.removed ? "Вернуть" : <Icon name="trash" />}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold tracking-tight">Разделы приглашения</p>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60">{sections.filter(item => item.visible).length} / {sections.length}</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">Перетаскивайте разделы. Раскройте «Элементы», чтобы убрать отдельную кнопку, текст или фото.</p>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {insertLine(null)}
        {sections.map((item, index) => {
          const children = components.filter(component => component.blockId === item.id);
          const removedCount = children.filter(component => component.removed).length;
          return <li key={item.id}>
            <div onDragOver={event => { if (dragging) { event.preventDefault(); setOver(index); } }}
              onDrop={event => { event.preventDefault(); if (dragging && dragging !== item.id) onMove(dragging, index); setDragging(null); setOver(null); }}
              className={`overflow-hidden rounded-xl border transition-colors ${over === index && dragging !== item.id ? "border-amber-200/70 bg-amber-200/10" : selected === item.id ? "border-amber-200/35 bg-amber-200/[0.06]" : "border-white/[0.09] bg-white/[0.025] hover:border-white/20"} ${dragging === item.id ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-2 px-2.5 pt-3 pb-2">
                <span draggable={!busy} onDragStart={event => { setDragging(item.id); event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragging(null); setOver(null); }} title="Перетащить раздел" className="cursor-grab px-1 text-white/30 active:cursor-grabbing select-none">⠿</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[10px] tabular-nums text-white/45">{String(index + 1).padStart(2, "0")}</span>
                <button type="button" onClick={() => { setSelected(item.id); onScrollTo(item.id); }} className="min-w-0 flex-1 text-left" title="Показать раздел на странице">
                  <span className={`block truncate text-[13px] font-medium ${item.visible ? "text-white/90" : "text-white/40"}`}>{item.hint || item.label}</span>
                  <span className="mt-0.5 block text-[10px] text-white/40">{item.label}{!item.visible ? " · скрыт" : ""}</span>
                </button>
                <button type="button" disabled={busy || (item.permanent && item.visible)} onClick={() => onToggle(item.id, !item.visible)} className={controlClass}
                  title={item.permanent ? "Обложку нельзя скрыть" : item.visible ? "Скрыть раздел" : "Показать раздел"} aria-label={item.visible ? "Скрыть раздел" : "Показать раздел"}>
                  <Icon name={item.visible ? "eye" : "hidden"} />
                </button>
              </div>
              <div className="flex items-center gap-1 px-2 pb-2">
                <button type="button" disabled={!children.length} onClick={() => toggleExpanded(item.id)} aria-expanded={expanded.has(item.id)}
                  className="mr-auto flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-white/55 hover:bg-white/5 hover:text-amber-100 disabled:opacity-30">
                  <Icon name="layers" /><span>Элементы{children.length ? ` · ${children.length}` : ""}</span>
                  {removedCount > 0 && <span className="text-amber-200/70">−{removedCount}</span>}
                </button>
                <button type="button" disabled={busy || index === 0} onClick={() => onMove(item.id, index - 1)} className={controlClass} title="Поднять раздел" aria-label="Поднять раздел"><Icon name="up" /></button>
                <button type="button" disabled={busy || index === sections.length - 1} onClick={() => onMove(item.id, index + 1)} className={controlClass} title="Опустить раздел" aria-label="Опустить раздел"><Icon name="down" /></button>
                <button type="button" disabled={busy || item.single} onClick={() => onDuplicate(item.id)} className={controlClass} title="Копия раздела" aria-label="Копия раздела"><Icon name="copy" /></button>
                <button type="button" disabled={busy || item.permanent} onClick={() => onDelete(item)} className={`${controlClass} hover:text-red-200`} title="Удалить раздел" aria-label="Удалить раздел"><Icon name="trash" /></button>
              </div>
              {expanded.has(item.id) && componentList(item.id)}
            </div>
            {insertLine(item.id)}
          </li>;
        })}
        {components.some(component => component.blockId === "__template") && <li className="mt-2 overflow-hidden rounded-xl border border-white/10">
          <button type="button" onClick={() => toggleExpanded("__template")} aria-expanded={expanded.has("__template")} className="flex w-full items-center gap-2 p-3 text-left text-xs text-white/60"><Icon name="layers" />Декор шаблона</button>
          {expanded.has("__template") && componentList("__template")}
        </li>}
      </ol>
      <div className="border-t border-white/10 p-3">
        <button type="button" disabled={busy} onClick={() => onInsertAfter(sections.at(-1)?.id ?? null)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#ead8b9] px-3 py-2 text-xs font-semibold text-stone-900 transition-colors hover:bg-[#f5e5ca] disabled:opacity-50"><span className="text-lg font-normal">+</span>Добавить раздел</button>
      </div>
    </div>
  );
}
