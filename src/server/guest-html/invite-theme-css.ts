/**
 * Тема приглашения → CSS-переменные и правила шаблона.
 *
 * Вся вариативность оформления собрана здесь, в одном месте и в виде
 * готовой строки. Причина простая: в `invite-html.ts` базовый CSS
 * минифицируется целиком (`.replace(/\n/g,"")`), и подмешивать туда
 * значения из базы построчно — верный способ однажды склеить два правила
 * в одно и полдня искать, почему у одного мероприятия съехала вёрстка.
 *
 * Все значения приходят уже проверенными (`lib/invite-theme.ts`): цвета
 * подходят под `#[0-9a-f]{3,8}`, остальное — перечисления. В CSS не
 * попадает ни одной строки, которую человек написал свободно.
 */
import { CORNER_RADIUS, FONT_STACKS, type InviteTheme } from "@/lib/invite-theme";
import { INTRO_CSS } from "@/server/guest-html/invite-intro";
import {
  DECOR_CSS, ORNAMENT_CSS, PAPER_CSS, TIMELINE_ICON_CSS, ornamentBackground,
} from "@/server/guest-html/invite-decor";

/** Разделитель под заголовком раздела — четыре разных характера. */
function dividerCss(theme: InviteTheme): string {
  if (theme.divider === "none") {
    return `h2::after{display:none}h2{margin-bottom:1.25rem}`;
  }

  if (theme.divider === "line") {
    return `h2::after{content:"";display:block;width:2.5rem;height:1px;background:var(--line);margin:.75rem auto 0}`;
  }

  if (theme.divider === "diamond") {
    // Линия с ромбом посередине: ромб — это квадрат, повёрнутый на 45°,
    // и закрашенный цветом фона, чтобы линия под ним не просвечивала.
    return `h2::after{content:"";display:block;width:3.5rem;height:1px;background:var(--line);margin:.9rem auto 0;position:relative}
h2{position:relative}
h2::before{content:"";position:absolute;left:50%;bottom:-.55rem;width:.42rem;height:.42rem;
transform:translateX(-50%) rotate(45deg);background:var(--card);border:1px solid var(--accent);z-index:1}`;
  }

  // Веточка: три точки, расходящиеся от центра. Рисуется тенями одного
  // псевдоэлемента — это дешевле любой картинки и переживает печать.
  return `h2::after{content:"";display:block;width:.3rem;height:.3rem;border-radius:50%;
background:var(--accent);margin:.95rem auto 0;
box-shadow:-.85rem 0 0 -.06rem var(--accent),.85rem 0 0 -.06rem var(--accent),
-1.6rem 0 0 -.12rem var(--line),1.6rem 0 0 -.12rem var(--line)}`;
}

/** Обложка: только текст, фотография во всю ширину или в рамке. */
function coverCss(theme: InviteTheme): string {
  if (theme.cover === "photo") {
    // Во всю ширину и без полей: фотография упирается в края листа.
    return `.cover img{width:100%;height:auto;margin:-2.75rem -1.5rem 1.75rem;width:calc(100% + 3rem);max-width:none}`;
  }

  if (theme.cover === "frame") {
    return `.cover img{width:100%;height:auto;margin:0 0 1.75rem;border:1px solid var(--accent);
padding:.5rem;background:var(--card)}`;
  }

  return `.cover img{display:none}`;
}

/** Расписание: строкой или столбцом. */
function timelineCss(theme: InviteTheme): string {
  if (theme.timeline === "row") return "";

  // Столбцом: время над подписью, всё по центру, между пунктами воздух.
  // Вертикальная линия слева тут не нужна — она держала строки, а
  // центрированный столбец держится сам.
  return `.timeline li{display:block;text-align:center;margin-bottom:2.25rem}
.timeline time{display:block;flex:none;text-align:center;font-family:var(--serif);
font-style:italic;font-size:1.25rem;color:var(--accent);padding:0;letter-spacing:.02em}
.timeline .what{border-left:0;padding-left:0;margin-top:.4rem;font-size:.8125rem;
letter-spacing:.18em;text-transform:uppercase}
.timeline .note{margin-top:.35rem;letter-spacing:0;text-transform:none;font-size:.875rem}`;
}

