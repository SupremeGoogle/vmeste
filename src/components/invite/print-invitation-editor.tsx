"use client";
/* eslint-disable @next/next/no-img-element -- The print preview must use the exact source pixels embedded in the PDF. */

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadType } from "@/lib/upload-type";
import {
  applyPrintInviteTemplate, mmToPt, PRINT_INVITE_DECOR, PRINT_INVITE_TEMPLATES, printInviteSize, printInviteTemplate,
  type PrintInvitation, type PrintInviteLayer, type PrintInviteTemplateId,
} from "@/lib/print-invitation";
import "./print-invitation-editor.css";
import { useT } from "@/components/i18n-provider";
import type { Lang, T } from "@/lib/i18n";

type Seed = { names: string; date: string; venue: string; address: string; lang?: Lang };
type PhotoOption = { id: string; url: string; alt: string };
type Props = { eventId: string; initial: PrintInvitation; seed: Seed; guestCount: number; initialAssets: PhotoOption[] };
type Drag = { mode: "move" | "resize"; id: string; x: number; y: number; w: number; h: number; pointerX: number; pointerY: number; width: number; height: number };

const fontClass = (font: PrintInviteLayer["font"]) => font === "script" ? "pi-script" : font === "sans" ? "pi-sans" : "pi-serif";
const LAYER_NAMES: Record<string, [string, string]> = {
  eyebrow: ["Надпись сверху", "Top line"], names: ["Имена", "Names"], divider: ["Разделитель", "Divider"], recipient: ["Обращение к гостю", "Greeting"], message: ["Текст приглашения", "Invitation text"], date: ["Дата", "Date"], venue: ["Место", "Venue"], closing: ["Подпись", "Sign-off"], "back-title": ["Заголовок оборота", "Back heading"], "back-date": ["Дата на обороте", "Back date"], "back-message": ["Текст на обороте", "Back text"], "back-venue": ["Адрес", "Address"], "back-rsvp": ["Просьба ответить", "RSVP request"],
};
const layerName = (layer: PrintInviteLayer, t: T) => {
  if (layer.kind === "photo") return t("Фотография", "Photo");
  if (layer.kind === "decor") {
    const decor = PRINT_INVITE_DECOR.find((d) => d.id === layer.decor);
    return decor ? t(decor.name, decor.nameEn) : t("Украшение", "Decoration");
  }
  const name = LAYER_NAMES[layer.id];
  return name ? t(name[0], name[1]) : t("Ваш текст", "Your text");
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function PrintInvitationEditor({ eventId, initial, seed, guestCount, initialAssets }: Props) {
  const t = useT();
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
    if (design.layers.length >= 40) { setElementError(t("На открытке может быть не больше 40 элементов.", "A card can have up to 40 elements.")); return; }
    const id = `custom-${++nextLayerId.current}`;
    const layer: PrintInviteLayer = { id, page, kind: "text", text: seed.lang === "en" ? "Your text" : "Ваш текст", decor: null, x: 25, y: 50, w: 50, h: 12, fontSize: 16, font: "serif", align: "center", color: template.ink, rotation: 0, hidden: false };
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(id);
  }

  function addDecor(decor: (typeof PRINT_INVITE_DECOR)[number]) {
    if (design.layers.length >= 40) { setElementError(t("На открытке может быть не больше 40 элементов.", "A card can have up to 40 elements.")); return; }
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
    if (!presignResponse.ok || !presign.ok) throw new Error(presign.message || t("Не удалось начать загрузку фотографии.", "Couldn’t start the photo upload."));
    const uploaded = await fetch(presign.uploadUrl, { method: "PUT", headers: { "content-type": uploadType(file) }, body: file });
    if (!uploaded.ok) throw new Error(t("Не удалось загрузить фотографию. Попробуйте ещё раз.", "Couldn’t upload the photo. Please try again."));
    const doneResponse = await fetch(`/api/app/events/${eventId}/assets/complete`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: presign.key, alt: file.name.replace(/\.[^.]+$/, "") }),
    });
    const done = await doneResponse.json();
    if (!doneResponse.ok || !done.ok) throw new Error(done.message || t("Не удалось сохранить фотографию.", "Couldn’t save the photo."));
    return done.asset;
  }

  async function uploadPhotos(files: File[], position?: { x: number; y: number }, replaceId?: string | null) {
    if (uploading || !files.length) return;
    const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic", "image/heif", "image/tiff", "image/bmp"].includes(file.type) || /\.(heic|heif)$/i.test(file.name));
    if (validFiles.length !== files.length) { setElementError(t("Выберите фотографии в формате JPEG, PNG, WebP или HEIC.", "Choose photos in JPEG, PNG, WebP or HEIC format.")); return; }
    const images = replaceId ? validFiles.slice(0, 1) : validFiles;
    if (design.layers.length + images.length - (replaceId ? 1 : 0) > 40) { setElementError(t("На открытке может быть не больше 40 элементов.", "A card can have up to 40 elements.")); return; }
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
    } catch (cause) { setElementError(cause instanceof Error ? cause.message : t("Не удалось загрузить фотографию.", "Couldn’t upload the photo.")); }
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("Не удалось собрать PDF", "Couldn’t create the PDF")); }
    finally { setDownloadState("idle"); }
  }

  return <div className="pi-editor">
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif,.heic,.heif" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void uploadPhotos(files, undefined, replaceTarget.current); }} />
    <section className="pi-template-panel" aria-label={t("Оформление открытки", "Card design")}>
      <div className="pi-section-title"><div><h2>{t("Выберите оформление", "Choose a design")}</h2><p>{t("Каждый вариант создан для печати и имеет собственную композицию.", "Each design is made for print and has its own layout.")}</p></div><span>{t("6 шаблонов", "6 templates")}</span></div>
      <div className="pi-template-grid">{PRINT_INVITE_TEMPLATES.map((item) => <button key={item.id} type="button" aria-pressed={design.template === item.id} onClick={() => chooseTemplate(item.id)} className={`pi-template ${design.template === item.id ? "active" : ""}`}>
        <span className="pi-template-thumb" style={{ backgroundImage: `url(/media/invite-print/${item.art})` }}><span style={{ color: item.ink, fontFamily: '"Cormorant Garamond",Georgia,serif' }}>А &amp; М</span></span>
        <strong>{t(item.name, item.nameEn)}</strong><small>{t(item.caption, item.captionEn)}</small>
      </button>)}</div>
    </section>

    <div className="pi-workspace">
      <section className="pi-stage" aria-label={t("Предпросмотр приглашения", "Invitation preview")}>
        <div className="pi-stage-head"><div><h2>{t("Ваша открытка", "Your card")}</h2><p>{design.size} · {design.doubleSided ? t("две стороны", "two-sided") : t("одна сторона", "one-sided")} · {design.bleed ? t("с вылетами для типографии", "with bleed for a print shop") : t("для домашней печати", "for home printing")}</p></div><div className="pi-page-switch"><button type="button" className={page === 0 ? "active" : ""} onClick={() => switchPage(0)}>{t("Лицевая", "Front")}</button>{design.doubleSided ? <button type="button" className={page === 1 ? "active" : ""} onClick={() => switchPage(1)}>{t("Оборотная", "Back")}</button> : null}</div></div>
        <div className="pi-stage-inner"><div ref={sheetRef} className={`pi-sheet ${page === 1 ? "pi-sheet-back" : ""} ${dropActive ? "pi-sheet-drop" : ""}`} style={{ backgroundColor: template.paper }} onDragEnter={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDropActive(true); } }} onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropActive(false); }} onDrop={dropFiles}>
          {design.showArt !== false ? <img src={`/media/invite-print/${template.art}`} alt="" draggable={false} className="pi-sheet-art" /> : null}
          {page === 1 ? <span className="pi-back-frame" style={{ borderColor: template.accent }} /> : null}
          {pageLayers.filter((item) => !item.hidden).map((item) => <div key={item.id} role="button" tabIndex={0} aria-label={t(`${layerName(item, t)} — переместить`, `${layerName(item, t)} — move`)} aria-pressed={selectedId === item.id} className={`pi-layer ${item.kind === "decor" ? "pi-layer-decor" : item.kind === "photo" ? "pi-layer-photo" : ""} ${selectedId === item.id ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%`, transform: `rotate(${item.rotation}deg)`, color: item.color, textAlign: item.align, fontSize: `${item.fontSize * pxPerPoint * (mmW / 105)}px` }} onPointerDown={(e) => pointerDown(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp} onLostPointerCapture={pointerUp} onKeyDown={(e) => layerKey(e, item)}>
            {item.kind === "decor" ? <img src={`/media/invite-print/${PRINT_INVITE_DECOR.find((d) => d.id === item.decor)?.file ?? "decor-gold.png"}`} alt="" draggable={false} /> : item.kind === "photo" ? <img src={`/api/asset/${eventId}/${item.assetId}`} alt={assets.find((asset) => asset.id === item.assetId)?.alt ?? t("Фотография", "Photo")} draggable={false} style={{ objectFit: item.fit ?? "cover", borderRadius: item.shape === "circle" ? "50%" : item.shape === "rounded" ? "6%" : 0 }} /> : <span className={fontClass(item.font)}>{item.text}</span>}
            {selectedId === item.id ? <span className="pi-resize-handle" aria-hidden="true" onPointerDown={(event) => resizeDown(event, item)} onLostPointerCapture={pointerUp} /> : null}
          </div>)}
          {dropActive ? <div className="pi-drop-overlay">{t("Отпустите файл — фото появится здесь", "Drop the file — the photo will appear here")}</div> : null}
        </div></div>
        <p className="pi-hint">{t("Перетаскивайте элементы на открытке, тяните уголок для изменения размера. Можно перенести фотографию сюда прямо из Проводника.", "Drag elements around the card and pull a corner to resize. You can also drop a photo here straight from your computer.")}</p>
      </section>

      <aside className="pi-controls" aria-label={t("Настройка приглашения", "Invitation settings")}>
        <section className="pi-control-card"><h2>{t("Печать", "Print")}</h2>
          <div className="pi-control-row"><label>{t("Формат", "Size")}<select value={design.size} onChange={(e) => setDesign((d) => ({ ...d, size: e.target.value as PrintInvitation["size"] }))}><option value="A6">{t("A6 · открытка 105 × 148 мм", "A6 · card 105 × 148 mm")}</option><option value="A5">{t("A5 · 148 × 210 мм", "A5 · 148 × 210 mm")}</option></select></label></div>
          <label className="pi-check"><input type="checkbox" checked={design.doubleSided} onChange={(e) => { setDesign((d) => ({ ...d, doubleSided: e.target.checked })); if (!e.target.checked) setPage(0); }} /> {t("Двусторонняя открытка", "Two-sided card")}</label>
          <label className="pi-check"><input type="checkbox" checked={design.bleed} onChange={(e) => setDesign((d) => ({ ...d, bleed: e.target.checked }))} /> {t("Вылеты 3 мм для типографии", "3 mm bleed for a print shop")}</label>
          <label className="pi-check"><input type="checkbox" checked={design.showArt !== false} onChange={(e) => setDesign((d) => ({ ...d, showArt: e.target.checked }))} /> {t("Показывать оформление фона", "Show background artwork")}</label>
          <label>{t("Для кого", "Recipients")}<select value={design.recipients} onChange={(e) => setDesign((d) => ({ ...d, recipients: e.target.value as PrintInvitation["recipients"] }))}><option value="single">{t("Одна открытка", "One card")}</option><option value="all">{t("Именные для всех гостей", "Personalized for every guest")} ({guestCount})</option></select></label>
          {design.recipients === "all" ? <p className="pi-note">{t("В PDF появится отдельная открытка для каждого гостя из списка. Обращение на лицевой стороне заменится именем. До 150 гостей в одном файле.", "The PDF will include a separate card for each guest on your list, with the greeting on the front replaced by their name. Up to 150 guests per file.")}</p> : null}
          <p className="pi-note">{t("Для двусторонней печати: масштаб 100%, переворот по длинной стороне. При включённых вылетах обрежьте по выбранному формату.", "For two-sided printing: 100% scale, flip on the long edge. With bleed on, trim to the selected size.")}</p>
          <button type="button" className="pi-download" onClick={download} disabled={downloadState === "working" || (design.recipients === "all" && (guestCount === 0 || guestCount > 150))}>{downloadState === "working" ? t("Собираем PDF…", "Creating PDF…") : t("Скачать PDF для печати ↓", "Download print PDF ↓")}</button>
          {error ? <p role="alert" className="pi-error">{error}</p> : null}
          <p className="pi-save">{saveState === "saving" ? t("Сохраняем изменения…", "Saving changes…") : saveState === "saved" ? t("Изменения сохранены", "Changes saved") : saveState === "error" ? t("Не удалось сохранить. Проверьте соединение.", "Couldn’t save. Check your connection.") : t("Макет сохранится автоматически", "Your design saves automatically")}</p>
        </section>

        <section className="pi-control-card"><h2>{t("Элементы", "Elements")}</h2><div className="pi-add-row"><button type="button" onClick={addText} disabled={design.layers.length >= 40}>{t("+ Надпись", "+ Text")}</button><button type="button" onClick={() => openPhotoPicker()} disabled={uploading || design.layers.length >= 40}>{t("+ Фото с компьютера", "+ Photo from computer")}</button>{PRINT_INVITE_DECOR.map((item) => <button key={item.id} type="button" onClick={() => addDecor(item)} disabled={design.layers.length >= 40}>+ {t(item.name, item.nameEn)}</button>)}</div>
          <p className="pi-note">{uploading ? t("Загружаем фотографию…", "Uploading photo…") : t("Выберите JPEG, PNG, WebP или HEIC до 25 МБ. Можно перетащить файл из Проводника прямо на открытку.", "Choose a JPEG, PNG, WebP or HEIC up to 25 MB. You can also drag a file straight onto the card.")}</p>
          {elementError ? <p role="alert" className="pi-error">{elementError}</p> : null}
          {assets.length ? <div className="pi-photo-library"><span>{t("Уже загруженные фото", "Uploaded photos")}</span><div>{assets.slice(0, 18).map((asset) => <button key={asset.id} type="button" title={t(`Добавить: ${asset.alt}`, `Add: ${asset.alt}`)} onClick={() => addPhoto(asset)} disabled={design.layers.length >= 40}><img src={asset.url} alt={asset.alt} /></button>)}</div></div> : null}
          <div className="pi-layer-list">{pageLayers.map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span>{item.kind === "photo" ? <img className="pi-layer-thumb" src={`/api/asset/${eventId}/${item.assetId}`} alt="" /> : null}{layerName(item, t)}</span>{item.hidden ? <small>{t("скрыто", "hidden")}</small> : null}</button>)}</div>
        </section>

        {selected ? <section className="pi-control-card pi-selected" key={selected.id}>
          <div className="pi-selected-head"><h2>{layerName(selected, t)}</h2><button type="button" onClick={removeSelected} title={t("Удалить элемент", "Delete element")}>{t("Удалить", "Delete")}</button></div>
          {selected.kind === "text" ? <>
            <label>{t("Текст", "Text")}<textarea value={selected.text} onChange={(e) => updateLayer(selected.id, { text: e.target.value })} rows={selected.id === "message" || selected.id === "back-message" ? 4 : 2} maxLength={500} /></label>
            <div className="pi-two"><label>{t("Шрифт", "Font")}<select value={selected.font} onChange={(e) => updateLayer(selected.id, { font: e.target.value as PrintInviteLayer["font"] })}><option value="serif">{t("Классический", "Classic")}</option><option value="script">{t("Рукописный", "Script")}</option><option value="sans">{t("Современный", "Modern")}</option></select></label><label>{t("Размер, пт", "Size, pt")}<input type="number" min="7" max="70" value={selected.fontSize} onChange={(e) => updateLayer(selected.id, { fontSize: clamp(Number(e.target.value) || 7, 7, 70) })} /></label></div>
            <label>{t("Цвет текста", "Text color")}<div className="pi-color-row"><input type="color" value={selected.color} aria-label={t("Выбрать любой цвет", "Pick any color")} onChange={(e) => updateLayer(selected.id, { color: e.target.value })} /><span>{selected.color.toUpperCase()}</span></div></label>
            <div className="pi-color-presets" aria-label={t("Готовые цвета", "Preset colors")}>{[template.ink, template.accent, "#252525", "#ffffff", "#864d5a", "#567b6a"].map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={t(`Цвет ${color}`, `Color ${color}`)} title={color} className={selected.color.toLowerCase() === color.toLowerCase() ? "active" : ""} style={{ backgroundColor: color }} onClick={() => updateLayer(selected.id, { color })} />)}</div>
            <label>{t("Выравнивание", "Alignment")}<select value={selected.align} onChange={(e) => updateLayer(selected.id, { align: e.target.value as PrintInviteLayer["align"] })}><option value="left">{t("Слева", "Left")}</option><option value="center">{t("По центру", "Center")}</option><option value="right">{t("Справа", "Right")}</option></select></label>
          </> : selected.kind === "photo" ? <>
            <div className="pi-photo-selected"><img src={`/api/asset/${eventId}/${selected.assetId}`} alt={t("Выбранная фотография", "Selected photo")} /><div><strong>{assets.find((asset) => asset.id === selected.assetId)?.alt ?? t("Фотография", "Photo")}</strong><button type="button" onClick={() => openPhotoPicker(selected.id)} disabled={uploading}>{t("Заменить фотографию", "Replace photo")}</button></div></div>
            <div className="pi-two"><label>{t("Кадрирование", "Fit")}<select value={selected.fit ?? "cover"} onChange={(e) => updateLayer(selected.id, { fit: e.target.value as "cover" | "contain" })}><option value="cover">{t("Заполнить рамку", "Fill the frame")}</option><option value="contain">{t("Показать целиком", "Show the whole photo")}</option></select></label><label>{t("Форма", "Shape")}<select value={selected.shape ?? "rounded"} onChange={(e) => updateLayer(selected.id, { shape: e.target.value as "square" | "rounded" | "circle" })}><option value="square">{t("Прямоугольная", "Rectangle")}</option><option value="rounded">{t("С мягкими углами", "Rounded corners")}</option><option value="circle">{t("Круглая", "Circle")}</option></select></label></div>
            <button type="button" className="pi-fill-photo" onClick={() => fillPageWithPhoto(selected.id)}>{t("Сделать фото фоном страницы", "Use photo as page background")}</button>
          </> : <div className="pi-decor-picker">{PRINT_INVITE_DECOR.map((item) => <button type="button" key={item.id} className={selected.decor === item.id ? "active" : ""} onClick={() => updateLayer(selected.id, { decor: item.id })}><img src={`/media/invite-print/${item.file}`} alt="" />{item.name}</button>)}</div>}
          <div className="pi-two"><label>{t("Слева, %", "Left, %")}<input type="number" min="0" max={100 - selected.w} value={Math.round(selected.x)} onChange={(e) => updateLayer(selected.id, { x: clamp(Number(e.target.value) || 0, 0, 100 - selected.w) })} /></label><label>{t("Сверху, %", "Top, %")}<input type="number" min="0" max={100 - selected.h} value={Math.round(selected.y)} onChange={(e) => updateLayer(selected.id, { y: clamp(Number(e.target.value) || 0, 0, 100 - selected.h) })} /></label></div>
          <div className="pi-two"><label>{t("Ширина, %", "Width, %")}<input type="number" min="5" max="100" value={Math.round(selected.w)} onChange={(e) => updateLayer(selected.id, { w: clamp(Number(e.target.value) || 5, 5, 100 - selected.x) })} /></label><label>{t("Высота, %", "Height, %")}<input type="number" min="3" max="100" value={Math.round(selected.h)} onChange={(e) => updateLayer(selected.id, { h: clamp(Number(e.target.value) || 3, 3, 100 - selected.y) })} /></label></div>
          {selected.kind !== "text" ? <label>{t("Поворот, °", "Rotation, °")}<input type="range" min="-180" max="180" value={selected.rotation} onChange={(e) => updateLayer(selected.id, { rotation: Number(e.target.value) })} /><span className="pi-range-value">{selected.rotation}°</span></label> : null}
          <div className="pi-order-row"><button type="button" onClick={() => moveLayer(selected.id, -1)}>{t("← На слой ниже", "← Send backward")}</button><button type="button" onClick={() => moveLayer(selected.id, 1)}>{t("На слой выше →", "Bring forward →")}</button></div>
          <label className="pi-check"><input type="checkbox" checked={selected.hidden} onChange={(e) => updateLayer(selected.id, { hidden: e.target.checked })} /> {t("Скрыть элемент", "Hide element")}</label>
        </section> : <section className="pi-control-card"><p>{t("Выберите элемент на открытке или в списке, чтобы изменить его.", "Select an element on the card or in the list to edit it.")}</p></section>}
      </aside>
    </div>
  </div>;
}
