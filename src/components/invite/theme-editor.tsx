/**
 * Настройки оформления приглашения.
 *
 * Серверный компонент на нативных формах — как и весь остальной
 * конструктор. Цвета правятся `<input type="color">`: браузер даёт
 * настоящую палитру, а рядом стоит поле с кодом, потому что палитру
 * свадьбы обычно присылают строкой «#c8b7a6», а не подбирают пипеткой.
 *
 * Каждый флажок сопровождается скрытым полем `имя__sent`: браузер не
 * присылает выключенный флажок вовсе, и без этой пометки сохранение
 * палитры выключало бы рамку, заданную в соседней форме.
 */
import {
  CORNER_LABEL, COVER_LABEL, DATE_LABEL, DIVIDER_LABEL, FONT_LABEL,
  INTRO_LABEL, SECTIONS_LABEL, THEME_FIELD_LABELS, TIMELINE_LABEL, type InviteTheme,
} from "@/lib/invite-theme";

const COLOR_FIELDS = ["bg", "card", "ink", "muted", "accent", "line"] as const;

function ColorField({ name, value }: { name: (typeof COLOR_FIELDS)[number]; value: string }) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        name={name}
        defaultValue={value}
        aria-label={THEME_FIELD_LABELS[name]}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-stone-700">{THEME_FIELD_LABELS[name]}</span>
        <span className="block font-mono text-xs text-stone-400">{value}</span>
      </span>
    </label>
  );
}

function Choice<T extends string>({
  name, value, options, label,
}: {
  name: string;
  value: T;
  options: Record<string, string>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-stone-600">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
      >
        {Object.entries(options).map(([key, title]) => (
          <option key={key} value={key}>{title}</option>
        ))}
      </select>
    </label>
  );
}

function Flag({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-stone-700">
      <input type="hidden" name={`${name}__sent`} value="1" />
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-4 w-4 rounded border-stone-300"
      />
      {label}
    </label>
  );
}

export function ThemeEditor({ theme }: { theme: InviteTheme }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm text-stone-900">Цвета</legend>
        {COLOR_FIELDS.map((field) => (
          <ColorField key={field} name={field} value={theme[field]} />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm text-stone-900">Оформление</legend>
        <Choice name="headingFont" value={theme.headingFont} options={FONT_LABEL} label="Шрифт заголовков" />
        <Choice name="bodyFont" value={theme.bodyFont} options={FONT_LABEL} label="Шрифт текста" />
        <Choice name="corner" value={theme.corner} options={CORNER_LABEL} label="Углы" />
        <Choice name="divider" value={theme.divider} options={DIVIDER_LABEL} label="Разделитель под заголовком" />
        <Choice name="cover" value={theme.cover} options={COVER_LABEL} label="Обложка" />
        <Choice name="dateStyle" value={theme.dateStyle} options={DATE_LABEL} label="Дата на обложке" />
        <Choice name="intro" value={theme.intro} options={INTRO_LABEL} label="Заставка" />
        <Choice name="timeline" value={theme.timeline} options={TIMELINE_LABEL} label="Расписание" />
        <Choice name="sections" value={theme.sections} options={SECTIONS_LABEL} label="Разделы" />
        <Choice
          name="align"
          value={theme.align}
          options={{ center: "по центру", left: "по левому краю" }}
          label="Выравнивание"
        />

        <div className="space-y-2 pt-1">
          <Flag name="frame" checked={theme.frame} label="Рамка по краю листа" />
          <Flag name="capsHeadings" checked={theme.capsHeadings} label="Заголовки заглавными вразрядку" />
        </div>
      </fieldset>
    </div>
  );
}