/** Разделы: на общем фоне или каждый в своей карточке. */
function sectionsCss(theme: InviteTheme, radius: string): string {
  if (theme.sections === "flat") return "";

  // Карточка на фоне листа: фон страницы становится подложкой, а сам
  // раздел — бумагой поверх. Поэтому лист прозрачный, иначе карточка
  // белого на белом просто не видна.
  return `.sheet{background:var(--bg)}
section{background:var(--card);border-radius:${radius};margin:0 1rem 1rem;
padding:2rem 1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.cover{margin-top:1rem}
form,.foot{background:transparent}`;
}

/** Дата на обложке крупными цифрами. */
function dateCss(theme: InviteTheme): string {
  if (theme.dateStyle === "line") return "";

  return `.cover .date{font-family:var(--serif);font-style:italic;font-size:2.75rem;
line-height:1.1;color:var(--fg);letter-spacing:.04em;margin-top:1.5rem}`;
}

/**
 * Полная тема строкой. Подставляется после базового CSS, поэтому
 * переопределяет его без `!important`.
 */
export function inviteThemeCss(theme: InviteTheme): string {
  const heading = FONT_STACKS[theme.headingFont];
  const body = FONT_STACKS[theme.bodyFont];
  const radius = CORNER_RADIUS[theme.corner];

  const rules = [
    // Переменные темы перекрывают те, что пришли из `theme.ts`.
    `:root{--bg:${theme.bg};--card:${theme.card};--fg:${theme.ink};--muted:${theme.muted};
--accent:${theme.accent};--accent-deep:${theme.accent};--line:${theme.line};
--serif:${heading};--sans:${body};--radius:${radius};--leaf:${theme.leaf}}`,

    `body{font-family:${body}}`,
    `h1,h2,.names{font-family:${heading}}`,

    // Выравнивание — одна из самых заметных осей: по центру читается как
    // приглашение, по левому краю — как современная афиша.
    theme.align === "left"
      ? `section,.cover,h2,.pre,.foot{text-align:left}h2::after,h2::before{margin-left:0;left:1.75rem}
.palette,.links{justify-content:flex-start}`
      : "",

    theme.capsHeadings
      ? `h2{letter-spacing:.16em;text-transform:uppercase;font-size:.9375rem}`
      : `h2{letter-spacing:.01em;text-transform:none;font-size:1.3125rem}`,

    // Рамка по краю листа: тонкая линия внутри отступа.
    // `position:relative` на самом листе обязателен: без него рамка
    // отсчитывается от окна и обрывается ровно на высоте экрана — на
    // коротком приглашении это незаметно, на длинном линия висит в
    // воздухе посреди страницы.
    theme.frame
      ? `.sheet{position:relative;padding:.75rem}.sheet>*{position:relative;z-index:1}
.sheet::before{content:"";position:absolute;inset:.75rem;border:1px solid var(--line);
pointer-events:none;z-index:0}`
      : "",

    // Скругления во всём, что имеет форму.
    `.choice,.field input,.field textarea,.error{border-radius:${radius}}`,
    theme.corner === "sharp" ? `.cta,.links a,.submit{border-radius:0}` : "",
    theme.corner === "sharp" ? `.swatch{border-radius:0}` : "",

    dividerCss(theme),
    coverCss(theme),
    timelineCss(theme),
    sectionsCss(theme, radius),
    dateCss(theme),
    theme.intro === "envelope" ? INTRO_CSS : "",
    theme.decor !== "none" ? DECOR_CSS : "",
    theme.paper ? PAPER_CSS : "",
    // Вензель бессмыслен без рамки: он её угол и есть.
    theme.frame && theme.frameOrnament ? ORNAMENT_CSS + ornamentBackground(theme) : "",
    theme.timelineIcons ? TIMELINE_ICON_CSS : "",
  ];

  return rules.filter(Boolean).join("").replace(/\n/g, "");
}
