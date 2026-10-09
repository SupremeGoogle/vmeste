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
import { countWord } from "@/lib/i18n";
import { useLang, useT } from "@/components/i18n-provider";
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
  const t = useT();
  const lang = useLang();

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
    <section className="rise mt-6 overflow-hidden rounded-2xl border border-stone-300 bg-card shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">{t("Проверьте перед добавлением", "Review before adding")}</p>
          <h2 className="mt-0.5 truncate text-lg text-stone-900">{data.fileName}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
            data.ai.used ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"
          }`}
          title={data.ai.failure ?? undefined}
        >
          {data.ai.used ? t("✨ Разобрано умным помощником", "✨ Parsed by smart assistant") : t("Разобрано по правилам", "Parsed by rules")}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-stone-200 sm:grid-cols-4">
        {[
          { label: t("Добавим", "To add"), value: stats.chosen, strong: true },
          { label: t("С телефоном", "With phone"), value: stats.withPhone },
          { label: t("Могут с парой", "Can bring +1"), value: stats.plusOne },
          { label: t("Проверить", "To review"), value: stats.review, warn: stats.review > 0 },
        ].map((tile) => (
          <div key={tile.label} className="bg-card px-5 py-3">
            <p className={`text-2xl tabular-nums ${tile.warn ? "text-amber-700" : "text-stone-900"} ${tile.strong ? "font-semibold" : ""}`}>{tile.value}</p>
            <p className="text-xs text-stone-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 px-5 pt-4">
        {data.ai.enabled && data.ai.failure && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
            {t(
              `Умный помощник не помог (${data.ai.failure}) — разобрали по правилам. Проверьте столбцы ниже.`,
              `The smart assistant couldn’t help (${data.ai.failure}) — we parsed the file by rules. Please check the columns below.`,
            )}
          </p>
        )}
        {data.planNote && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">✨ {data.planNote}</p>}
        {[
          ...data.warnings,
          ...(stats.groups > 0 ? [t(
            `Из ячеек, где записано несколько людей, получилось ${countWord(lang, stats.groups, ["гость", "гостя", "гостей"], ["guest", "guests"])}.`,
            `Cells listing several people became ${countWord(lang, stats.groups, ["гость", "гостя", "гостей"], ["guest", "guests"])}.`,
          )] : []),
          ...(data.skippedRows > 0 ? [t(`Пропущено строк без имени: ${data.skippedRows}.`, `Rows skipped without a name: ${data.skippedRows}.`)] : []),
        ].map((warning) => (
          <p key={warning} className="text-sm text-stone-600">• {warning}</p>
        ))}
      </div>

      {/* ── Как поняли файл ── */}
      <details open={mappingOpen} onToggle={(e) => setMappingOpen(e.currentTarget.open)} className="mx-5 mt-4 rounded-xl border border-stone-200">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-stone-800">
          {t("Как мы поняли файл", "How we read the file")}
          <span className="ml-2 font-normal text-stone-500">
            {t(
              `${data.columns.filter((c) => c.role !== "ignore").length} столбцов · лист «${data.sheets[data.sheetIndex]?.name}»`,
              `${countWord(lang, data.columns.filter((c) => c.role !== "ignore").length, ["", "", ""], ["column", "columns"])} · sheet “${data.sheets[data.sheetIndex]?.name}”`,
            )}
          </span>
        </summary>
        <form action={remapImportAction} className="border-t border-stone-200 px-4 py-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="draftId" value={draftId} />
          {data.sheets.length > 1 && (
            <label className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
              {t("Лист:", "Sheet:")}
              <select
                name="sheetIndex"
                defaultValue={data.sheetIndex}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                {data.sheets.map((sheet, index) => (
                  <option key={index} value={index}>
                    {sheet.name} ({sheet.rows} {t("стр.", "rows")}){sheet.hidden ? t(" — скрытый", " — hidden") : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.columns.map((column) => (
              <label key={column.index} className={`block rounded-lg border px-3 py-2 ${column.role === "ignore" ? "border-stone-200 bg-stone-50" : "border-stone-300"}`}>
                <span className="flex items-baseline justify-between gap-2 text-xs text-stone-500">
                  <span className="truncate">{t("Столбец", "Column")} {letter(column.index)}{column.header ? (lang === "en" ? ` · “${column.header}”` : ` · «${column.header}»`) : ""}</span>
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
                  className="mt-1 w-full rounded-md border border-stone-300 bg-card px-2 py-1 text-sm text-stone-900"
                >
                  {data.roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="mt-1 block truncate text-xs text-stone-400">{column.samples.join(" · ") || t("пусто", "empty")}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500">{t("Поменяли столбец — список пересоберётся. Правки в таблице ниже при этом сбросятся.", "Change a column and the list is rebuilt. Edits in the table below will be reset.")}</p>
            <button className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm">{t("Применить", "Apply")}</button>
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
              ["all", `${t("Все", "All")} · ${data.guests.length}`],
              ["review", `${t("Проверить", "Review")} · ${stats.review + stats.existing + stats.duplicates}`],
              ["excluded", `${t("Не берём", "Skipped")} · ${data.guests.length - stats.chosen}`],
            ] as [Filter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1 transition-colors ${filter === value ? "bg-card text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
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
            {allOn ? t("Снять все", "Deselect all") : t("Выбрать все", "Select all")}
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
                    aria-label={t(`Добавить ${guest.displayName}`, `Add ${guest.displayName}`)}
                  />
                  <span className="text-xs text-stone-500 sm:hidden">{t("Добавить", "Add")}</span>
                </label>

                <div className={on ? "" : "opacity-60"}>
                  <input
                    name={`${p}name`}
                    defaultValue={guest.displayName}
                    required={on}
                    minLength={2}
                    maxLength={120}
                    aria-label={t("Имя", "Name")}
                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-stone-900 hover:border-stone-200 focus:border-stone-400 focus:bg-card"
                  />
                  <div className="mt-1 flex flex-wrap gap-1 px-2">
                    {guest.flags.existing && <Badge tone="blue">{t("Уже в списке", "Already on the list")}</Badge>}
                    {guest.flags.duplicateInFile && <Badge tone="blue">{t("Повтор в файле", "Repeated in file")}</Badge>}
                    {guest.flags.review && <Badge tone="amber">{guest.flags.review}</Badge>}
                    <span className="truncate text-xs text-stone-400" title={guest.sourceText}>
                      {t("стр.", "row")} {guest.sourceRow}
                      {guest.flags.fromGroup || guest.sourceText !== guest.displayName ? (lang === "en" ? ` · “${guest.sourceText}”` : ` · «${guest.sourceText}»`) : ""}
                    </span>
                  </div>
                </div>

                <div className={`space-y-1 ${on ? "" : "opacity-60"}`}>
                  <input
                    name={`${p}phone`}
                    defaultValue={guest.phone ?? ""}
                    placeholder={t("Телефон", "Phone")}
                    inputMode="tel"
                    maxLength={40}
                    aria-label={t("Телефон", "Phone")}
                    className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                  />
                  <PlusOneField prefix={p} guest={guest} />
                </div>

                <textarea
                  name={`${p}note`}
                  defaultValue={guest.note ?? ""}
                  placeholder={t("Заметка", "Note")}
                  rows={guest.note && guest.note.length > 60 ? 2 : 1}
                  maxLength={500}
                  aria-label={t("Заметка", "Note")}
                  className={`w-full resize-y rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-stone-700 ${on ? "" : "opacity-60"}`}
                />
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-card/95 px-5 py-3 backdrop-blur">
          <p className="text-sm text-stone-600">
            {t("Выбрано", "Selected")} <b className="text-stone-900">{stats.chosen}</b> {t("из", "of")} {data.guests.length}
          </p>
          <div className="flex gap-2">
            <button
              formAction={cancelImportAction}
              formNoValidate
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              {t("Отмена", "Cancel")}
            </button>
            <button
              disabled={stats.chosen === 0 || submitting}
              className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? t("Добавляем…", "Adding…") : t(
                `Добавить ${countWord(lang, stats.chosen, ["гостя", "гостя", "гостей"], ["guest", "guests"])}`,
                `Add ${countWord(lang, stats.chosen, ["гостя", "гостя", "гостей"], ["guest", "guests"])}`,
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function PlusOneField({ prefix, guest }: { prefix: string; guest: PreviewGuest }) {
  const [on, setOn] = useState(guest.plusOneAllowed);
  const t = useT();
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
        placeholder={on ? t("Имя спутника", "+1’s name") : t("без пары", "no +1")}
        maxLength={120}
        aria-label={t("Имя спутника", "+1’s name")}
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
