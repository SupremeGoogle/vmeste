/**
 * Свадебная палитра и типографика — один источник на всё приложение.
 *
 * Раньше цвета жили в трёх местах: строковая вёрстка входа в зал,
 * строковая вёрстка приглашения и Tailwind-классы панели. Совпадали они
 * приблизительно, и «то же самое мероприятие» выглядело тремя разными
 * продуктами: гость видел кремовое приглашение, а координатор — серую
 * админку.
 *
 * Решение простое: токены объявлены здесь, а панель подхватывает те же
 * значения через `@theme` в `globals.css` (там стоит ссылка на этот файл).
 * Меняется цвет — меняется везде.
 *
 * Шрифты только системные. Свадебному сервису идёт антиква, но веб-шрифт
 * это +100 КБ и запрос на сторонний домен на странице, которую открывают
 * с телефона в дороге. Системная антиква (Iowan Old Style на айфонах,
 * Palatino и Georgia в остальных случаях) выглядит уместно и стоит ноль.
 */

/** Цвета. Тёплые, печатные: приглашение печатают, план зала печатают,
 *  список гостей печатают — холодный синий в этом ряду выглядит чужим. */
export const COLORS = {
  /** Фон страницы — цвет бумаги для приглашений. */
  bg: "#faf7f2",
  /** Карточка поверх фона, чуть светлее. */
  card: "#fffdf9",
  /** Основной текст. Не чёрный: на кремовом он выглядит грязным. */
  ink: "#2b2622",
  /** Второстепенный текст. */
  muted: "#7c7168",
  /** Линии и рамки. */
  line: "#e6ddd1",
  /** Акцент — тёплое золото. Кнопки, ссылки, подсветка. */
  accent: "#8b6f47",
  /** Акцент для наведения и нажатия. */
  accentDeep: "#6b5136",
  /** Тревога: отклонённое, ошибки. Приглушённая, не аварийная. */
  alarm: "#8a2b2b",
  alarmBg: "#fdeeee",
  /** Предупреждение: «превью не получилось», «черновик импорта». */
  warn: "#7a5a1f",
  warnBg: "#fbf3e2",
} as const;

export const FONTS = {
  /** Заголовки, имена, цифра стола — всё, что читают, а не заполняют. */
  serif: `"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif`,
  /** Формы и таблицы: в панели данные читают глазами по строкам,
   *  и гротеск здесь удобнее. */
  sans: `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif`,
  mono: `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`,
} as const;

/** CSS-переменные строкой — для страниц, которые собираются вручную. */
export function themeVariables(): string {
  return [
    `--bg:${COLORS.bg}`,
    `--card:${COLORS.card}`,
    `--fg:${COLORS.ink}`,
    `--muted:${COLORS.muted}`,
    `--line:${COLORS.line}`,
    `--accent:${COLORS.accent}`,
    `--accent-deep:${COLORS.accentDeep}`,
    `--alarm:${COLORS.alarm}`,
    `--alarm-bg:${COLORS.alarmBg}`,
    `--warn:${COLORS.warn}`,
    `--warn-bg:${COLORS.warnBg}`,
    `--serif:${FONTS.serif}`,
    `--sans:${FONTS.sans}`,
    `--mono:${FONTS.mono}`,
  ].join(";");
}

/**
 * Тонкая линия-разделитель с ромбом посередине — единственное украшение,
 * которое позволено. Свадебная вёрстка легко скатывается в вензеля;
 * один повторяющийся знак держит её в рамках и не стоит ни байта картинок.
 */
export const DIVIDER = `<div class="rule" aria-hidden="true"></div>`;

/** Общие правила: типографика, разделитель, состояния. */
export const BASE_CSS = `
:root{${themeVariables()}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);-webkit-text-size-adjust:100%}
h1,h2,h3{font-family:var(--serif);font-weight:500;letter-spacing:.01em}
a{color:var(--accent)}
.rule{height:1px;background:var(--line);position:relative;margin:2rem auto;max-width:8rem}
.rule::after{content:"";position:absolute;left:50%;top:50%;width:.4rem;height:.4rem;
transform:translate(-50%,-50%) rotate(45deg);background:var(--bg);border:1px solid var(--line)}
`;
