"use client";
import { useState } from "react";
import { defaultPhotoAdjustment, type PhotoAdjustment } from "@/lib/invite-personalization";
import { useT } from "@/components/i18n-provider";

export function PhotoControls({ src, value, onChange, ratio = 4 / 3 }: { src: string; value: PhotoAdjustment; onChange: (value: PhotoAdjustment) => void; ratio?: number }) {
  const [phone, setPhone] = useState(false);
  const t = useT();
  const set = (key: keyof PhotoAdjustment, next: number | string | boolean) => onChange({ ...value, [key]: next });
  return <div className="space-y-3">
    <div className="flex flex-wrap justify-between gap-2 text-xs text-stone-600"><span>{t("Переместите кадр пальцем или настройте ползунками", "Drag the photo to reframe it or use the sliders")}</span><button type="button" className="underline" onClick={() => setPhone(!phone)}>{phone ? t("Пропорции блока", "Section proportions") : t("Вертикальный кадр", "Portrait frame")}</button></div>
    <div className="relative mx-auto max-h-80 w-full touch-none overflow-hidden rounded-xl bg-stone-100" style={{ aspectRatio: phone ? "3 / 4" : String(Math.max(.5, Math.min(3, ratio))), maxWidth: phone ? 230 : 480 }} onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={(e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const box = e.currentTarget.getBoundingClientRect();
      onChange({ ...value, x: Math.round(Math.max(0, Math.min(100, (e.clientX - box.left) / box.width * 100))), y: Math.round(Math.max(0, Math.min(100, (e.clientY - box.top) / box.height * 100))) });
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={t("Предпросмотр кадрирования", "Framing preview")} draggable={false} className="absolute inset-0 h-full w-full select-none" style={{ objectFit: value.fit, objectPosition: `${value.x}% ${value.y}%`, transform: `scale(${value.zoom})`, filter: `brightness(${value.brightness * (1 - value.darkness / 100)}%) ${value.original ? "" : "saturate(.65) sepia(.08)"}` }} />
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {([['x', t('По горизонтали', 'Horizontal'), 0, 100, 1], ['y', t('По вертикали', 'Vertical'), 0, 100, 1], ['zoom', t('Масштаб', 'Zoom'), 1, 2, .05], ['brightness', t('Яркость', 'Brightness'), 50, 150, 1], ['darkness', t('Затемнение', 'Darken'), 0, 60, 1]] as const).map(([key, label, min, max, step]) => <label key={key} className="text-xs text-stone-600">{label} · {value[key]}<input className="mt-1 block w-full accent-stone-800" type="range" min={min} max={max} step={step} value={value[key]} onChange={(e) => set(key, Number(e.target.value))} /></label>)}
      <label className="text-xs text-stone-600">{t("Размещение", "Fit")}<select className="mt-1 block w-full rounded-lg border p-2" value={value.fit} onChange={(e) => set("fit", e.target.value)}><option value="cover">{t("Заполнить рамку", "Fill the frame")}</option><option value="contain">{t("Показать фото целиком", "Show the whole photo")}</option></select></label>
    </div>
    <div className="flex flex-wrap justify-between gap-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={value.original} onChange={(e) => set("original", e.target.checked)} />{t("Естественные цвета без фильтра", "Natural colors, no filter")}</label><button type="button" onClick={() => onChange(defaultPhotoAdjustment())} className="text-stone-500 underline">{t("Сбросить кадрирование", "Reset framing")}</button></div>
  </div>;
}
