"use client";

/**
 * Предпросмотр импорта: что нашли в файле и что добавим.
 *
 * Показываем всех, а не первых десять: при умном разборе ошибка может
 * сидеть в середине списка, где семья записана одной ячейкой. Строки,
 * которые стоит проверить, подсвечены, и их можно оставить одним
 * фильтром.
 *
 * Это обычная форма: без JS правки и галочки уходят на сервер так же.
 * Скрипт добавляет только фильтр, живой счётчик и автоприменение ролей
 * столбцов.
 */
import { useMemo, useState } from "react";
import { plural } from "@/lib/plural";
import {
  cancelImportAction, confirmImportAction, remapImportAction,
} from "@/app/(app)/app/e/[eventId]/guests/actions";

export type PreviewGuest = {
  key: string;
  sourceRow: number;
  sourceText: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  plusOneAllowed: boolean;
  plusOneName: string | null;
  include: boolean;
  flags: { duplicateInFile: boolean; existing: string | null; review: string | null; fromGroup: boolean };
};

export type PreviewColumn = { index: number; header: string; role: string; samples: string[] };

export type PreviewData = {
  fileName: string;
  sheets: { name: string; hidden: boolean; rows: number }[];
  sheetIndex: number;
  columns: PreviewColumn[];
  roleOptions: { value: string; label: string }[];
  planNote: string;
  planSource: "ai" | "rules";
  guests: PreviewGuest[];
  warnings: string[];
  skippedRows: number;
  ai: { enabled: boolean; used: boolean; failure: string | null };
};

type Filter = "all" | "review" | "excluded";

