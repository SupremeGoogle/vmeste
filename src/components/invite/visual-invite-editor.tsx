"use client";

/**
 * Визуальный редактор приглашения — «как в Тильде»: открывается сама
 * страница, щелчок по тексту правит его на месте, по фотографии — открывает
 * выбор, по цвету палитры — выбор цвета.
 *
 * Начало положил редактор «Эвергрина»; здесь он общий для всех шаблонов.
 * Страница живёт во фрейме (`/invite/canvas`) и сообщает о правках через
 * postMessage; сохраняет всё серверное действие страницы с проверкой прав
 * и схемы блока. После действий, меняющих структуру, фрейм перезагружается
 * и возвращается к тому же месту прокрутки.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import type { PickerAsset } from "@/components/invite/image-picker";
import { EVERGREEN_SAMPLE_IMAGES } from "@/lib/invite-templates/evergreen-assets";
import { PEARL_SAMPLE_IMAGES } from "@/lib/invite-templates/pearl-assets";
import { PROMISE_SAMPLE_IMAGES } from "@/lib/invite-templates/promise-assets";
import { SILK_SAMPLE_IMAGES } from "@/lib/invite-templates/silk-assets";
import { TILI_SAMPLE_IMAGES } from "@/lib/invite-templates/tili-assets";
import { TUSCANY_SAMPLE_IMAGES } from "@/lib/invite-templates/tuscany-assets";

type SaveResult = { ok: true } | { ok: false; message: string };
type Target = { kind: "image" | "link" | "color"; blockId: string; path: string; current: string };
export type BlockAction = "up" | "down" | "hide" | "show" | "add-detail" | "remove-detail";

const SAMPLES: Record<string, readonly string[]> = {
  evergreen: EVERGREEN_SAMPLE_IMAGES,
  pearl: PEARL_SAMPLE_IMAGES,
  promise: PROMISE_SAMPLE_IMAGES,
  silk: SILK_SAMPLE_IMAGES,
  tili: TILI_SAMPLE_IMAGES,
  tuscany: TUSCANY_SAMPLE_IMAGES,
};

export function VisualInviteEditor({
  eventId,
  template,
  canvasSrc,
  publicHref,
  advancedHref,
  assets,
  audio,
  musicUrl,
  hidden,
  saveField,
  blockAction,
  saveMusic,
}: {
  eventId: string;
  template: string;
  canvasSrc: string;
  publicHref: string;
  advancedHref: string;
  assets: PickerAsset[];
  audio: PickerAsset[];
  musicUrl: string;
  hidden: { id: string; label: string }[];
  saveField: (input: { blockId: string; path: string; value: string }) => Promise<SaveResult>;
  blockAction: (input: { blockId: string; action: BlockAction; index?: number }) => Promise<SaveResult>;
  saveMusic: (url: string) => Promise<SaveResult>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const scrollY = useRef(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<PickerAsset[]>(() => [
    ...(SAMPLES[template] ?? []).map((url, index) => ({ id: `sample-${index}`, url, alt: `Фотография шаблона ${index + 1}` })),
    ...assets,
  ]);
  const [songs, setSongs] = useState(audio);
  const [music, setMusic] = useState(musicUrl);
  const [musicOpen, setMusicOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Нажмите на текст, фотографию или цвет — изменения сохраняются сами");
  const [revision, setRevision] = useState(0);
  const [saving, startSaving] = useTransition();

  const reload = () => setRevision((value) => value + 1);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as Record<string, unknown> | null;
      if (!message || message.source !== "invite-canvas") return;
      const blockId = typeof message.blockId === "string" ? message.blockId : "";
      const path = typeof message.path === "string" ? message.path : "";
      const current = typeof message.current === "string" ? message.current : "";

      if (message.kind === "scroll" && typeof message.y === "number") scrollY.current = message.y;
      if (message.kind === "reload") reload();

      if (message.kind === "text-edit" && blockId && path && typeof message.value === "string") {
        const value = message.value;
        setNotice("Сохраняю…");
        startSaving(async () => {
          const result = await saveField({ blockId, path, value });
          setNotice(result.ok ? "Сохранено" : result.message);
          // Отказ — вернуть на странице то, что действительно сохранено.
          if (!result.ok) reload();
        });
      }

      if ((message.kind === "image-edit" || message.kind === "link-edit" || message.kind === "color-edit") && blockId && path) {
        const kind = message.kind === "image-edit" ? "image" : message.kind === "link-edit" ? "link" : "color";
        setTarget({ kind, blockId, path, current });
        setDraft(current);
      }

      if (message.kind === "block-action" && blockId && (message.action === "up" || message.action === "down" || message.action === "hide" || message.action === "add-detail" || message.action === "remove-detail")) {
        const action = message.action as BlockAction;
        const index = typeof message.index === "number" ? message.index : undefined;
        setNotice(action === "add-detail" ? "Добавляю новую деталь…" : action === "remove-detail" ? "Удаляю деталь…" : "Обновляю разделы…");
        startSaving(async () => {
          const result = await blockAction({ blockId, action, index });
          setNotice(result.ok ? (action === "add-detail" ? "Деталь добавлена — нажмите на неё, чтобы заполнить" : action === "remove-detail" ? "Деталь удалена" : action === "hide" ? "Раздел скрыт — вернуть можно кнопкой «Скрытые разделы»" : "Сохранено") : result.message);
          if (result.ok) reload();
        });
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [blockAction, saveField]);

  const choices = (() => {
    if (!target?.current || target.kind !== "image" || items.some((item) => item.url === target.current)) return items;
    return [{ id: "current", url: target.current, alt: "Текущее изображение" }, ...items];
  })();

  async function commit(value: string) {
    if (!target) return;
    setBusy(true);
    setNotice("Сохраняю…");
    const result = await saveField({ blockId: target.blockId, path: target.path, value });
    setBusy(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    frame.current?.contentWindow?.postMessage(
      { source: "invite-editor", kind: `${target.kind}-saved`, blockId: target.blockId, path: target.path, value },
      "*",
    );
    setNotice("Сохранено");
    setTarget(null);
    // Перезагрузка нужна не только для новой раскладки: пустой слот — это
    // не <img>, а понятная плашка «Добавить фото». После выбора/удаления
    // сервер заново нарисует правильный элемент и вернёт прежний скролл.
    if (target.kind === "image") reload();
  }

  async function uploadFile(file: File): Promise<PickerAsset> {
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
    return done.asset as PickerAsset;
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setNotice("Загружаю фотографию…");
    try {
      const asset = await uploadFile(file);
      setItems((current) => [asset, ...current]);
      await commit(asset.url);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не получилось загрузить фотографию");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function chooseMusic(url: string) {
    setBusy(true);
    setNotice("Сохраняю музыку…");
    const result = await saveMusic(url);
    setBusy(false);
    setNotice(result.ok ? (url ? "Музыка сохранена" : "Музыка выключена") : result.message);
    if (result.ok) {
      setMusic(url);
      setMusicOpen(false);
      reload();
    }
  }

  async function uploadSong(file: File) {
    setBusy(true);
    setNotice("Загружаю песню…");
    try {
      const asset = await uploadFile(file);
      setSongs((current) => [asset, ...current]);
      await chooseMusic(asset.url);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не получилось загрузить песню");
    } finally {
      setBusy(false);
      if (audioInput.current) audioInput.current.value = "";
    }
  }

  function showBlock(id: string) {
    startSaving(async () => {
      const result = await blockAction({ blockId: id, action: "show" });
      setNotice(result.ok ? "Раздел снова на странице" : result.message);
      if (result.ok) reload();
    });
  }

  const [hiddenOpen, setHiddenOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-800 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stone-900 px-4 py-3 text-white sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-medium">Редактирование на странице</p>
          <p className={`mt-0.5 text-xs ${saving || busy ? "text-amber-200" : "text-white/60"}`}>{notice}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hidden.length > 0 && (
            <button type="button" onClick={() => setHiddenOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
              Скрытые разделы: {hidden.length}
            </button>
          )}
          <button type="button" onClick={() => setMusicOpen(true)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
            {music ? "♪ Музыка" : "♪ Добавить музыку"}
          </button>
          <a href={advancedHref} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Разделы и поля</a>
          <a href={publicHref} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-medium text-stone-900">Открыть как гость ↗</a>
        </div>
      </div>

      {hiddenOpen && hidden.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-white/10 bg-stone-900/80 px-4 py-3 sm:px-5">
          {hidden.map((block) => (
            <button key={block.id} type="button" onClick={() => showBlock(block.id)} className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white hover:bg-white/10">
              + {block.label}
            </button>
          ))}
        </div>
      )}

      <div className={`mx-auto p-2 sm:p-6 ${template === "tili" ? "max-w-[1100px]" : "max-w-[760px]"}`}>
        <iframe
          key={revision}
          ref={frame}
          src={`${canvasSrc}?v=${revision}`}
          onLoad={() => {
            // Перезагрузка после правки не должна уносить наверх длинной страницы.
            if (scrollY.current > 0) {
              frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll", y: scrollY.current }, "*");
            }
          }}
          title="Визуальный редактор приглашения"
          className="block h-[78vh] min-h-[560px] w-full rounded-xl bg-white shadow-2xl"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTarget(null); }}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg text-stone-900">
                {target.kind === "image" ? "Заменить фотографию" : target.kind === "link" ? "Ссылка" : "Цвет палитры"}
              </h2>
              <button type="button" disabled={busy} onClick={() => setTarget(null)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">Закрыть</button>
            </div>

            {target.kind === "image" && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void commit("")}
                  className={`flex min-h-32 flex-col items-center justify-center rounded-xl border-2 px-4 text-center ${target.current ? "border-stone-200 text-stone-600 hover:border-red-300 hover:bg-red-50" : "border-stone-900 bg-stone-50 text-stone-900"}`}
                >
                  <span className="text-xl">×</span>
                  <span className="mt-1 text-sm">Без фотографии</span>
                </button>
                {choices.map((asset) => (
                  <button key={asset.id} type="button" disabled={busy} onClick={() => void commit(asset.url)} className={`group overflow-hidden rounded-xl border-2 text-left ${target.current === asset.url ? "border-stone-900" : "border-stone-200"}`}>
                    {/* Картинки отдаёт защищённый маршрут, размеры заранее неизвестны. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.alt} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]" />
                    <span className="block truncate px-3 py-2 text-xs text-stone-600">{asset.alt}</span>
                  </button>
                ))}
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 px-4 text-center text-sm text-stone-500 hover:border-stone-500">
                  <span className="text-2xl">＋</span><span className="mt-1">Загрузить свою</span>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
                </label>
                <p className="col-span-full text-xs leading-5 text-stone-500">
                  Фотографию можно убрать сейчас и вернуть позже: пустое место останется доступным в редакторе.
                </p>
              </div>
            )}

            {target.kind === "link" && (
              <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void commit(draft.trim()); }}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="https://…"
                  autoFocus
                  className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
                />
                <p className="text-xs text-stone-500">Вставьте ссылку на карту целиком. Пустое поле убирает кнопку у гостей.</p>
                <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50">Сохранить</button>
              </form>
            )}

            {target.kind === "color" && (
              <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={(event) => { event.preventDefault(); void commit(draft); }}>
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(draft) ? draft : "#e8dbc8"} onChange={(event) => setDraft(event.target.value)} className="h-14 w-20 cursor-pointer rounded-lg border border-stone-300" />
                <input value={draft} onChange={(event) => setDraft(event.target.value)} className="w-32 rounded-lg border border-stone-300 px-3 py-2.5 font-mono text-base" />
                <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50">Сохранить</button>
              </form>
            )}
          </div>
        </div>
      )}

      {musicOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setMusicOpen(false); }}>
          <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg text-stone-900">Музыка приглашения</h2>
                <p className="mt-1 text-sm text-stone-500">Играет тихо после того, как гость открыл приглашение; в углу есть кнопка, чтобы выключить.</p>
              </div>
              <button type="button" disabled={busy} onClick={() => setMusicOpen(false)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">Закрыть</button>
            </div>
            <ul className="mt-4 space-y-2">
              {songs.map((song) => (
                <li key={song.id} className={`flex items-center gap-3 rounded-xl border p-3 ${music === song.url ? "border-stone-900" : "border-stone-200"}`}>
                  <audio src={song.url} controls preload="none" className="h-9 min-w-0 flex-1" />
                  <button type="button" disabled={busy || music === song.url} onClick={() => void chooseMusic(song.url)} className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-40">
                    {music === song.url ? "Играет" : "Выбрать"}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border-2 border-dashed border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-500">
                ＋ Загрузить песню (MP3)
                <input ref={audioInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSong(file); }} />
              </label>
              {music && (
                <button type="button" disabled={busy} onClick={() => void chooseMusic("")} className="rounded-lg px-4 py-2.5 text-sm text-red-800 hover:bg-red-50">
                  Без музыки
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
