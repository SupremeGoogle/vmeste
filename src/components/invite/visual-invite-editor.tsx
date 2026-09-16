"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PickerAsset } from "@/components/invite/image-picker";
import { EVERGREEN_SAMPLE_IMAGES } from "@/lib/invite-templates/evergreen-assets";

type SaveResult = { ok: true } | { ok: false; message: string };
type ImageTarget = { blockId: string; path: string; current: string };

export function VisualInviteEditor({
  eventId,
  canvasSrc,
  publicHref,
  advancedHref,
  assets,
  saveField,
  blockAction,
}: {
  eventId: string;
  canvasSrc: string;
  publicHref: string;
  advancedHref: string;
  assets: PickerAsset[];
  saveField: (input: { blockId: string; path: string; value: string }) => Promise<SaveResult>;
  blockAction: (input: { blockId: string; action: "up" | "down" | "hide" | "add-detail" }) => Promise<SaveResult>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ImageTarget | null>(null);
  const [items, setItems] = useState<PickerAsset[]>(() => [
    ...EVERGREEN_SAMPLE_IMAGES.map((url, index) => ({ id: `evergreen-sample-${index}`, url, alt: `Фотография шаблона ${index + 1}` })),
    ...assets,
  ]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Все изменения сохраняются автоматически");
  const [revision, setRevision] = useState(0);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as Record<string, unknown> | null;
      if (!message || message.source !== "evergreen-canvas") return;

      if (message.kind === "text-edit" && typeof message.blockId === "string" && typeof message.path === "string" && typeof message.value === "string") {
        setNotice("Сохраняю…");
        startSaving(async () => {
          const result = await saveField({ blockId: message.blockId as string, path: message.path as string, value: message.value as string });
          setNotice(result.ok ? "Сохранено" : result.message);
        });
      }

      if (message.kind === "image-edit" && typeof message.blockId === "string" && typeof message.path === "string") {
        setTarget({ blockId: message.blockId, path: message.path, current: typeof message.current === "string" ? message.current : "" });
      }

      if (message.kind === "block-action" && typeof message.blockId === "string" && (message.action === "up" || message.action === "down" || message.action === "hide" || message.action === "add-detail")) {
        setNotice(message.action === "add-detail" ? "Добавляю новую деталь…" : "Обновляю структуру…");
        startSaving(async () => {
          const result = await blockAction({ blockId: message.blockId as string, action: message.action as "up" | "down" | "hide" | "add-detail" });
          setNotice(result.ok ? (message.action === "add-detail" ? "Деталь добавлена — нажмите на неё, чтобы заполнить" : "Сохранено") : result.message);
          if (result.ok) setRevision((value) => value + 1);
        });
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [blockAction, saveField]);

  const choices = (() => {
    if (!target?.current || items.some((item) => item.url === target.current)) return items;
    return [{ id: "current-sample", url: target.current, alt: "Текущее изображение" }, ...items];
  })();

  async function chooseImage(url: string) {
    if (!target) return;
    setBusy(true);
    setNotice("Сохраняю фотографию…");
    const result = await saveField({ blockId: target.blockId, path: target.path, value: url });
    setBusy(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    frame.current?.contentWindow?.postMessage({ source: "evergreen-editor", kind: "image-saved", blockId: target.blockId, path: target.path, value: url }, "*");
    setNotice("Фотография сохранена");
    setTarget(null);
  }

  async function upload(file: File) {
    setBusy(true);
    setNotice("Загружаю фотографию…");
    try {
      const presign = await fetch(`/api/app/events/${eventId}/assets/presign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, bytes: file.size }),
      }).then((response) => response.json());
      if (!presign.ok) throw new Error(presign.message);
      const put = await fetch(presign.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!put.ok) throw new Error("Хранилище не приняло файл");
      const done = await fetch(`/api/app/events/${eventId}/assets/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: presign.key, alt: file.name.replace(/\.[^.]+$/, "") }),
      }).then((response) => response.json());
      if (!done.ok) throw new Error(done.message);
      setItems((current) => [done.asset, ...current]);
      await chooseImage(done.asset.url);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не получилось загрузить фотографию");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[#1a241c] shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111812] px-4 py-3 text-white sm:px-5">
        <div>
          <p className="text-sm font-medium">Редактирование на странице</p>
          <p className={`mt-0.5 text-xs ${saving ? "text-amber-200" : "text-white/55"}`}>{notice}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={advancedHref} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Разделы и поля</a>
          <button type="button" onClick={() => setRevision((value) => value + 1)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Обновить</button>
          <a href={publicHref} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#b8975e] px-3 py-2 text-xs font-medium text-[#111812]">Открыть как гость ↗</a>
        </div>
      </div>
      <div className="mx-auto max-w-[760px] p-3 sm:p-6">
        <iframe
          key={revision}
          ref={frame}
          src={`${canvasSrc}?v=${revision}`}
          title="Визуальный редактор приглашения"
          className="block h-[78vh] min-h-[680px] w-full rounded-xl bg-[#f4f0e8] shadow-2xl"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTarget(null); }}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg text-stone-900">Заменить фотографию</h2><p className="mt-1 text-sm text-stone-500">Выберите загруженную или добавьте новый файл.</p></div>
              <button type="button" disabled={busy} onClick={() => setTarget(null)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">Закрыть</button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {choices.map((asset) => (
                <button key={asset.id} type="button" disabled={busy} onClick={() => void chooseImage(asset.url)} className={`group overflow-hidden rounded-xl border-2 text-left ${target.current === asset.url ? "border-[#1b2b20]" : "border-stone-200"}`}>
                  {/* User uploads are served by the protected asset route; intrinsic dimensions are unknown. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.alt} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]" />
                  <span className="block truncate px-3 py-2 text-xs text-stone-600">{asset.alt}</span>
                </button>
              ))}
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 px-4 text-center text-sm text-stone-500 hover:border-stone-500">
                <span className="text-2xl">＋</span><span className="mt-1">Загрузить свою</span>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
