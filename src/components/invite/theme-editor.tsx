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
import { themeLabels, type InviteTheme } from "@/lib/invite-theme";
import { makeT, type Lang } from "@/lib/i18n";

const COLOR_FIELDS = ["bg", "card", "ink", "muted", "accent", "line", "leaf"] as const;

function ColorField({ name, value, label }: { name: (typeof COLOR_FIELDS)[number]; value: string; label: string }) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        name={name}
        defaultValue={value}
        aria-label={label}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-stone-300 bg-card p-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-stone-700">{label}</span>
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
        className="mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2 text-sm"
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

export function ThemeEditor({ theme, lang = "ru" }: { theme: InviteTheme; lang?: Lang }) {
  const t = makeT(lang);
  const labels = themeLabels(lang);
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm text-stone-900">{t("Цвета", "Colors")}</legend>
        {COLOR_FIELDS.map((field) => (
          <ColorField key={field} name={field} value={theme[field]} label={labels.fields[field]} />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm text-stone-900">{t("Оформление", "Design")}</legend>
        <Choice name="headingFont" value={theme.headingFont} options={labels.font} label={t("Шрифт заголовков", "Heading font")} />
        <Choice name="bodyFont" value={theme.bodyFont} options={labels.font} label={t("Шрифт текста", "Body font")} />
        <Choice name="corner" value={theme.corner} options={labels.corner} label={t("Углы", "Corners")} />
        <Choice name="divider" value={theme.divider} options={labels.divider} label={t("Разделитель под заголовком", "Divider under headings")} />
        <Choice name="cover" value={theme.cover} options={labels.cover} label={t("Обложка", "Cover")} />
        <Choice name="dateStyle" value={theme.dateStyle} options={labels.date} label={t("Дата на обложке", "Cover date")} />
        <Choice name="intro" value={theme.intro} options={labels.intro} label={t("Заставка", "Intro")} />
        <Choice name="decor" value={theme.decor} options={labels.decor} label={t("Цветы по углам", "Corner flowers")} />
        <Choice name="timeline" value={theme.timeline} options={labels.timeline} label={t("Расписание", "Schedule")} />
        <Choice name="sections" value={theme.sections} options={labels.sections} label={t("Разделы", "Sections")} />
        <Choice
          name="align"
          value={theme.align}
          options={{ center: t("по центру", "centered"), left: t("по левому краю", "left-aligned") }}
          label={t("Выравнивание", "Alignment")}
        />

        <div className="space-y-2 pt-1">
          <Flag name="frame" checked={theme.frame} label={t("Рамка по краю листа", "Frame around the page")} />
          <Flag name="capsHeadings" checked={theme.capsHeadings} label={t("Заголовки заглавными вразрядку", "Spaced all-caps headings")} />
          <Flag name="frameOrnament" checked={theme.frameOrnament} label={t("Вензель в углах рамки", "Monogram in frame corners")} />
          <Flag name="paper" checked={theme.paper} label={t("Фактура бумаги", "Paper texture")} />
          <Flag name="timelineIcons" checked={theme.timelineIcons} label={t("Значки в расписании", "Schedule icons")} />
        </div>
      </fieldset>
    </div>
  );
}
