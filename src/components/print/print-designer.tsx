"use client";
/* eslint-disable @next/next/no-img-element -- Decorative print artwork and the QR data URL need exact canvas sizing. */

/**
 * Конструктор печатного листа: план рассадки или табличка с QR.
 *
 * Лист рисуется в тех же единицах, что и PDF (проценты листа и кегли «для
 * A3»), поэтому на экране видно ровно то, что уйдёт в печать. Раскладку
 * столов считает `layoutTables` — одна функция и здесь, и в PDF.
 *
 * Управление:
 *   — перетаскивание элемента мышью или пальцем, уголок справа снизу меняет
 *     ширину (и высоту карточки стола);
 *   — стрелки двигают выбранный элемент (с Shift — крупнее шаг), «+» и «−»
 *     меняют его кегль, Esc снимает выделение;
 *   — масштаб листа: кнопки, Ctrl + колесо или щипок трекпада — лист
 *     приближается к курсору, а не к левому верхнему углу.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import {
  guestFontSize, isSoloPrintTable, pageScale, paperSize, PRINT_TEMPLATES, defaultPrintDesign, relayoutTables,
  type PrintDesign, type PrintElement, type PrintMode, type PrintTable, type PrintTemplateId,
} from "@/lib/print-design";
import { useT } from "@/components/i18n-provider";
import type { Lang } from "@/lib/i18n";
import "./print-designer.css";

type Props = {
  eventId: string; mode: PrintMode; initial: PrintDesign;
  title: string; date: string; tables: PrintTable[]; qrData: string; shortCode: string;
  /** Язык мероприятия: на нём подписи, которые уходят в печать. Интерфейс — на языке кабинета. */
  lang?: Lang;
};
type Drag = { id: string; kind: "move" | "resize"; x: number; y: number; start: PrintElement };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 10) / 10;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

