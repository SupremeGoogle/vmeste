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
import "./print-designer.css";

type Props = {
  eventId: string; mode: PrintMode; initial: PrintDesign;
  title: string; date: string; tables: PrintTable[]; qrData: string; shortCode: string;
};
type Drag = { id: string; kind: "move" | "resize"; x: number; y: number; start: PrintElement };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 10) / 10;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

export function PrintDesigner({ eventId, mode, initial, title, date, tables, qrData, shortCode }: Props) {
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
    setState("Есть несохранённые изменения");
  }
  const update = useCallback((id: string, changes: Partial<PrintElement>) => {
    setDesign((prev) => ({ ...prev, elements: prev.elements.map((item) => item.id === id ? { ...item, ...changes } : item) }));
    setState("Есть несохранённые изменения");
  }, []);

  function chooseTemplate(id: PrintTemplateId) {
    const fresh = defaultPrintDesign(mode, id, title, date, tables);
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
    setState("Сохраняем…");
    try {
      const res = await fetch(`/api/app/events/${eventId}/print-design`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(design) });
      if (!res.ok) throw new Error("Не удалось сохранить макет");
      setState("Макет сохранён");
    } catch { setState("Не удалось сохранить. Попробуйте ещё раз."); }
  }
  async function download() {
    setState("Готовим PDF…");
    try {
      const res = await fetch(`/api/app/events/${eventId}/print-design/pdf`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(design) });
      if (!res.ok) throw new Error("PDF не готов");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = mode === "seating" ? "план-рассадки.pdf" : "qr-код.pdf";
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setState("PDF скачан");
    } catch { setState("Не удалось создать PDF. Попробуйте ещё раз."); }
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
        <h2>{mode === "seating" ? "План рассадки для печати" : "QR-код для печати"}</h2>
        <p>{mode === "seating"
          ? `Столов: ${tables.length}, гостей: ${guestCount}. Стол молодожёнов на план не выводится. Перетаскивайте элементы, приближайте лист колесом с Ctrl.`
          : "Выберите стиль и перетащите элементы на листе."}</p>
      </div>
      <div className="print-editor-actions"><button type="button" onClick={save}>Сохранить макет</button><button type="button" className="primary" onClick={download}>Скачать PDF</button></div>
    </div>
    <p className="print-editor-state" role="status">{state}</p>
    <div className="print-editor-templates" aria-label="Шаблоны оформления">
      {PRINT_TEMPLATES.map((item) => <button key={item.id} type="button" className={design.template === item.id ? "active" : ""} onClick={() => chooseTemplate(item.id)} aria-pressed={design.template === item.id}>
        <span className={`print-template-thumb print-theme-${item.id}`} style={{ color: item.ink, background: item.paper }}>
          {mode === "qr" ? <img className="print-qr-thumb-art" src={`/media/print-design/${item.qrArt}.webp`} alt="" /> : item.art !== "none" ? <img src={`/media/print-design/${item.art}.webp`} alt="" /> : <span className="print-thumb-mark">✦</span>}
          <i style={{ color: item.accent }}>A &amp; M</i>
          {mode === "seating" ? <span className={`print-thumb-structure structure-${item.layout}`} style={{ color: item.accent }}>{Array.from({ length: item.layout === "single" ? 1 : item.layout === "cards" ? 5 : item.layout === "orbit" ? 6 : item.layout === "grid4" ? 8 : item.layout === "grid2" || item.layout === "wide" ? 6 : 9 }, (_, i) => <b key={i} />)}</span> : <img className="print-thumb-qr" src={qrData} alt="" />}
        </span><span>{mode === "qr" ? item.qrName : item.name}</span>
      </button>)}
    </div>
    <div className="print-editor-workspace">
      <div className="print-editor-main">
        <div className="print-editor-toolbar">
          <label>Формат <select value={design.paper} onChange={(e) => setSheet({ paper: e.target.value as PrintDesign["paper"] })}><option>A2</option><option>A3</option><option>A4</option></select></label>
          <label>Ориентация <select value={design.orientation} onChange={(e) => setSheet({ orientation: e.target.value as PrintDesign["orientation"] })}><option value="portrait">Вертикально</option><option value="landscape">Горизонтально</option></select></label>
          {pageCount > 1 ? <label>Лист <select value={page} onChange={(e) => { setPage(Number(e.target.value)); setSelected(null); }}>{Array.from({ length: pageCount }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label> : null}
          <label>Акцент <input type="color" value={design.accent} onChange={(e) => patch((prev) => ({ ...prev, accent: e.target.value }))} /></label>
          <label>Текст <input type="color" value={design.ink} onChange={(e) => patch((prev) => ({ ...prev, ink: e.target.value }))} /></label>
          <button type="button" onClick={() => { const id = `text:${Date.now()}`; const item: PrintElement = { id, kind: "text", text: "Ваш текст", x: 24, y: 50, w: 52, fontSize: 22, align: "center", hidden: false, page, auto: false }; patch((prev) => ({ ...prev, elements: [...prev.elements, item] })); setSelected(id); }}>+ Надпись</button>
          {mode === "seating" ? <button type="button" onClick={regrid} title="Вернуть все столы в ровную сетку на первом листе">Разложить столы</button> : null}
          <button type="button" onClick={() => { if (!confirm("Вернуть расположение элементов по умолчанию?")) return; setDesign(defaultPrintDesign(mode, design.template, title, date, tables)); setSelected(null); setPage(0); setState("Расположение сброшено"); }}>Сбросить</button>
        </div>
        <div className="print-editor-toolbar print-editor-sizes">
          <span className="print-stepper" aria-label="Размер всего текста">
            <span>Весь текст</span>
            <button type="button" onClick={() => scaleText("textScale", -0.1)} aria-label="Уменьшить весь текст">A−</button>
            <b>{Math.round(design.textScale * 100)}%</b>
            <button type="button" onClick={() => scaleText("textScale", 0.1)} aria-label="Увеличить весь текст">A+</button>
          </span>
          {mode === "seating" ? <span className="print-stepper" aria-label="Размер имён гостей">
            <span>Имена гостей</span>
            <button type="button" onClick={() => scaleText("guestScale", -0.1)} aria-label="Уменьшить имена">A−</button>
            <b>{Math.round(design.guestScale * 100)}%</b>
            <button type="button" onClick={() => scaleText("guestScale", 0.1)} aria-label="Увеличить имена">A+</button>
          </span> : null}
          <span className="print-stepper" aria-label="Масштаб листа">
            <span>Масштаб</span>
            <button type="button" onClick={() => zoomTo(zoom / 1.25)} aria-label="Отдалить">−</button>
            <button type="button" className="print-zoom-value" onClick={() => zoomTo(1)} title="Вернуть лист по размеру окна">{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => zoomTo(zoom * 1.25)} aria-label="Приблизить">+</button>
          </span>
        </div>
        <div ref={scroller} className="print-canvas-scroll" onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div ref={canvas} className={`print-canvas print-theme-${design.template}`} style={{ width: canvasWidth, background: theme.paper, color: design.ink, aspectRatio: `${sheet.w} / ${sheet.h}` }} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            {mode === "qr" ? <img className="print-canvas-qr-art" src={`/media/print-design/${theme.qrArt}.webp`} alt="" /> : theme.art !== "none" ? <><img className="print-canvas-art top" src={`/media/print-design/${theme.art}.webp`} alt="" /><img className="print-canvas-art bottom" src={`/media/print-design/${theme.art}.webp`} alt="" /></> : null}
            {theme.frame !== "none" ? <div className={`print-canvas-frame frame-${theme.frame}`} style={{ borderColor: design.accent }} /> : null}
            {mode === "seating" && theme.layout === "orbit" && !design.elements.some((item) => item.page === page && item.kind === "table" && isSoloPrintTable(design, item)) ? <div className="print-orbit-center" style={{ borderColor: design.accent, color: design.accent, fontSize: pt(19) * design.textScale }}>СХЕМА<br />ЗАЛА</div> : null}
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
                {item.kind === "qr" ? <img className="print-canvas-qr" src={qrData} alt="QR-код входа на праздник" />
                  : item.kind === "code" ? <><small style={{ fontSize: pt(10) * design.textScale }}>{item.text}</small><strong style={{ fontSize: titleSize }}>{shortCode}</strong></>
                  : item.kind === "table" ? theme.layout === "orbit" && !solo ? <div className="print-orbit-table">
                    <strong style={{ fontSize: titleSize, color: design.accent, width: titleSize * 3.2, height: titleSize * 1.7 }}>{item.text || table?.label}</strong>
                    <div className="print-orbit-columns">
                      <span className="print-orbit-guests" style={{ fontSize: guestsSize, color: design.ink }}>{table?.guests.slice(0, Math.ceil(table.guests.length / 2)).join("\n") || ""}</span>
                      <span className="print-orbit-guests" style={{ fontSize: guestsSize, color: design.ink }}>{table?.guests.slice(Math.ceil(table.guests.length / 2)).join("\n") || ""}</span>
                    </div>
                  </div> : <><strong style={{ fontSize: titleSize, color: design.accent, fontFamily: ["minimal", "deco"].includes(design.template) ? "PrintSerif" : "PrintScript" }}>{item.text || table?.label}</strong><span className="print-table-guests" style={{ fontSize: guestsSize, color: design.ink }}>{table?.guests.join("\n") || "Пока нет гостей"}</span></>
                  : <span style={{ fontSize: titleSize, fontFamily: item.id === "title" || item.fontSize >= 25 ? "PrintScript" : "PrintSerif" }}>{item.text}</span>}
                {isSelected ? <div className="print-resize-handle" title="Потяните, чтобы изменить размер" onPointerDown={(e) => pointerDown(e, item, "resize")} onPointerMove={pointerMove} onPointerUp={pointerUp} onLostPointerCapture={pointerUp} /> : null}
              </div>;
            })}
          </div>
        </div>
        <p className="print-editor-hint">Стрелки двигают выбранный элемент (с Shift быстрее), + и − меняют его размер, Ctrl + колесо приближает лист.</p>
      </div>
      <aside className="print-editor-side">
        <h3>Элементы листа</h3>
        <p>Нажмите на элемент и перетащите его. Скрытые можно вернуть.</p>
        <div className="print-element-list">{design.elements.filter((item) => item.page === page).map((item) => <button key={item.id} type="button" className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}><span>{item.kind === "table" ? item.text : item.kind === "qr" ? "QR-код" : item.kind === "code" ? "Код входа" : item.text || "Надпись"}</span>{item.hidden ? <small>скрыт</small> : null}</button>)}</div>
        {element ? <div className="print-element-settings" key={element.id}>
          <h4>{element.kind === "table" ? "Карточка стола" : element.kind === "qr" ? "QR-код" : "Надпись"}</h4>
          {element.kind !== "qr" ? <label>Текст <textarea value={element.text} onChange={(e) => update(element.id, { text: e.target.value })} rows={element.kind === "table" ? 1 : 3} /></label> : <p>QR-код ведёт на страницу входа гостей.</p>}
          {element.kind !== "qr" ? <div className="print-field">
            <span>{element.kind === "table" ? "Размер названия" : "Размер шрифта"}</span>
            <div className="print-number">
              <button type="button" onClick={() => update(element.id, { fontSize: clamp(element.fontSize - 1, 6, 110) })} aria-label="Меньше">−</button>
              <input type="number" min={6} max={110} value={element.fontSize} onChange={(e) => update(element.id, { fontSize: clamp(Number(e.target.value) || 6, 6, 110) })} />
              <button type="button" onClick={() => update(element.id, { fontSize: clamp(element.fontSize + 1, 6, 110) })} aria-label="Больше">+</button>
            </div>
          </div> : null}
          <label>Ширина, % <input type="number" min={4} max={100} value={element.w} onChange={(e) => update(element.id, { w: clamp(Number(e.target.value) || 4, 4, 100), auto: false })} /></label>
          {element.kind === "table" ? <label>Высота, % <input type="number" min={3} max={100} value={element.h ?? 19} onChange={(e) => update(element.id, { h: clamp(Number(e.target.value) || 3, 3, 100), auto: false })} /></label> : null}
          <label>Выравнивание <select value={element.align} onChange={(e) => update(element.id, { align: e.target.value as PrintElement["align"] })}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></label>
          {pageCount > 1 && element.kind === "table" ? <label>Лист <select value={element.page} onChange={(e) => { update(element.id, { page: Number(e.target.value), auto: false }); setPage(Number(e.target.value)); }}><option value={0}>1</option>{Array.from({ length: pageCount - 1 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 2}</option>)}</select></label> : null}
          {element.kind === "table" && pageCount <= 50 ? <button type="button" onClick={() => { update(element.id, { page: pageCount, x: 17, y: 30, w: 66, h: 60, fontSize: 40, auto: false }); setPage(pageCount); }}>Перенести на новый лист</button> : null}
          <button type="button" onClick={() => update(element.id, { hidden: !element.hidden })}>{element.hidden ? "Показать" : "Скрыть с печати"}</button>
          {element.kind === "text" && !["title", "date", "eyebrow"].includes(element.id) ? <button type="button" className="danger" onClick={() => { patch((prev) => ({ ...prev, elements: prev.elements.filter((item) => item.id !== element.id) })); setSelected(null); }}>Удалить надпись</button> : null}
        </div> : <p className="print-select-hint">Выберите элемент на листе или в списке.</p>}
      </aside>
    </div>
  </div>;
}
