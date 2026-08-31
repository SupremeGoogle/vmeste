"use client";

/**
 * Выбор картинки для блока: галерея загруженного плюс загрузка нового.
 *
 * Клиентский компонент — единственный в конструкторе, и по необходимости:
 * файл уходит в хранилище напрямую по подписанной ссылке, а это два
 * запроса и обработка ошибок между ними. Формой такое не сделать.
 *
 * Значение хранится в скрытом поле обычной формы — снаружи это по-прежнему
 * поле, которое сохраняется вместе с остальным блоком, а не отдельной
 * кнопкой. Одно сохранение на блок: два — и человек уходит со страницы,
 * нажав только одно.
 */
import { useRef, useState } from "react";

export type PickerAsset = { id: string; url: string; alt: string };

export function ImagePicker({
  eventId, name, value, assets,
}: {
  eventId: string;
  /** Имя поля формы, куда ляжет адрес выбранной картинки. */
  name: string;
  value: string;
  assets: PickerAsset[];
}) {
  const [items, setItems] = useState(assets);
  const [chosen, setChosen] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const presign = await fetch(`/api/app/events/${eventId}/assets/presign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, bytes: file.size }),
      }).then((r) => r.json());

      if (!presign.ok) throw new Error(presign.message);

      // Файл идёт мимо нашего сервера — прямо в хранилище.
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Хранилище не приняло файл. Попробуйте ещё раз.");

      const done = await fetch(`/api/app/events/${eventId}/assets/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: presign.key, alt: file.name.replace(/\.[^.]+$/, "") }),
      }).then((r) => r.json());

      if (!done.ok) throw new Error(done.message);

      setItems((current) => [done.asset, ...current]);
      setChosen(done.asset.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не получилось загрузить.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={chosen} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChosen("")}
          className={`h-16 w-16 rounded-lg border-2 text-xs text-stone-500 ${
            chosen === "" ? "border-stone-900" : "border-stone-200"
          }`}
        >
          без фото
        </button>

        {items.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => setChosen(asset.url)}
            title={asset.alt}
            className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
              chosen === asset.url ? "border-stone-900" : "border-stone-200"
            }`}
          >
            {/* Обычный <img>: next/image здесь не нужен — картинка уже
                нашего размера, а его настройка потянула бы за собой
                конфигурацию доменов ради одной миниатюры. */}
            <img src={asset.url} alt={asset.alt} className="h-full w-full object-cover" />
          </button>
        ))}

        <label
          className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 ${
            busy ? "opacity-50" : "hover:border-stone-500"
          }`}
        >
          {busy ? "…" : "+ файл"}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      {chosen !== "" && (
        <p className="mt-2 truncate font-mono text-[11px] text-stone-400">{chosen}</p>
      )}
    </div>
  );
}