const letter = (index: number) => {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

export function ImportPreview({ eventId, draftId, data }: { eventId: string; draftId: string; data: PreviewData }) {
  const [include, setInclude] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.guests.map((g) => [g.key, g.include])),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [mappingOpen, setMappingOpen] = useState(data.planSource === "rules" || data.guests.length === 0);
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => {
    const chosen = data.guests.filter((g) => include[g.key]);
    return {
      chosen: chosen.length,
      withPhone: chosen.filter((g) => g.phone).length,
      plusOne: chosen.filter((g) => g.plusOneAllowed).length,
      existing: data.guests.filter((g) => g.flags.existing).length,
      duplicates: data.guests.filter((g) => g.flags.duplicateInFile).length,
      review: data.guests.filter((g) => g.flags.review).length,
      groups: data.guests.filter((g) => g.flags.fromGroup).length,
    };
  }, [data.guests, include]);

  const visible = (guest: PreviewGuest) =>
    filter === "all" || (filter === "review" ? Boolean(guest.flags.review || guest.flags.existing || guest.flags.duplicateInFile) : !include[guest.key]);

  const allOn = data.guests.every((g) => include[g.key]);

  return (
    <section className="rise mt-6 overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">Проверьте перед добавлением</p>
          <h2 className="mt-0.5 truncate text-lg text-stone-900">{data.fileName}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
            data.ai.used ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"
          }`}
          title={data.ai.failure ?? undefined}
        >
          {data.ai.used ? "✨ Разобрано умным помощником" : "Разобрано по правилам"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-stone-200 sm:grid-cols-4">
        {[
          { label: "Добавим", value: stats.chosen, strong: true },
          { label: "С телефоном", value: stats.withPhone },
          { label: "Могут с парой", value: stats.plusOne },
          { label: "Проверить", value: stats.review, warn: stats.review > 0 },
        ].map((tile) => (
          <div key={tile.label} className="bg-white px-5 py-3">
            <p className={`text-2xl tabular-nums ${tile.warn ? "text-amber-700" : "text-stone-900"} ${tile.strong ? "font-semibold" : ""}`}>{tile.value}</p>
            <p className="text-xs text-stone-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 px-5 pt-4">
        {data.ai.enabled && data.ai.failure && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
            Умный помощник не помог ({data.ai.failure}) — разобрали по правилам. Проверьте столбцы ниже.
          </p>
        )}
        {data.planNote && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">✨ {data.planNote}</p>}
        {[...data.warnings, ...(stats.groups > 0 ? [`Из ячеек, где записано несколько людей, получилось ${stats.groups} ${plural(stats.groups, "гость", "гостя", "гостей")}.`] : []), ...(data.skippedRows > 0 ? [`Пропущено строк без имени: ${data.skippedRows}.`] : [])].map((warning) => (
          <p key={warning} className="text-sm text-stone-600">• {warning}</p>
        ))}
      </div>

      {/* ── Как поняли файл ── */}
      <details open={mappingOpen} onToggle={(e) => setMappingOpen(e.currentTarget.open)} className="mx-5 mt-4 rounded-xl border border-stone-200">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-stone-800">
          Как мы поняли файл
          <span className="ml-2 font-normal text-stone-500">
            {data.columns.filter((c) => c.role !== "ignore").length} столбцов · лист «{data.sheets[data.sheetIndex]?.name}»
          </span>
        </summary>
        <form action={remapImportAction} className="border-t border-stone-200 px-4 py-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="draftId" value={draftId} />
          {data.sheets.length > 1 && (
            <label className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
              Лист:
              <select
                name="sheetIndex"
                defaultValue={data.sheetIndex}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                {data.sheets.map((sheet, index) => (
                  <option key={index} value={index}>
                    {sheet.name} ({sheet.rows} стр.){sheet.hidden ? " — скрытый" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.columns.map((column) => (
              <label key={column.index} className={`block rounded-lg border px-3 py-2 ${column.role === "ignore" ? "border-stone-200 bg-stone-50" : "border-stone-300"}`}>
                <span className="flex items-baseline justify-between gap-2 text-xs text-stone-500">
                  <span className="truncate">Столбец {letter(column.index)}{column.header ? ` · «${column.header}»` : ""}</span>
                </span>
                <select
                  name={`role.${column.index}`}
                  defaultValue={column.role}
                  onChange={(e) => {
                    if (data.sheets.length > 1) {
                      // Смена роли не должна заодно менять лист.
                      const sheet = e.currentTarget.form?.elements.namedItem("sheetIndex") as HTMLSelectElement | null;
                      if (sheet) sheet.value = String(data.sheetIndex);
                    }
                    e.currentTarget.form?.requestSubmit();
                  }}
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
                >
                  {data.roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="mt-1 block truncate text-xs text-stone-400">{column.samples.join(" · ") || "пусто"}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500">Поменяли столбец — список пересоберётся. Правки в таблице ниже при этом сбросятся.</p>
            <button className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm">Применить</button>
          </div>
        </form>
      </details>

      {/* ── Гости ── */}
      <form action={confirmImportAction} onSubmit={() => setSubmitting(true)}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="draftId" value={draftId} />

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1 text-sm" role="tablist">
            {([
              ["all", `Все · ${data.guests.length}`],
              ["review", `Проверить · ${stats.review + stats.existing + stats.duplicates}`],
              ["excluded", `Не берём · ${data.guests.length - stats.chosen}`],
            ] as [Filter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1 transition-colors ${filter === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setInclude(Object.fromEntries(data.guests.map((g) => [g.key, !allOn])))}
            className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-900"
          >
            {allOn ? "Снять все" : "Выбрать все"}
          </button>
        </div>

        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {data.guests.map((guest) => {
            const on = include[guest.key];
            const p = `g.${guest.key}.`;
            return (
              <li
                key={guest.key}
                className={`grid gap-2 px-5 py-3 sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-3 ${
                  visible(guest) ? "" : "hidden"
                } ${on ? "" : "bg-stone-50/80"}`}
              >
                <label className="flex items-center gap-2 pt-2 text-sm sm:block">
                  <input
                    type="checkbox"
                    name={`${p}include`}
                    checked={on}
                    onChange={(e) => setInclude((prev) => ({ ...prev, [guest.key]: e.target.checked }))}
                    className="h-4 w-4 accent-stone-900"
                    aria-label={`Добавить ${guest.displayName}`}
                  />
                  <span className="text-xs text-stone-500 sm:hidden">Добавить</span>
                </label>

                <div className={on ? "" : "opacity-60"}>
                  <input
                    name={`${p}name`}
                    defaultValue={guest.displayName}
                    required={on}
                    minLength={2}
                    maxLength={120}
                    aria-label="Имя"
                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-stone-900 hover:border-stone-200 focus:border-stone-400 focus:bg-white"
                  />
                  <div className="mt-1 flex flex-wrap gap-1 px-2">
                    {guest.flags.existing && <Badge tone="blue">Уже в списке</Badge>}
                    {guest.flags.duplicateInFile && <Badge tone="blue">Повтор в файле</Badge>}
                    {guest.flags.review && <Badge tone="amber">{guest.flags.review}</Badge>}
                    <span className="truncate text-xs text-stone-400" title={guest.sourceText}>
                      стр. {guest.sourceRow}
                      {guest.flags.fromGroup || guest.sourceText !== guest.displayName ? ` · «${guest.sourceText}»` : ""}
                    </span>
                  </div>
                </div>

                <div className={`space-y-1 ${on ? "" : "opacity-60"}`}>
                  <input
                    name={`${p}phone`}
                    defaultValue={guest.phone ?? ""}
                    placeholder="Телефон"
                    inputMode="tel"
                    maxLength={40}
                    aria-label="Телефон"
                    className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                  />
                  <PlusOneField prefix={p} guest={guest} />
                </div>

                <textarea
                  name={`${p}note`}
                  defaultValue={guest.note ?? ""}
                  placeholder="Заметка"
                  rows={guest.note && guest.note.length > 60 ? 2 : 1}
                  maxLength={500}
                  aria-label="Заметка"
                  className={`w-full resize-y rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-stone-700 ${on ? "" : "opacity-60"}`}
                />
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white/95 px-5 py-3 backdrop-blur">
          <p className="text-sm text-stone-600">
            Выбрано <b className="text-stone-900">{stats.chosen}</b> из {data.guests.length}
          </p>
          <div className="flex gap-2">
            <button
              formAction={cancelImportAction}
              formNoValidate
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Отмена
            </button>
            <button
              disabled={stats.chosen === 0 || submitting}
              className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Добавляем…" : `Добавить ${stats.chosen} ${plural(stats.chosen, "гостя", "гостя", "гостей")}`}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function PlusOneField({ prefix, guest }: { prefix: string; guest: PreviewGuest }) {
  const [on, setOn] = useState(guest.plusOneAllowed);
  return (
    <div className="flex items-center gap-2">
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-stone-600">
        <input
          type="checkbox"
          name={`${prefix}plusOne`}
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="h-3.5 w-3.5 accent-stone-900"
        />
        +1
      </label>
      <input
        name={`${prefix}plusOneName`}
        defaultValue={guest.plusOneName ?? ""}
        placeholder={on ? "Имя спутника" : "без пары"}
        maxLength={120}
        aria-label="Имя спутника"
        onInput={(e) => {
          if (e.currentTarget.value.trim()) setOn(true);
        }}
        className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1 text-xs"
      />
    </div>
  );
}

function Badge({ tone, children }: { tone: "amber" | "blue"; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone === "amber" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900"}`}>
      {children}
    </span>
  );
}
