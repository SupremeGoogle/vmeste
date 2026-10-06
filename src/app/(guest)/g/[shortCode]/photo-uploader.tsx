"use client";

/**
 * Загрузка фотографий гостя. Та же схема, что и на гостевой странице
 * фото (`guest-html/photos-html.ts`): кадр ужимается прямо в телефоне до
 * 2560 px, файл уходит в хранилище по подписанной ссылке, сервер сам
 * перекодирует его в WebP. По одному файлу за раз — у телефона память
 * скромная, а связь в зале рвётся.
 */
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { EASE_OUT, SPRING } from "@/components/motion/motion";

type Item = { key: string; name: string; preview: string | null; state: string; error: boolean; done: boolean };

const STATUS: Record<string, string> = { PENDING: "на проверке", APPROVED: "опубликовано", REJECTED: "не подошло" };
const MAX_SIDE = 2560;

async function shrink(file: File): Promise<{ blob: Blob; type: string; preview: string | null }> {
  const type = file.type || "application/octet-stream";
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight, 1));
      const keep = { blob: file as Blob, type, preview: url };
      if (scale === 1 && file.size < 1536 * 1024 && (type === "image/jpeg" || type === "image/webp")) return resolve(keep);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(keep);
      // Белая подложка: прозрачный PNG в JPEG иначе станет чёрным.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob && blob.size < file.size ? { blob, type: "image/jpeg", preview: url } : keep), "image/jpeg", 0.9);
    };
    // HEIC в Chrome и прочие форматы, которые браузер не открыл, — шлём как есть.
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, type, preview: null });
    };
    img.src = url;
  });
}

async function post(url: string, payload: object) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "не получилось");
  return body;
}

export function PhotoUploader({ eventId, left: initialLeft, limit, mine }: { eventId: string; left: number; limit: number; mine: { id: string; status: string }[] }) {
  const [left, setLeft] = useState(initialLeft);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const patch = (key: string, next: Partial<Item>) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...next } : item)));

  async function upload(file: File, key: string) {
    try {
      patch(key, { state: "готовим" });
      const prepared = await shrink(file);
      if (prepared.preview) patch(key, { preview: prepared.preview });
      const ticket = await post("/api/guest/photos/presign", { eventId, contentType: prepared.type, bytes: prepared.blob.size });
      patch(key, { state: "отправляем" });
      const put = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "content-type": prepared.type }, body: prepared.blob });
      if (!put.ok) throw new Error("файл не долетел — попробуйте ещё раз");
      patch(key, { state: "обрабатываем" });
      const done = await post("/api/guest/photos/complete", { eventId, storageKey: ticket.storageKey });
      setLeft(done.left);
      patch(key, { state: "отправлено", done: true, preview: prepared.preview ?? `/api/media/${eventId}/${done.photoId}` });
    } catch (error) {
      patch(key, { state: (error as Error).message || "не получилось", error: true });
    }
  }

  async function onPick(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (input.current) input.current.value = "";
    if (list.length === 0) return;
    const accepted = list.slice(0, Math.max(0, left));
    const queued = accepted.map((file, i) => ({ key: `${Date.now()}-${i}`, name: file.name, preview: null, state: "в очереди", error: false, done: false }));
    // Молча обрезать нельзя: гость решит, что ушло всё.
    const rejected = list.length - accepted.length;
    setItems((prev) => [
      ...queued,
      ...(rejected > 0 ? [{ key: `skip-${Date.now()}`, name: `Ещё ${rejected} фото не приняты`, preview: null, state: `больше ${limit} не принимаем`, error: true, done: false }] : []),
      ...prev,
    ]);
    setBusy(true);
    for (const [i, file] of accepted.entries()) await upload(file, queued[i].key);
    setBusy(false);
  }

  const used = limit - left;

  return (
    <div className="mt-5">
      <motion.label
        whileTap={left > 0 ? { scale: 0.985 } : undefined}
        className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-5 py-6 text-center transition-colors ${
          left > 0 ? "border-gold-soft/70 bg-paper/60 hover:bg-paper" : "cursor-not-allowed border-line opacity-70"
        }`}
      >
        <input ref={input} type="file" accept="image/*,.heic,.heif" multiple disabled={left <= 0 || busy} onChange={(e) => onPick(e.target.files)} className="sr-only" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.5" r="3.5" /></svg>
        </span>
        <span className="text-[17px] font-medium">{left > 0 ? (busy ? "Отправляем…" : "Выбрать фотографии") : "Вы прислали все фото"}</span>
        <span className="flex items-center gap-1" aria-label={`Отправлено ${used} из ${limit}`}>
          {Array.from({ length: limit }, (_, i) => (
            <motion.span key={i} className="block h-1.5 w-6 rounded-full" animate={{ backgroundColor: i < used ? "#8b6f47" : "#e6ddd1" }} transition={{ duration: 0.3 }} />
          ))}
        </span>
        <span className="text-sm text-muted">{left > 0 ? `Осталось ${left} из ${limit}` : `Все ${limit} отправлены — спасибо!`}</span>
      </motion.label>

      <AnimatePresence initial={false}>
        {items.length > 0 ? (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2 overflow-hidden">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.key}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
                >
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-line/50 bg-cover bg-center" style={item.preview ? { backgroundImage: `url(${item.preview})` } : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{item.name}</span>
                    <span className={`text-sm ${item.error ? "text-[#8a2b2b]" : "text-muted"}`}>{item.state}</span>
                  </span>
                  {item.done ? (
                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING} width="22" height="22" viewBox="0 0 24 24" className="shrink-0 text-gold" aria-hidden>
                      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15" />
                      <motion.path d="M7 12.5l3.2 3L17 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.1 }} />
                    </motion.svg>
                  ) : null}
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : null}
      </AnimatePresence>

      {mine.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-[12px] tracking-[0.22em] text-muted uppercase">Ваши фотографии</h4>
          <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
            {mine.map((photo) => (
              <li key={photo.id} className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- снимки отдаёт своё API */}
                <img src={`/api/media/${eventId}/${photo.id}`} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                <span className="absolute inset-x-1 bottom-1 rounded-md bg-ink/60 px-1.5 py-0.5 text-center text-[11px] text-card backdrop-blur-sm">{STATUS[photo.status] ?? photo.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
