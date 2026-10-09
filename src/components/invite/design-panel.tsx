"use client";

/**
 * «Цвета и шрифты» — оформление поверх любого шаблона (стандарт, §4).
 *
 * Цвет — один главный тон: шаблон перекрашивается целиком, сохраняя свои
 * светлые и тёмные оттенки (guest-html/invite-style.ts). Шрифты — каждый
 * шрифт шаблона можно заменить на подобранный, все с кириллицей.
 */
import { useState } from "react";
import { useT } from "@/components/i18n-provider";

/** Готовые тона — чтобы не подбирать цвет пипеткой. */
const PRESETS = [
  { name: "Пудра", en: "Blush", hex: "#c98b8b" },
  { name: "Бордо", en: "Burgundy", hex: "#7c1f2b" },
  { name: "Терракота", en: "Terracotta", hex: "#b4583a" },
  { name: "Золото", en: "Gold", hex: "#a57a34" },
  { name: "Шалфей", en: "Sage", hex: "#6f8a62" },
  { name: "Изумруд", en: "Emerald", hex: "#1f5c4a" },
  { name: "Пыльный синий", en: "Dusty blue", hex: "#5b7896" },
  { name: "Лаванда", en: "Lavender", hex: "#8a76a8" },
];

/** Группы шрифтов (`FONT_CHOICES[].kind`) для кабинета на английском. */
const FONT_KIND_EN: Record<string, string> = { Антиква: "Serif", Гротеск: "Sans serif", Рукописный: "Script" };

export function DesignPanel({
  template, accent, fonts, fontChoices, busy, onClose, onAccent, onFont, onReset,
}: {
  template: { accent: string | null; fonts: string[] } | null;
  accent: string | null;
  fonts: Record<string, string>;
  fontChoices: { family: string; kind: string }[];
  busy: boolean;
  onClose: () => void;
  onAccent: (value: string | null) => void;
  onFont: (from: string, to: string) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [custom, setCustom] = useState(accent ?? template?.accent ?? "#a57a34");
  const current = accent ?? template?.accent ?? null;
  const kinds = [...new Set(fontChoices.map((font) => font.kind))];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-2xl text-stone-900">{t("Цвета и шрифты", "Colors & fonts")}</p>
            <p className="mt-1 text-sm text-stone-500">{t("Меняется всё приглашение сразу. Фотографии остаются как есть.", "The whole invitation changes at once. Photos stay as they are.")}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100" aria-label={t("Закрыть", "Close")}>✕</button>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-medium text-stone-900">{t("Главный цвет", "Main color")}</h3>
          <p className="mt-1 text-xs text-stone-500">{t("Все оттенки шаблона — заголовки, кнопки, украшения — подстроятся под выбранный тон.", "All the template’s shades — headings, buttons, decorations — will adapt to the color you pick.")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {template?.accent && (
              <button type="button" disabled={busy} onClick={() => onAccent(null)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${!accent ? "border-stone-900" : "border-stone-200 hover:border-stone-400"}`}>
                <span className="size-4 rounded-full border border-black/10" style={{ background: template.accent }} />
                {t("Как в шаблоне", "Template default")}
              </button>
            )}
            {PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                disabled={busy}
                onClick={() => { setCustom(preset.hex); onAccent(preset.hex); }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${current?.toLowerCase() === preset.hex ? "border-stone-900" : "border-stone-200 hover:border-stone-400"}`}
              >
                <span className="size-4 rounded-full border border-black/10" style={{ background: preset.hex }} />
                {t(preset.name, preset.en)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="color" value={custom} onChange={(event) => setCustom(event.target.value)} className="h-9 w-12 cursor-pointer rounded border border-stone-300" aria-label={t("Свой цвет", "Custom color")} />
            <button type="button" disabled={busy} onClick={() => onAccent(custom)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs hover:bg-stone-50">{t("Применить свой цвет", "Apply custom color")}</button>
          </div>
        </section>

        <section className="mt-7">
          <h3 className="text-sm font-medium text-stone-900">{t("Шрифты", "Fonts")}</h3>
          {!template ? (
            <p className="mt-2 text-xs text-stone-500">{t("Загружаем шрифты шаблона…", "Loading the template’s fonts…")}</p>
          ) : template.fonts.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">{t("У этого шаблона нет сменных шрифтов.", "This template’s fonts can’t be changed.")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {template.fonts.map((family) => (
                <label key={family} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="min-w-40 flex-1 truncate text-stone-700" style={{ fontFamily: `'${family}'` }}>{family}</span>
                  <select
                    value={fonts[family] ?? ""}
                    disabled={busy}
                    onChange={(event) => onFont(family, event.target.value)}
                    className="min-h-9 rounded-lg border border-stone-300 bg-card px-2 text-sm"
                  >
                    <option value="">{t("Как в шаблоне", "Template default")}</option>
                    {kinds.map((kind) => (
                      <optgroup key={kind} label={t(kind, FONT_KIND_EN[kind] ?? kind)}>
                        {fontChoices.filter((font) => font.kind === kind).map((font) => (
                          <option key={font.family} value={font.family}>{font.family}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </section>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <button type="button" disabled={busy || (!accent && Object.keys(fonts).length === 0)} onClick={onReset} className="text-sm text-stone-600 underline underline-offset-2 disabled:opacity-40">
            {t("Вернуть как в шаблоне", "Reset to template")}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white">{t("Готово", "Done")}</button>
        </div>
      </div>
    </div>
  );
}