export function PrintDesigner({ eventId, mode, initial, title, date, tables, qrData, shortCode, lang = "ru" }: Props) {
  const t = useT();
  /** Текст для листа — на языке мероприятия. */
  const pl = (ru: string, en: string) => (lang === "en" ? en : ru);
  const [design, setDesign] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  // Размеры рабочей области меряются в браузере; до этого — разумные
  // значения, одинаковые на сервере и клиенте, чтобы разметка совпала.
  const [frameWidth, setFrameWidth] = useState(720);
  const [viewportHeight, setViewportHeight] = useState(1000);
  const [state, setState] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const zoomAnchor = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null);

  const theme = PRINT_TEMPLATES.find((item) => item.id === design.template) ?? PRINT_TEMPLATES[0];
  const element = design.elements.find((item) => item.id === selected) ?? null;
  const pageCount = Math.max(1, ...design.elements.map((item) => item.page + 1));
  const sheet = paperSize(design.paper, design.orientation);
  // Лист «по размеру окна»: по ширине рабочей области, но не выше 78% экрана.
  const fitWidth = Math.min(frameWidth - 24, 900, viewportHeight * 0.78 * sheet.w / sheet.h);
  const canvasWidth = Math.max(200, fitWidth) * zoom;
  const px = canvasWidth / sheet.w;                     // экранных пикселей на пункт
  const pt = (size: number) => size * pageScale(design.paper) * px;   // кегль «для A3» → пиксели
  const pageElements = design.elements.filter((item) => item.page === page || page > 0 && item.kind === "text" && item.page === 0 && ["eyebrow", "title", "date"].includes(item.id));
  const guestCount = tables.reduce((sum, table) => sum + table.guests.length, 0);

  function patch(updater: (prev: PrintDesign) => PrintDesign) {
    setDesign(updater);
    setState(t("Есть несохранённые изменения", "You have unsaved changes"));
  }
  const update = useCallback((id: string, changes: Partial<PrintElement>) => {
    setDesign((prev) => ({ ...prev, elements: prev.elements.map((item) => item.id === id ? { ...item, ...changes } : item) }));
    setState(t("Есть несохранённые изменения", "You have unsaved changes"));
  }, [t]);

  function chooseTemplate(id: PrintTemplateId) {
    const fresh = defaultPrintDesign(mode, id, title, date, tables, lang);
    patch((prev) => {
      const prior = new Map(prev.elements.map((item) => [item.id, item]));
      const core = fresh.elements.map((item) => {
        const old = prior.get(item.id);
        return old ? { ...item, text: old.text, hidden: old.hidden, align: old.align } : item;
      });
      const custom = prev.elements.filter((item) => item.kind === "text" && !fresh.elements.some((base) => base.id === item.id));
      return { ...fresh, textScale: prev.textScale, guestScale: prev.guestScale, elements: [...core, ...custom] };
    });
    setPage(0); setSelected(null);
  }
  function setSheet(changes: Partial<Pick<PrintDesign, "paper" | "orientation">>) {
    // Формат сменился — столы, которые не двигали руками, раскладываются заново.
    patch((prev) => relayoutTables({ ...prev, ...changes }));
  }
  function regrid() {
    patch((prev) => relayoutTables({ ...prev, elements: prev.elements.map((item) => item.kind === "table" ? { ...item, auto: true, page: 0 } : item) }));
    setPage(0);
  }
  function scaleText(key: "textScale" | "guestScale", delta: number) {
    patch((prev) => ({ ...prev, [key]: round(clamp(prev[key] + delta, 0.5, 2.5)) }));
  }

  // ── Масштаб ────────────────────────────────────────────────────────
  const zoomTo = useCallback((next: number, clientX?: number, clientY?: number) => {
    const box = scroller.current;
    const value = round(clamp(next, ZOOM_MIN, ZOOM_MAX) * 10) / 10;
    if (box) {
      const rect = box.getBoundingClientRect();
      const x = clientX === undefined ? rect.width / 2 : clientX - rect.left;
      const y = clientY === undefined ? rect.height / 2 : clientY - rect.top;
      // Запоминаем точку листа под курсором, чтобы после перерисовки она
      // осталась под курсором.
      zoomAnchor.current = { fx: (box.scrollLeft + x) / box.scrollWidth, fy: (box.scrollTop + y) / box.scrollHeight, px: x, py: y };
    }
    setZoom(value);
  }, []);

  useLayoutEffect(() => {
    const box = scroller.current;
    const anchor = zoomAnchor.current;
    if (!box || !anchor) return;
    box.scrollLeft = anchor.fx * box.scrollWidth - anchor.px;
    box.scrollTop = anchor.fy * box.scrollHeight - anchor.py;
    zoomAnchor.current = null;
  }, [zoom]);

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setFrameWidth(entry.contentRect.width);
      setViewportHeight(window.innerHeight);
    });
    observer.observe(box);
    function wheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => {
        const next = clamp(current * Math.exp(-event.deltaY * 0.0022), ZOOM_MIN, ZOOM_MAX);
        const rect = box!.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        zoomAnchor.current = { fx: (box!.scrollLeft + x) / box!.scrollWidth, fy: (box!.scrollTop + y) / box!.scrollHeight, px: x, py: y };
        return next;
      });
    }
    box.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); box.removeEventListener("wheel", wheel); };
  }, []);

  // ── Клавиатура ─────────────────────────────────────────────────────
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      if (!element || event.ctrlKey || event.metaKey || event.altKey) return;
      const step = event.shiftKey ? 2 : 0.5;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[event.key]) {
        event.preventDefault();
        const [dx, dy] = moves[event.key];
        update(element.id, { x: round(clamp(element.x + dx, 0, 100 - element.w)), y: round(clamp(element.y + dy, 0, 98)), auto: false });
      } else if (event.key === "+" || event.key === "=") {
        update(element.id, { fontSize: clamp(element.fontSize + 1, 6, 110) });
      } else if (event.key === "-") {
        update(element.id, { fontSize: clamp(element.fontSize - 1, 6, 110) });
      } else if (event.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [element, update]);

  // ── Перетаскивание и изменение размера ─────────────────────────────
  function pointerDown(event: PointerEvent<HTMLDivElement>, item: PrintElement, kind: Drag["kind"] = "move") {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(item.id);
    drag.current = { id: item.id, kind, x: event.clientX, y: event.clientY, start: item };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const rect = canvas.current?.getBoundingClientRect();
    if (!current || !rect) return;
    const dx = (event.clientX - current.x) / rect.width * 100;
    const dy = (event.clientY - current.y) / rect.height * 100;
    const s = current.start;
    if (current.kind === "move") {
      update(current.id, { x: round(clamp(s.x + dx, 0, 100 - s.w)), y: round(clamp(s.y + dy, 0, 98)), auto: false });
    } else {
      update(current.id, {
        w: round(clamp(s.w + dx, 4, 100 - s.x)),
        ...(s.kind === "table" ? { h: round(clamp((s.h ?? 19) + dy, 3, 100 - s.y)) } : {}),
        auto: false,
      });
    }
  }
  function pointerUp() { drag.current = null; }

  async function save() {
    setState(t("Сохраняем…", "Saving…"));
    try {
      const res = await fetch(`/api/app/events/${eventId}/print-design`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(design) });
      if (!res.ok) throw new Error("Не удалось сохранить макет");
      setState(t("Макет сохранён", "Layout saved"));
    } catch { setState(t("Не удалось сохранить. Попробуйте ещё раз.", "Couldn't save. Please try again.")); }
  }
  async function download() {
    setState(t("Готовим PDF…", "Preparing PDF…"));
    try {
      const res = await fetch(`/api/app/events/${eventId}/print-design/pdf`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(design) });
      if (!res.ok) throw new Error("PDF не готов");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = mode === "seating" ? t("план-рассадки.pdf", "seating-chart.pdf") : t("qr-код.pdf", "qr-code.pdf");
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setState(t("PDF скачан", "PDF downloaded"));
    } catch { setState(t("Не удалось создать PDF. Попробуйте ещё раз.", "Couldn't create the PDF. Please try again.")); }
  }

  /** Карточка, у которой текст не влез, подсвечивается — видно, что надо ужать. */
  const markOverflow = (node: HTMLDivElement | null) => {
    if (!node) return;
    requestAnimationFrame(() => {
      node.dataset.overflow = node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2 ? "true" : "false";
    });
  };

  return <div className="print-editor">
    <div className="print-editor-top">
      <div>
        <h2>{mode === "seating" ? t("План рассадки для печати", "Printable seating chart") : t("QR-код для печати", "Printable QR code")}</h2>
        <p>{mode === "seating"
          ? t(
            `Столов: ${tables.length}, гостей: ${guestCount}. Стол молодожёнов на план не выводится. Перетаскивайте элементы, приближайте лист колесом с Ctrl.`,
            `Tables: ${tables.length}, guests: ${guestCount}. The couple's table isn't shown on the chart. Drag elements around; Ctrl + scroll to zoom.`,
          )
          : t("Выберите стиль и перетащите элементы на листе.", "Pick a style and drag the elements on the sheet.")}</p>
      </div>
      <div className="print-editor-actions"><button type="button" onClick={save}>{t("Сохранить макет", "Save layout")}</button><button type="button" className="primary" onClick={download}>{t("Скачать PDF", "Download PDF")}</button></div>
    </div>
    <p className="print-editor-state" role="status">{state}</p>
    <div className="print-editor-templates" aria-label={t("Шаблоны оформления", "Design templates")}>
      {PRINT_TEMPLATES.map((item) => <button key={item.id} type="button" className={design.template === item.id ? "active" : ""} onClick={() => chooseTemplate(item.id)} aria-pressed={design.template === item.id}>
        <span className={`print-template-thumb print-theme-${item.id}`} style={{ color: item.ink, background: item.paper }}>
          {mode === "qr" ? <img className="print-qr-thumb-art" src={`/media/print-design/${item.qrArt}.webp`} alt="" /> : item.art !== "none" ? <img src={`/media/print-design/${item.art}.webp`} alt="" /> : <span className="print-thumb-mark">✦</span>}
          <i style={{ color: item.accent }}>A &amp; M</i>
          {mode === "seating" ? <span className={`print-thumb-structure structure-${item.layout}`} style={{ color: item.accent }}>{Array.from({ length: item.layout === "single" ? 1 : item.layout === "cards" ? 5 : item.layout === "orbit" ? 6 : item.layout === "grid4" ? 8 : item.layout === "grid2" || item.layout === "wide" ? 6 : 9 }, (_, i) => <b key={i} />)}</span> : <img className="print-thumb-qr" src={qrData} alt="" />}
        </span><span>{mode === "qr" ? t(item.qrName, item.qrNameEn) : t(item.name, item.nameEn)}</span>
      </button>)}
    </div>
    <div className="print-editor-workspace">
      <div className="print-editor-main">
        <div className="print-editor-toolbar">
          <label>{t("Формат", "Size")} <select value={design.paper} onChange={(e) => setSheet({ paper: e.target.value as PrintDesign["paper"] })}><option>A2</option><option>A3</option><option>A4</option></select></label>
          <label>{t("Ориентация", "Orientation")} <select value={design.orientation} onChange={(e) => setSheet({ orientation: e.target.value as PrintDesign["orientation"] })}><option value="portrait">{t("Вертикально", "Portrait")}</option><option value="landscape">{t("Горизонтально", "Landscape")}</option></select></label>
          {pageCount > 1 ? <label>{t("Лист", "Page")} <select value={page} onChange={(e) => { setPage(Number(e.target.value)); setSelected(null); }}>{Array.from({ length: pageCount }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label> : null}
          <label>{t("Акцент", "Accent")} <input type="color" value={design.accent} onChange={(e) => patch((prev) => ({ ...prev, accent: e.target.value }))} /></label>
          <label>{t("Текст", "Text")} <input type="color" value={design.ink} onChange={(e) => patch((prev) => ({ ...prev, ink: e.target.value }))} /></label>
          <button type="button" onClick={() => { const id = `text:${Date.now()}`; const item: PrintElement = { id, kind: "text", text: pl("Ваш текст", "Your text"), x: 24, y: 50, w: 52, fontSize: 22, align: "center", hidden: false, page, auto: false }; patch((prev) => ({ ...prev, elements: [...prev.elements, item] })); setSelected(id); }}>{t("+ Надпись", "+ Text")}</button>
          {mode === "seating" ? <button type="button" onClick={regrid} title={t("Вернуть все столы в ровную сетку на первом листе", "Put all tables back in a neat grid on the first page")}>{t("Разложить столы", "Arrange tables")}</button> : null}
          <button type="button" onClick={() => { if (!confirm(t("Вернуть расположение элементов по умолчанию?", "Reset all elements to the default layout?"))) return; setDesign(defaultPrintDesign(mode, design.template, title, date, tables, lang)); setSelected(null); setPage(0); setState(t("Расположение сброшено", "Layout reset")); }}>{t("Сбросить", "Reset")}</button>
        </div>
        <div className="print-editor-toolbar print-editor-sizes">
          <span className="print-stepper" aria-label={t("Размер всего текста", "Size of all text")}>
            <span>{t("Весь текст", "All text")}</span>
            <button type="button" onClick={() => scaleText("textScale", -0.1)} aria-label={t("Уменьшить весь текст", "Make all text smaller")}>A−</button>
            <b>{Math.round(design.textScale * 100)}%</b>
            <button type="button" onClick={() => scaleText("textScale", 0.1)} aria-label={t("Увеличить весь текст", "Make all text larger")}>A+</button>
          </span>
          {mode === "seating" ? <span className="print-stepper" aria-label={t("Размер имён гостей", "Guest name size")}>
            <span>{t("Имена гостей", "Guest names")}</span>
            <button type="button" onClick={() => scaleText("guestScale", -0.1)} aria-label={t("Уменьшить имена", "Make names smaller")}>A−</button>
            <b>{Math.round(design.guestScale * 100)}%</b>
            <button type="button" onClick={() => scaleText("guestScale", 0.1)} aria-label={t("Увеличить имена", "Make names larger")}>A+</button>
          </span> : null}
          <span className="print-stepper" aria-label={t("Масштаб листа", "Sheet zoom")}>
            <span>{t("Масштаб", "Zoom")}</span>
            <button type="button" onClick={() => zoomTo(zoom / 1.25)} aria-label={t("Отдалить", "Zoom out")}>−</button>
            <button type="button" className="print-zoom-value" onClick={() => zoomTo(1)} title={t("Вернуть лист по размеру окна", "Fit the sheet to the window")}>{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => zoomTo(zoom * 1.25)} aria-label={t("Приблизить", "Zoom in")}>+</button>
          </span>
        </div>
        <div ref={scroller} className="print-canvas-scroll" onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div ref={canvas} className={`print-canvas print-theme-${design.template}`} style={{ width: canvasWidth, background: theme.paper, color: design.ink, aspectRatio: `${sheet.w} / ${sheet.h}` }} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            {mode === "qr" ? <img className="print-canvas-qr-art" src={`/media/print-design/${theme.qrArt}.webp`} alt="" /> : theme.art !== "none" ? <><img className="print-canvas-art top" src={`/media/print-design/${theme.art}.webp`} alt="" /><img className="print-canvas-art bottom" src={`/media/print-design/${theme.art}.webp`} alt="" /></> : null}
            {theme.frame !== "none" ? <div className={`print-canvas-frame frame-${theme.frame}`} style={{ borderColor: design.accent }} /> : null}
            {mode === "seating" && theme.layout === "orbit" && !design.elements.some((item) => item.page === page && item.kind === "table" && isSoloPrintTable(design, item)) ? <div className="print-orbit-center" style={{ borderColor: design.accent, color: design.accent, fontSize: pt(19) * design.textScale }}>{pl("СХЕМА", "FLOOR")}<br />{pl("ЗАЛА", "PLAN")}</div> : null}
            {pageElements.filter((item) => !item.hidden).map((item) => {
              const table = tables.find((entry) => entry.id === item.tableId);
              const solo = item.kind === "table" && isSoloPrintTable(design, item);
              const titleSize = pt(item.fontSize) * design.textScale;
              const guestsSize = item.kind === "table" ? pt(guestFontSize(design, item, table?.guests.length ?? 0, solo, Math.max(0, ...(table?.guests ?? []).map((name) => name.length)))) : 0;
              const isSelected = selected === item.id;
              return <div
                key={item.id}
                ref={item.kind === "table" ? markOverflow : undefined}
                className={`print-canvas-item ${isSelected ? "selected" : ""} kind-${item.kind} layout-${solo ? "single" : theme.layout}`}
                style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, ...(item.kind === "table" && item.h ? { height: `${item.h}%` } : {}), textAlign: item.align, color: item.id === "title" || item.kind === "table" ? design.accent : design.ink, borderColor: design.accent }}
                onPointerDown={(e) => pointerDown(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp} onLostPointerCapture={pointerUp}
              >
                {item.kind === "qr" ? <img className="print-canvas-qr" src={qrData} alt={t("QR-код входа на праздник", "QR code to open the celebration")} />
                  : item.kind === "code" ? <><small style={{ fontSize: pt(10) * design.textScale }}>{item.text}</small><strong style={{ fontSize: titleSize }}>{shortCode}</strong></>
                  : item.kind === "table" ? theme.layout === "orbit" && !solo ? <div className="print-orbit-table">
                    <strong style={{ fontSize: titleSize, color: design.accent, width: titleSize * 3.2, height: titleSize * 1.7 }}>{item.text || table?.label}</strong>
                    <div className="print-orbit-columns">
                      <span className="print-orbit-guests" style={{ fontSize: guestsSize, color: design.ink }}>{table?.guests.slice(0, Math.ceil(table.guests.length / 2)).join("\n") || ""}</span>
                      <span className="print-orbit-guests" style={{ fontSize: guestsSize, color: design.ink }}>{table?.guests.slice(Math.ceil(table.guests.length / 2)).join("\n") || ""}</span>
                    </div>
                  </div> : <><strong style={{ fontSize: titleSize, color: design.accent, fontFamily: ["minimal", "deco"].includes(design.template) ? "PrintSerif" : "PrintScript" }}>{item.text || table?.label}</strong><span className="print-table-guests" style={{ fontSize: guestsSize, color: design.ink }}>{table?.guests.join("\n") || pl("Пока нет гостей", "No guests yet")}</span></>
                  : <span style={{ fontSize: titleSize, fontFamily: item.id === "title" || item.fontSize >= 25 ? "PrintScript" : "PrintSerif" }}>{item.text}</span>}
                {isSelected ? <div className="print-resize-handle" title={t("Потяните, чтобы изменить размер", "Drag to resize")} onPointerDown={(e) => pointerDown(e, item, "resize")} onPointerMove={pointerMove} onPointerUp={pointerUp} onLostPointerCapture={pointerUp} /> : null}
              </div>;
            })}
          </div>
        </div>
        <p className="print-editor-hint">{t("Стрелки двигают выбранный элемент (с Shift быстрее), + и − меняют его размер, Ctrl + колесо приближает лист.", "Arrow keys move the selected element (faster with Shift), + and − change its size, Ctrl + scroll zooms the sheet.")}</p>
      </div>
      <aside className="print-editor-side">
        <h3>{t("Элементы листа", "Sheet elements")}</h3>
        <p>{t("Нажмите на элемент и перетащите его. Скрытые можно вернуть.", "Click an element and drag it. Hidden ones can be brought back.")}</p>
        <div className="print-element-list">{design.elements.filter((item) => item.page === page).map((item) => <button key={item.id} type="button" className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}><span>{item.kind === "table" ? item.text : item.kind === "qr" ? t("QR-код", "QR code") : item.kind === "code" ? t("Код входа", "Access code") : item.text || t("Надпись", "Text")}</span>{item.hidden ? <small>{t("скрыт", "hidden")}</small> : null}</button>)}</div>
        {element ? <div className="print-element-settings" key={element.id}>
          <h4>{element.kind === "table" ? t("Карточка стола", "Table card") : element.kind === "qr" ? t("QR-код", "QR code") : t("Надпись", "Text")}</h4>
          {element.kind !== "qr" ? <label>{t("Текст", "Text")} <textarea value={element.text} onChange={(e) => update(element.id, { text: e.target.value })} rows={element.kind === "table" ? 1 : 3} /></label> : <p>{t("QR-код ведёт на страницу входа гостей.", "The QR code opens the guest entry page.")}</p>}
          {element.kind !== "qr" ? <div className="print-field">
            <span>{element.kind === "table" ? t("Размер названия", "Name size") : t("Размер шрифта", "Font size")}</span>
            <div className="print-number">
              <button type="button" onClick={() => update(element.id, { fontSize: clamp(element.fontSize - 1, 6, 110) })} aria-label={t("Меньше", "Smaller")}>−</button>
              <input type="number" min={6} max={110} value={element.fontSize} onChange={(e) => update(element.id, { fontSize: clamp(Number(e.target.value) || 6, 6, 110) })} />
              <button type="button" onClick={() => update(element.id, { fontSize: clamp(element.fontSize + 1, 6, 110) })} aria-label={t("Больше", "Larger")}>+</button>
            </div>
          </div> : null}
          <label>{t("Ширина, %", "Width, %")} <input type="number" min={4} max={100} value={element.w} onChange={(e) => update(element.id, { w: clamp(Number(e.target.value) || 4, 4, 100), auto: false })} /></label>
          {element.kind === "table" ? <label>{t("Высота, %", "Height, %")} <input type="number" min={3} max={100} value={element.h ?? 19} onChange={(e) => update(element.id, { h: clamp(Number(e.target.value) || 3, 3, 100), auto: false })} /></label> : null}
          <label>{t("Выравнивание", "Alignment")} <select value={element.align} onChange={(e) => update(element.id, { align: e.target.value as PrintElement["align"] })}><option value="left">{t("Слева", "Left")}</option><option value="center">{t("По центру", "Center")}</option><option value="right">{t("Справа", "Right")}</option></select></label>
          {pageCount > 1 && element.kind === "table" ? <label>{t("Лист", "Page")} <select value={element.page} onChange={(e) => { update(element.id, { page: Number(e.target.value), auto: false }); setPage(Number(e.target.value)); }}><option value={0}>1</option>{Array.from({ length: pageCount - 1 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 2}</option>)}</select></label> : null}
          {element.kind === "table" && pageCount <= 50 ? <button type="button" onClick={() => { update(element.id, { page: pageCount, x: 17, y: 30, w: 66, h: 60, fontSize: 40, auto: false }); setPage(pageCount); }}>{t("Перенести на новый лист", "Move to a new page")}</button> : null}
          <button type="button" onClick={() => update(element.id, { hidden: !element.hidden })}>{element.hidden ? t("Показать", "Show") : t("Скрыть с печати", "Hide from print")}</button>
          {element.kind === "text" && !["title", "date", "eyebrow"].includes(element.id) ? <button type="button" className="danger" onClick={() => { patch((prev) => ({ ...prev, elements: prev.elements.filter((item) => item.id !== element.id) })); setSelected(null); }}>{t("Удалить надпись", "Delete text")}</button> : null}
        </div> : <p className="print-select-hint">{t("Выберите элемент на листе или в списке.", "Select an element on the sheet or in the list.")}</p>}
      </aside>
    </div>
  </div>;
}
