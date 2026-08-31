/**
 * Заставка-конверт перед приглашением.
 *
 * Гость видит закрытый конверт с именами и подсказкой «нажмите, чтобы
 * открыть»; касание — и конверт расходится, показывая приглашение.
 *
 * Три решения, которые здесь важнее красоты:
 *
 * 1. **Заставку ставит скрипт, а не разметка.** Придёт она наоборот —
 *    и телефон без JavaScript покажет гостю картинку, за которой не
 *    видно ни даты, ни адреса. Нет скрипта — нет и конверта, приглашение
 *    открывается сразу.
 * 2. **Конверт нарисован геометрией.** Картинка — это лишний запрос по
 *    сети, которой в дороге почти нет, и она бы грузилась ровно в тот
 *    момент, когда человек уже смотрит на экран.
 * 3. **Открывается любым касанием и любой клавишей.** «Нажмите на
 *    конверт» — это требование попасть пальцем в прямоугольник, и на
 *    морозе в перчатках оно не выполняется.
 */
import { esc } from "@/server/guest-html/layout";
import type { InviteTheme } from "@/lib/invite-theme";

export const INTRO_CSS = `
#intro{position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;
align-items:center;justify-content:center;gap:1.75rem;background:var(--bg);
cursor:pointer;transition:opacity .9s ease}
#intro.gone{opacity:0;pointer-events:none}
#intro svg{width:min(78vw,26rem);height:auto;display:block}
#intro .flap{transform-origin:50% 21%;transition:transform 1s cubic-bezier(.4,0,.2,1)}
#intro.gone .flap{transform:rotateX(-172deg)}
#intro p{margin:0;font-family:var(--serif);font-style:italic;font-size:1rem;
letter-spacing:.06em;color:var(--accent);animation:introHint 2.6s ease-in-out infinite}
@keyframes introHint{0%,100%{opacity:.55}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){#intro,#intro .flap,#intro p{transition:none;animation:none}}
`;

/**
 * Скрипт заставки. Инлайном и коротко: отдельный файл — ещё один запрос
 * по сети, которой в дороге почти нет.
 *
 * Имена подставляются на сервере и уже экранированы — сюда приходит
 * готовая разметка одной строкой.
 */
export function introScript(markup: string): string {
  return `(function(){var d=document,w=d.createElement('div');w.id='intro';
w.innerHTML=${JSON.stringify(markup)};
d.body.appendChild(w);d.body.style.overflow='hidden';
function open(){w.classList.add('gone');d.body.style.overflow='';
setTimeout(function(){w.remove()},1000);
d.removeEventListener('keydown',open)}
w.addEventListener('click',open);d.addEventListener('keydown',open)})()`;
}

/**
 * Разметка конверта: клапан, тело, веточки и имена. Рисуется от 0 0 до
 * 400 260 — теми же условными координатами, что план зала, чтобы
 * одинаково лечь и на телефон, и на широкий экран.
 */
export function envelopeMarkup(theme: InviteTheme, names: string): string {
  const line = esc(theme.line);
  const accent = esc(theme.accent);
  const card = esc(theme.card);

  // Веточка идёт вдоль сгиба клапана — от угла конверта к его острию.
  // Раньше листья висели по диагонали сами по себе и читались как
  // случайные пятна; привязанные к линии сгиба, они читаются как тиснение.
  //
  // Клапан: (20,38) → (200,152). Стебель кладём чуть внутрь, чтобы листья
  // не наезжали на саму линию.
  const sprig =
    `<path d="M56 62 Q120 104 178 140" fill="none" stroke="${accent}" stroke-width="0.9" opacity="0.5"/>` +
    Array.from({ length: 7 }, (_, index) => {
      const t = index / 6;
      // Точка на той же кривой, что и стебель.
      const x = (1 - t) * (1 - t) * 56 + 2 * (1 - t) * t * 120 + t * t * 178;
      const y = (1 - t) * (1 - t) * 62 + 2 * (1 - t) * t * 104 + t * t * 140;
      // Листья смотрят наружу от сгиба и мельчают к острию.
      const size = 8.4 - t * 3.2;
      const angle = 28 + t * 14;
      return (
        `<ellipse cx="${(x - 7).toFixed(1)}" cy="${(y + 5).toFixed(1)}" rx="${size.toFixed(1)}" ry="${(size * 0.4).toFixed(1)}" fill="${accent}" opacity="0.5" transform="rotate(${angle.toFixed(0)} ${(x - 7).toFixed(1)} ${(y + 5).toFixed(1)})"/>` +
        `<ellipse cx="${(x + 6).toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="${(size * 0.82).toFixed(1)}" ry="${(size * 0.33).toFixed(1)}" fill="${accent}" opacity="0.38" transform="rotate(${(angle - 52).toFixed(0)} ${(x + 6).toFixed(1)} ${(y - 6).toFixed(1)})"/>`
      );
    }).join("");

  const nameLines = names
    .split("\n")
    .slice(0, 2)
    .map(
      (part, index) =>
        `<text x="200" y="${74 + index * 26}" text-anchor="middle" font-size="21" fill="${accent}" font-style="italic">${esc(part.trim())}</text>`,
    )
    .join("");

  return `<svg viewBox="0 0 400 260" role="img" aria-label="Конверт с приглашением">
<rect x="20" y="30" width="360" height="210" rx="8" fill="${card}" stroke="${line}" stroke-width="1.5"/>
<path d="M20 240 L200 138 L380 240" fill="none" stroke="${line}" stroke-width="1.2"/>
<g class="flap"><path d="M20 38 L200 152 L380 38 Z" fill="${card}" stroke="${accent}" stroke-width="1.5"/>
${sprig}
<g transform="translate(400 0) scale(-1 1)">${sprig}</g>
${nameLines}</g>
</svg>
<p>нажмите, чтобы открыть</p>`;
}
