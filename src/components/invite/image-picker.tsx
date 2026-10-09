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
import { PhotoControls } from "@/components/invite/photo-controls";
import { defaultPhotoAdjustment, type PhotoAdjustment } from "@/lib/invite-personalization";
import { PRISM_SAMPLE_IMAGES } from "@/lib/invite-templates/prism-assets";
import { CONSTELLATION_SAMPLE_IMAGES } from "@/lib/invite-templates/constellation-assets";
import { EVERGREEN_SAMPLE_IMAGES } from "@/lib/invite-templates/evergreen-assets";
import { PEARL_SAMPLE_IMAGES } from "@/lib/invite-templates/pearl-assets";
import { RUBY_SAMPLE_IMAGES } from "@/lib/invite-templates/ruby-assets";
import { SILK_SAMPLE_IMAGES } from "@/lib/invite-templates/silk-assets";
import { TILI_SAMPLE_IMAGES } from "@/lib/invite-templates/tili-assets";
import { uploadType } from "@/lib/upload-type";
import { TUSCANY_SAMPLE_IMAGES } from "@/lib/invite-templates/tuscany-assets";
import { useT } from "@/components/i18n-provider";

export type PickerAsset = { id: string; url: string; alt: string };

const TEMPLATE_IMAGES = [
  ...PRISM_SAMPLE_IMAGES,
  ...CONSTELLATION_SAMPLE_IMAGES,
  ...EVERGREEN_SAMPLE_IMAGES,
  ...PEARL_SAMPLE_IMAGES,
  ...RUBY_SAMPLE_IMAGES,
  ...SILK_SAMPLE_IMAGES,
  ...TILI_SAMPLE_IMAGES,
  ...TUSCANY_SAMPLE_IMAGES,
] as const;

export function ImagePicker({
  eventId, name, value, assets, adjustment, adjustable = true,
}: {
  eventId: string;
  /** Имя поля формы, куда ляжет адрес выбранной картинки. */
  name: string;
  value: string;
  assets: PickerAsset[];
  adjustment?: PhotoAdjustment;
  /** Показывать «Настроить кадр и цвет». Виш-листу это не нужно. */
  adjustable?: boolean;
}) {
  const t = useT();
  const [items, setItems] = useState<PickerAsset[]>(() =>
    value && !assets.some((asset) => asset.url === value)
      ? [{ id: TEMPLATE_IMAGES.includes(value as (typeof TEMPLATE_IMAGES)[number]) ? "template-sample" : "current-image", url: value, alt: t("Текущая фотография — можно заменить своей", "Current photo — you can replace it with your own") }, ...assets]
      : assets,
  );
  const [chosen, setChosen] = useState(value);
  const [settings, setSettings] = useState(adjustment ?? defaultPhotoAdjustment());
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
        body: JSON.stringify({ contentType: uploadType(file), bytes: file.size }),
      }).then((r) => r.json());

      if (!presign.ok) throw new Error(presign.message);

      // Файл идёт мимо нашего сервера — прямо в хранилище.
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "content-type": uploadType(file) },
        body: file,
      });
      if (!put.ok) throw new Error(t("Хранилище не приняло файл. Попробуйте ещё раз.", "The file couldn’t be uploaded to storage. Please try again."));

      const done = await fetch(`/api/app/events/${eventId}/assets/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: presign.key, alt: file.name.replace(/\.[^.]+$/, "") }),
      }).then((r) => r.json());

      if (!done.ok) throw new Error(done.message);

      setItems((current) => [done.asset, ...current]);
      setChosen(done.asset.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Не получилось загрузить.", "Upload failed."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={chosen} />
      <input type="hidden" name={`${name}Settings`} value={JSON.stringify(settings)} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChosen("")}
          className={`h-16 w-16 rounded-lg border-2 text-xs text-stone-500 ${
            chosen === "" ? "border-stone-900" : "border-stone-200"
          }`}
        >
          {t("без фото", "no photo")}
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
            {/* eslint-disable-next-line @next/next/no-img-element -- миниатюра может быть из защищённого хранилища без заранее известного размера. */}
            <img src={asset.url} alt={asset.alt} className="h-full w-full object-cover" />
          </button>
        ))}

        <label
          className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 ${
            busy ? "opacity-50" : "hover:border-stone-500"
          }`}
        >
          {busy ? "…" : t("+ файл", "+ file")}
          <input
            ref={input}
            type="file"
            accept="image/*,.heic,.heif"
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
      {adjustable && chosen && <details className="mt-3 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer text-sm">{t("Настроить кадр и цвет", "Adjust framing and color")}</summary><div className="mt-3"><PhotoControls src={chosen} value={settings} onChange={setSettings} /></div></details>}
    </div>
  );
}
