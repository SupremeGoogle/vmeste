"use client";
/* eslint-disable @next/next/no-img-element -- The print preview must use the exact source pixels embedded in the PDF. */

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadType } from "@/lib/upload-type";
import {
  applyPrintInviteTemplate, mmToPt, PRINT_INVITE_DECOR, PRINT_INVITE_TEMPLATES, printInviteSize, printInviteTemplate,
  type PrintInvitation, type PrintInviteLayer, type PrintInviteTemplateId,
} from "@/lib/print-invitation";
import "./print-invitation-editor.css";

type Seed = { names: string; date: string; venue: string; address: string };
type PhotoOption = { id: string; url: string; alt: string };
type Props = { eventId: string; initial: PrintInvitation; seed: Seed; guestCount: number; initialAssets: PhotoOption[] };
type Drag = { mode: "move" | "resize"; id: string; x: number; y: number; w: number; h: number; pointerX: number; pointerY: number; width: number; height: number };

const fontClass = (font: PrintInviteLayer["font"]) => font === "script" ? "pi-script" : font === "sans" ? "pi-sans" : "pi-serif";
const layerName = (layer: PrintInviteLayer) => layer.kind === "photo" ? "Фотография" : layer.kind === "decor" ? PRINT_INVITE_DECOR.find((d) => d.id === layer.decor)?.name ?? "Украшение" : ({
  eyebrow: "Надпись сверху", names: "Имена", divider: "Разделитель", recipient: "Обращение к гостю", message: "Текст приглашения", date: "Дата", venue: "Место", closing: "Подпись", "back-title": "Заголовок оборота", "back-date": "Дата на обороте", "back-message": "Текст на обороте", "back-venue": "Адрес", "back-rsvp": "Просьба ответить",
} as Record<string, string>)[layer.id] ?? "Ваш текст";
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function PrintInvitationEditor({ eventId, initial, seed, guestCount, initialAssets }: Props) {
  const [design, setDesign] = useState<PrintInvitation>(initial);
  const [page, setPage] = useState<0 | 1>(0);
  const [selectedId, setSelectedId] = useState<string>("names");
  const [width, setWidth] = useState(390);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "working">("idle");
  const [error, setError] = useState("");
  const [elementError, setElementError] = useState("");
  const [assets, setAssets] = useState<PhotoOption[]>(initialAssets);
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const nextLayerId = useRef(Math.max(100, ...initial.layers.map((item) => Number(item.id.match(/-(\d+)$/)?.[1] ?? 0))));
  const firstRender = useRef(true);
  const template = printInviteTemplate(design.template);
  const selected = useMemo(() => design.layers.find((item) => item.id === selectedId) ?? null, [design.layers, selectedId]);
  const pageLayers = design.layers.filter((item) => item.page === page);
  const { mmW } = printInviteSize(design.size);
  const pxPerPoint = width / mmToPt(mmW);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/app/events/${eventId}/print-invitation`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(design) });
        if (!response.ok) throw new Error("Не удалось сохранить макет");
        setSaveState("saved");
      } catch { setSaveState("error"); }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [design, eventId]);

  function updateLayer(id: string, patch: Partial<PrintInviteLayer>) {
    setDesign((current) => ({ ...current, layers: current.layers.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function chooseTemplate(id: PrintInviteTemplateId) {
    setDesign((current) => applyPrintInviteTemplate(current, id, seed));
    setSelectedId("names");
    setPage(0);
  }

  function switchPage(next: 0 | 1) {
    setPage(next);
    setSelectedId(next === 0 ? "names" : "back-title");
  }

  function addText() {
    if (design.layers.length >= 40) { setElementError("На открытке может быть не больше 40 элементов."); return; }
    const id = `custom-${++nextLayerId.current}`;
    const layer: PrintInviteLayer = { id, page, kind: "text", text: "Ваш текст", decor: null, x: 25, y: 50, w: 50, h: 12, fontSize: 16, font: "serif", align: "center", color: template.ink, rotation: 0, hidden: false };
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(id);
  }

  function addDecor(decor: (typeof PRINT_INVITE_DECOR)[number]) {
    if (design.layers.length >= 40) { setElementError("На открытке может быть не больше 40 элементов."); return; }
    const id = `decor-${++nextLayerId.current}`;
    const positions = {
      rose: { x: 76, y: 66, w: 18 }, leaf: { x: 78, y: 8, w: 16 },
      gold: { x: 68, y: 9, w: 28 }, wreath: { x: 72, y: 6, w: 24 }, ribbon: { x: 65, y: 7, w: 30 },
    } as const;
    const { x, y, w } = positions[decor.id];
    const h = clamp(w * (105 / 148) / decor.ratio, 5, 42);
    const layer: PrintInviteLayer = { id, page, kind: "decor", text: "", decor: decor.id, x, y, w, h, fontSize: 12, font: "serif", align: "center", color: template.accent, rotation: 0, hidden: false };
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(id);
  }

  function addPhoto(asset: PhotoOption, targetPage = page, position?: { x: number; y: number }, offset = 0) {
    const id = `photo-${++nextLayerId.current}`;
    const w = 34;
    const h = 25;
    const layer: PrintInviteLayer = {
      id, page: targetPage, kind: "photo", text: "", decor: null, assetId: asset.id, fit: "cover", shape: "rounded",
      x: clamp((position?.x ?? 50) - w / 2 + offset * 4, 0, 100 - w),
      y: clamp((position?.y ?? 50) - h / 2 + offset * 4, 0, 100 - h),
      w, h, fontSize: 12, font: "serif", align: "center", color: template.ink, rotation: 0, hidden: false,
    };
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setPage(targetPage);
    setSelectedId(id);
  }

  async function uploadFile(file: File): Promise<PhotoOption> {
    const presignResponse = await fetch(`/api/app/events/${eventId}/assets/presign`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentType: uploadType(file), bytes: file.size }),
    });
    const presign = await presignResponse.json();
    if (!presignResponse.ok || !presign.ok) throw new Error(presign.message || "Не удалось начать загрузку фотографии.");
    const uploaded = await fetch(presign.uploadUrl, { method: "PUT", headers: { "content-type": uploadType(file) }, body: file });
    if (!uploaded.ok) throw new Error("Не удалось загрузить фотографию. Попробуйте ещё раз.");
    const doneResponse = await fetch(`/api/app/events/${eventId}/assets/complete`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: presign.key, alt: file.name.replace(/\.[^.]+$/, "") }),
    });
    const done = await doneResponse.json();
    if (!doneResponse.ok || !done.ok) throw new Error(done.message || "Не удалось сохранить фотографию.");
    return done.asset;
  }

  async function uploadPhotos(files: File[], position?: { x: number; y: number }, replaceId?: string | null) {
    if (uploading || !files.length) return;
    const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic", "image/heif", "image/tiff", "image/bmp"].includes(file.type) || /\.(heic|heif)$/i.test(file.name));
    if (validFiles.length !== files.length) { setElementError("Выберите фотографии в формате JPEG, PNG, WebP или HEIC."); return; }
    const images = replaceId ? validFiles.slice(0, 1) : validFiles;
    if (design.layers.length + images.length - (replaceId ? 1 : 0) > 40) { setElementError("На открытке может быть не больше 40 элементов."); return; }
    const targetPage = page;
    setElementError("");
    setUploading(true);
    try {
      for (const [index, file] of images.entries()) {
        const asset = await uploadFile(file);
        setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
        if (replaceId && index === 0) updateLayer(replaceId, { assetId: asset.id });
        else addPhoto(asset, targetPage, position, index);
      }
    } catch (cause) { setElementError(cause instanceof Error ? cause.message : "Не удалось загрузить фотографию."); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ""; replaceTarget.current = null; }
  }

  function openPhotoPicker(replaceId: string | null = null) {
    replaceTarget.current = replaceId;
    fileInput.current?.click();
  }

  function dropFiles(event: React.DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    setDropActive(false);
    const rect = sheetRef.current?.getBoundingClientRect();
    const position = rect ? { x: clamp((event.clientX - rect.left) / rect.width * 100, 0, 100), y: clamp((event.clientY - rect.top) / rect.height * 100, 0, 100) } : undefined;
    void uploadPhotos(Array.from(event.dataTransfer.files), position);
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setDesign((current) => {
      const layers = [...current.layers];
      const index = layers.findIndex((item) => item.id === id);
      if (index < 0) return current;
      let neighbor = index + direction;
      while (neighbor >= 0 && neighbor < layers.length && layers[neighbor].page !== layers[index].page) neighbor += direction;
      if (neighbor < 0 || neighbor >= layers.length) return current;
      [layers[index], layers[neighbor]] = [layers[neighbor], layers[index]];
      return { ...current, layers };
    });
  }

  function fillPageWithPhoto(id: string) {
    setDesign((current) => {
      const photo = current.layers.find((item) => item.id === id);
      if (!photo || photo.kind !== "photo") return current;
      const other = current.layers.filter((item) => item.id !== id);
      const firstOnPage = other.findIndex((item) => item.page === photo.page);
      other.splice(firstOnPage < 0 ? 0 : firstOnPage, 0, { ...photo, x: 0, y: 0, w: 100, h: 100, fit: "cover", shape: "square", rotation: 0 });
      return { ...current, showArt: false, layers: other };
    });
  }

  function removeSelected() {
    if (!selected) return;
    setDesign((current) => ({ ...current, layers: current.layers.filter((item) => item.id !== selected.id) }));
    setSelectedId("");
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>, layer: PrintInviteLayer) {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    setSelectedId(layer.id);
    drag.current = { mode: "move", id: layer.id, x: layer.x, y: layer.y, w: layer.w, h: layer.h, pointerX: event.clientX, pointerY: event.clientY, width: rect.width, height: rect.height };
  }

  function resizeDown(event: React.PointerEvent<HTMLSpanElement>, layer: PrintInviteLayer) {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode: "resize", id: layer.id, x: layer.x, y: layer.y, w: layer.w, h: layer.h, pointerX: event.clientX, pointerY: event.clientY, width: rect.width, height: rect.height };
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "resize") updateLayer(d.id, { w: clamp(d.w + (event.clientX - d.pointerX) / d.width * 100, 5, 100 - d.x), h: clamp(d.h + (event.clientY - d.pointerY) / d.height * 100, 3, 100 - d.y) });
    else updateLayer(d.id, { x: clamp(d.x + (event.clientX - d.pointerX) / d.width * 100, 0, 100 - d.w), y: clamp(d.y + (event.clientY - d.pointerY) / d.height * 100, 0, 100 - d.h) });
  }

  function pointerUp() { drag.current = null; }

  function layerKey(event: React.KeyboardEvent<HTMLDivElement>, layer: PrintInviteLayer) {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = steps[event.key];
    if (!move) return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    updateLayer(layer.id, { x: clamp(layer.x + move[0] * step, 0, 100 - layer.w), y: clamp(layer.y + move[1] * step, 0, 100 - layer.h) });
  }

  async function download() {
    if (downloadState === "working") return;
    setError("");
    setDownloadState("working");
    try {
      const response = await fetch(`/api/app/events/${eventId}/print-invitation/pdf`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(design) });
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = design.recipients === "all" ? "priglasheniya-dlya-gostey.pdf" : "pechatnoe-priglashenie.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось собрать PDF"); }
    finally { setDownloadState("idle"); }
  }

  return <div className="pi-editor">
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif,.heic,.heif" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void uploadPhotos(files, undefined, replaceTarget.current); }} />
    <section className="pi-template-panel" aria-label="Оформление открытки">
      <div className="pi-section-title"><div><h2>Выберите оформление</h2><p>Каждый вариант создан для печати и имеет собственную композицию.</p></div><span>6 шаблонов</span></div>
      <div className="pi-template-grid">{PRINT_INVITE_TEMPLATES.map((item) => <button key={item.id} type="button" aria-pressed={design.template === item.id} onClick={() => chooseTemplate(item.id)} className={`pi-template ${design.template === item.id ? "active" : ""}`}>
        <span className="pi-template-thumb" style={{ backgroundImage: `url(/media/invite-print/${item.art})` }}><span style={{ color: item.ink, fontFamily: '"Cormorant Garamond",Georgia,serif' }}>А &amp; М</span></span>
        <strong>{item.name}</strong><small>{item.caption}</small>
      </button>)}</div>
    </section>

    <div className="pi-workspace">
      <section className="pi-stage" aria-label="Предпросмотр приглашения">
        <div className="pi-stage-head"><div><h2>Ваша открытка</h2><p>{design.size} · {design.doubleSided ? "две стороны" : "одна сторона"} · {design.bleed ? "с вылетами для типографии" : "для домашней печати"}</p></div><div className="pi-page-switch"><button type="button" className={page === 0 ? "active" : ""} onClick={() => switchPage(0)}>Лицевая</button>{design.doubleSided ? <button type="button" className={page === 1 ? "active" : ""} onClick={() => switchPage(1)}>Оборотная</button> : null}</div></div>
        <div className="pi-stage-inner"><div ref={sheetRef} className={`pi-sheet ${page === 1 ? "pi-sheet-back" : ""} ${dropActive ? "pi-sheet-drop" : ""}`} style={{ backgroundColor: template.paper }} onDragEnter={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDropActive(true); } }} onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropActive(false); }} onDrop={dropFiles}>
          {design.showArt !== false ? <img src={`/media/invite-print/${template.art}`} alt="" draggable={false} className="pi-sheet-art" /> : null}
          {page === 1 ? <span className="pi-back-frame" style={{ borderColor: template.accent }} /> : null}
          {pageLayers.filter((item) => !item.hidden).map((item) => <div key={item.id} role="button" tabIndex={0} aria-label={`${layerName(item)} — переместить`} aria-pressed={selectedId === item.id} className={`pi-layer ${item.kind === "decor" ? "pi-layer-decor" : item.kind === "photo" ? "pi-layer-photo" : ""} ${selectedId === item.id ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%`, transform: `rotate(${item.rotation}deg)`, color: item.color, textAlign: item.align, fontSize: `${item.fontSize * pxPerPoint * (mmW / 105)}px` }} onPointerDown={(e) => pointerDown(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp} onLostPointerCapture={pointerUp} onKeyDown={(e) => layerKey(e, item)}>
            {item.kind === "decor" ? <img src={`/media/invite-print/${PRINT_INVITE_DECOR.find((d) => d.id === item.decor)?.file ?? "decor-gold.png"}`} alt="" draggable={false} /> : item.kind === "photo" ? <img src={`/api/asset/${eventId}/${item.assetId}`} alt={assets.find((asset) => asset.id === item.assetId)?.alt ?? "Фотография"} draggable={false} style={{ objectFit: item.fit ?? "cover", borderRadius: item.shape === "circle" ? "50%" : item.shape === "rounded" ? "6%" : 0 }} /> : <span className={fontClass(item.font)}>{item.text}</span>}
            {selectedId === item.id ? <span className="pi-resize-handle" aria-hidden="true" onPointerDown={(event) => resizeDown(event, item)} onLostPointerCapture={pointerUp} /> : null}
          </div>)}
          {dropActive ? <div className="pi-drop-overlay">Отпустите файл — фото появится здесь</div> : null}
        </div></div>
        <p className="pi-hint">Перетаскивайте элементы на открытке, тяните уголок для изменения размера. Можно перенести фотографию сюда прямо из Проводника.</p>
      </section>

      <aside className="pi-controls" aria-label="Настройка приглашения">
        <section className="pi-control-card"><h2>Печать</h2>
          <div className="pi-control-row"><label>Формат<select value={design.size} onChange={(e) => setDesign((d) => ({ ...d, size: e.target.value as PrintInvitation["size"] }))}><option value="A6">A6 · открытка 105 × 148 мм</option><option value="A5">A5 · 148 × 210 мм</option></select></label></div>
          <label className="pi-check"><input type="checkbox" checked={design.doubleSided} onChange={(e) => { setDesign((d) => ({ ...d, doubleSided: e.target.checked })); if (!e.target.checked) setPage(0); }} /> Двусторонняя открытка</label>
          <label className="pi-check"><input type="checkbox" checked={design.bleed} onChange={(e) => setDesign((d) => ({ ...d, bleed: e.target.checked }))} /> Вылеты 3 мм для типографии</label>
          <label className="pi-check"><input type="checkbox" checked={design.showArt !== false} onChange={(e) => setDesign((d) => ({ ...d, showArt: e.target.checked }))} /> Показывать оформление фона</label>
          <label>Для кого<select value={design.recipients} onChange={(e) => setDesign((d) => ({ ...d, recipients: e.target.value as PrintInvitation["recipients"] }))}><option value="single">Одна открытка</option><option value="all">Именные для всех гостей ({guestCount})</option></select></label>
          {design.recipients === "all" ? <p className="pi-note">В PDF появится отдельная открытка для каждого гостя из списка. Обращение на лицевой стороне заменится именем. До 150 гостей в одном файле.</p> : null}
          <p className="pi-note">Для двусторонней печати: масштаб 100%, переворот по длинной стороне. При включённых вылетах обрежьте по выбранному формату.</p>
          <button type="button" className="pi-download" onClick={download} disabled={downloadState === "working" || (design.recipients === "all" && (guestCount === 0 || guestCount > 150))}>{downloadState === "working" ? "Собираем PDF…" : "Скачать PDF для печати ↓"}</button>
          {error ? <p role="alert" className="pi-error">{error}</p> : null}
          <p className="pi-save">{saveState === "saving" ? "Сохраняем изменения…" : saveState === "saved" ? "Изменения сохранены" : saveState === "error" ? "Не удалось сохранить. Проверьте соединение." : "Макет сохранится автоматически"}</p>
        </section>

        <section className="pi-control-card"><h2>Элементы</h2><div className="pi-add-row"><button type="button" onClick={addText} disabled={design.layers.length >= 40}>+ Надпись</button><button type="button" onClick={() => openPhotoPicker()} disabled={uploading || design.layers.length >= 40}>+ Фото с компьютера</button>{PRINT_INVITE_DECOR.map((item) => <button key={item.id} type="button" onClick={() => addDecor(item)} disabled={design.layers.length >= 40}>+ {item.name}</button>)}</div>
          <p className="pi-note">{uploading ? "Загружаем фотографию…" : "Выберите JPEG, PNG, WebP или HEIC до 25 МБ. Можно перетащить файл из Проводника прямо на открытку."}</p>
          {elementError ? <p role="alert" className="pi-error">{elementError}</p> : null}
          {assets.length ? <div className="pi-photo-library"><span>Уже загруженные фото</span><div>{assets.slice(0, 18).map((asset) => <button key={asset.id} type="button" title={`Добавить: ${asset.alt}`} onClick={() => addPhoto(asset)} disabled={design.layers.length >= 40}><img src={asset.url} alt={asset.alt} /></button>)}</div></div> : null}
          <div className="pi-layer-list">{pageLayers.map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span>{item.kind === "photo" ? <img className="pi-layer-thumb" src={`/api/asset/${eventId}/${item.assetId}`} alt="" /> : null}{layerName(item)}</span>{item.hidden ? <small>скрыто</small> : null}</button>)}</div>
        </section>

        {selected ? <section className="pi-control-card pi-selected" key={selected.id}>
          <div className="pi-selected-head"><h2>{layerName(selected)}</h2><button type="button" onClick={removeSelected} title="Удалить элемент">Удалить</button></div>
          {selected.kind === "text" ? <>
            <label>Текст<textarea value={selected.text} onChange={(e) => updateLayer(selected.id, { text: e.target.value })} rows={selected.id === "message" || selected.id === "back-message" ? 4 : 2} maxLength={500} /></label>
            <div className="pi-two"><label>Шрифт<select value={selected.font} onChange={(e) => updateLayer(selected.id, { font: e.target.value as PrintInviteLayer["font"] })}><option value="serif">Классический</option><option value="script">Рукописный</option><option value="sans">Современный</option></select></label><label>Размер, пт<input type="number" min="7" max="70" value={selected.fontSize} onChange={(e) => updateLayer(selected.id, { fontSize: clamp(Number(e.target.value) || 7, 7, 70) })} /></label></div>
            <label>Цвет текста<div className="pi-color-row"><input type="color" value={selected.color} aria-label="Выбрать любой цвет" onChange={(e) => updateLayer(selected.id, { color: e.target.value })} /><span>{selected.color.toUpperCase()}</span></div></label>
            <div className="pi-color-presets" aria-label="Готовые цвета">{[template.ink, template.accent, "#252525", "#ffffff", "#864d5a", "#567b6a"].map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={`Цвет ${color}`} title={color} className={selected.color.toLowerCase() === color.toLowerCase() ? "active" : ""} style={{ backgroundColor: color }} onClick={() => updateLayer(selected.id, { color })} />)}</div>
            <label>Выравнивание<select value={selected.align} onChange={(e) => updateLayer(selected.id, { align: e.target.value as PrintInviteLayer["align"] })}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></label>
          </> : selected.kind === "photo" ? <>
            <div className="pi-photo-selected"><img src={`/api/asset/${eventId}/${selected.assetId}`} alt="Выбранная фотография" /><div><strong>{assets.find((asset) => asset.id === selected.assetId)?.alt ?? "Фотография"}</strong><button type="button" onClick={() => openPhotoPicker(selected.id)} disabled={uploading}>Заменить фотографию</button></div></div>
            <div className="pi-two"><label>Кадрирование<select value={selected.fit ?? "cover"} onChange={(e) => updateLayer(selected.id, { fit: e.target.value as "cover" | "contain" })}><option value="cover">Заполнить рамку</option><option value="contain">Показать целиком</option></select></label><label>Форма<select value={selected.shape ?? "rounded"} onChange={(e) => updateLayer(selected.id, { shape: e.target.value as "square" | "rounded" | "circle" })}><option value="square">Прямоугольная</option><option value="rounded">С мягкими углами</option><option value="circle">Круглая</option></select></label></div>
            <button type="button" className="pi-fill-photo" onClick={() => fillPageWithPhoto(selected.id)}>Сделать фото фоном страницы</button>
          </> : <div className="pi-decor-picker">{PRINT_INVITE_DECOR.map((item) => <button type="button" key={item.id} className={selected.decor === item.id ? "active" : ""} onClick={() => updateLayer(selected.id, { decor: item.id })}><img src={`/media/invite-print/${item.file}`} alt="" />{item.name}</button>)}</div>}
          <div className="pi-two"><label>Слева, %<input type="number" min="0" max={100 - selected.w} value={Math.round(selected.x)} onChange={(e) => updateLayer(selected.id, { x: clamp(Number(e.target.value) || 0, 0, 100 - selected.w) })} /></label><label>Сверху, %<input type="number" min="0" max={100 - selected.h} value={Math.round(selected.y)} onChange={(e) => updateLayer(selected.id, { y: clamp(Number(e.target.value) || 0, 0, 100 - selected.h) })} /></label></div>
          <div className="pi-two"><label>Ширина, %<input type="number" min="5" max="100" value={Math.round(selected.w)} onChange={(e) => updateLayer(selected.id, { w: clamp(Number(e.target.value) || 5, 5, 100 - selected.x) })} /></label><label>Высота, %<input type="number" min="3" max="100" value={Math.round(selected.h)} onChange={(e) => updateLayer(selected.id, { h: clamp(Number(e.target.value) || 3, 3, 100 - selected.y) })} /></label></div>
          {selected.kind !== "text" ? <label>Поворот, °<input type="range" min="-180" max="180" value={selected.rotation} onChange={(e) => updateLayer(selected.id, { rotation: Number(e.target.value) })} /><span className="pi-range-value">{selected.rotation}°</span></label> : null}
          <div className="pi-order-row"><button type="button" onClick={() => moveLayer(selected.id, -1)}>← На слой ниже</button><button type="button" onClick={() => moveLayer(selected.id, 1)}>На слой выше →</button></div>
          <label className="pi-check"><input type="checkbox" checked={selected.hidden} onChange={(e) => updateLayer(selected.id, { hidden: e.target.checked })} /> Скрыть элемент</label>
        </section> : <section className="pi-control-card"><p>Выберите элемент на открытке или в списке, чтобы изменить его.</p></section>}
      </aside>
    </div>
  </div>;
}
