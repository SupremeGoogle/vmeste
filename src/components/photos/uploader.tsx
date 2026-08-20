"use client";

/**
 * Загрузка фотографий с телефона.
 *
 * Превью делается прямо в браузере (PLAN.md §4.4): `createImageBitmap` +
 * canvas → WebP ~400 px. Причин две. Первая: сервер файла не видит вообще —
 * он идёт в хранилище напрямую, — и уменьшить его больше некому, без
 * второго сервиса или очереди. Вторая: это же лечит HEIC с айфонов
 * (§5.5) — в WebP его увидит и организатор на Windows.
 *
 * Если декодировать не удалось, фото всё равно принимается: потерять
 * единственный кадр хуже, чем показать его в модерации без превью.
 *
 * Файлы идут по одному, а не пачкой: у телефона в кармане и память
 * скромная, и связь рвётся — на середине пачки половина оказалась бы
 * загруженной, а половина потерянной без следа.
 */
import { useRef, useState } from "react";

const THUMB_SIZE = 400;

type ItemState = "waiting" | "preview" | "uploading" | "done" | "error";

type Item = {
  id: string;
  name: string;
  state: ItemState;
  message?: string;
  previewUrl?: string;
};

/** Уменьшенная копия для модерации и ленты. null — браузер не смог. */
async function makeThumb(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, THUMB_SIZE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.82);
    });
  } catch {
    return null;
  }
}

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

export function PhotoUploader({
  token,
  left: initialLeft,
  limit,
}: {
  token: string;
  left: number;
  limit: number;
}) {
  const [left, setLeft] = useState(initialLeft);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function update(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadOne(file: File, id: string): Promise<boolean> {
    update(id, { state: "preview" });

    const presign = await fetch("/api/guest/photos/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, contentType: file.type, bytes: file.size }),
    });
    if (!presign.ok) {
      const body = await presign.json().catch(() => ({ error: "Не получилось загрузить" }));
      update(id, { state: "error", message: body.error });
      return false;
    }
    const ticket = await presign.json();

    const [thumb, size] = await Promise.all([makeThumb(file), imageSize(file)]);
    update(id, {
      state: "uploading",
      previewUrl: thumb ? URL.createObjectURL(thumb) : undefined,
    });

    // Оригинал обязателен, превью — нет.
    const put = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!put.ok) {
      update(id, { state: "error", message: "Файл не долетел — попробуйте ещё раз" });
      return false;
    }

    let previewOk = false;
    if (thumb) {
      const putThumb = await fetch(ticket.thumbUploadUrl, {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: thumb,
      });
      previewOk = putThumb.ok;
    }

    const complete = await fetch("/api/guest/photos/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        storageKey: ticket.storageKey,
        thumbKey: ticket.thumbKey,
        width: size.width,
        height: size.height,
        previewOk,
      }),
    });
    if (!complete.ok) {
      const body = await complete.json().catch(() => ({ error: "Не получилось загрузить" }));
      update(id, { state: "error", message: body.error });
      return false;
    }

    const result = await complete.json();
    setLeft(result.left);
    update(id, {
      state: "done",
      message: previewOk ? "Отправлено на модерацию" : "Отправлено, превью не получилось",
    });
    return true;
  }

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    if (inputRef.current) inputRef.current.value = "";

    const queued = files.slice(0, Math.max(0, left)).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));

    setItems((prev) => [
      ...queued.map(({ file, id }) => ({ id, name: file.name, state: "waiting" as ItemState })),
      ...prev,
    ]);

    if (files.length > queued.length) {
      // Выбрали больше, чем осталось: молча обрезать нельзя — гость решит,
      // что всё ушло.
      setItems((prev) => [
        {
          id: `over-${Date.now()}`,
          name: `Ещё ${files.length - queued.length} фото не приняты`,
          state: "error" as ItemState,
          message: `Больше ${limit} фотографий не принимаем`,
        },
        ...prev,
      ]);
    }

    setBusy(true);
    for (const { file, id } of queued) {
      await uploadOne(file, id);
    }
    setBusy(false);
  }

  return (
    <div>
      <label className="block rounded-2xl border border-dashed border-stone-400 px-6 py-8 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          disabled={busy || left <= 0}
          onChange={onFiles}
          className="sr-only"
        />
        <span className="block text-lg">
          {left > 0 ? "Выбрать фотографии" : "Больше фотографий не принимаем"}
        </span>
        <span className="mt-1 block text-sm text-stone-500">
          {left > 0 ? `Осталось ${left} из ${limit}` : `Вы прислали все ${limit}`}
        </span>
      </label>

      {busy ? (
        <p className="mt-3 text-center text-sm text-stone-500">
          Отправляем… не закрывайте страницу.
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-stone-200 px-3 py-2 text-sm"
          >
            {item.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.previewUrl} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <span className="h-12 w-12 rounded bg-stone-100" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.name}</span>
              <span
                className={
                  item.state === "error" ? "block text-red-700" : "block text-stone-500"
                }
              >
                {item.message ?? STATE_LABEL[item.state]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATE_LABEL: Record<ItemState, string> = {
  waiting: "В очереди",
  preview: "Готовим превью",
  uploading: "Отправляем",
  done: "Отправлено на модерацию",
  error: "Не получилось",
};
