/**
 * Страница пожелания — та же строка HTML, что и приглашение.
 *
 * Форма из двух полей, никакой интерактивности: ради неё грузить рантайм
 * React было бы странно вдвойне — её открывают за столом, с телефона,
 * когда вайфай в зале уже поделён на полторы сотни человек.
 */
import { esc } from "@/server/guest-html/layout";
import { invitePage } from "@/server/guest-html/invite-html";
import type { InviteTheme } from "@/lib/invite-theme";

const STATUS: Record<string, string> = {
  PENDING: "ждёт проверки",
  APPROVED: "показано в зале",
  REJECTED: "не подошло",
};

export type WishView = { id: string; text: string; status: string };

export function wishPage(opts: {
  /** Оформление мероприятия: страница гостя должна выглядеть как его
   *  приглашение, а не как отдельный сервис. */
  theme?: InviteTheme;
  eventTitle: string;
  authorName: string;
  enabled: boolean;
  mine: WishView[];
  action: string;
  backHref: string;
  backLabel: string;
  saved: boolean;
  error: string | null;
}): string {
  const list =
    opts.mine.length === 0
      ? ""
      : `<section><h2>Ваши пожелания</h2>
${opts.mine
  .map(
    (wish) => `<p class="pre small" style="margin-bottom:.75rem">${esc(wish.text)}
<span class="muted"> — ${esc(STATUS[wish.status] ?? wish.status)}</span></p>`,
  )
  .join("")}</section>`;

  const form = opts.enabled
    ? `<form method="post" action="${esc(opts.action)}">
  <label class="field"><span>Как подписать</span>
  <input name="authorName" required maxlength="80" value="${esc(opts.authorName)}"></label>
  <label class="field"><span>Пожелание</span>
  <textarea name="text" required minlength="3" maxlength="500" rows="5"
    placeholder="Несколько слов — их прочитают в зале"></textarea></label>
  <button class="submit" type="submit">Отправить</button>
</form>`
    : `<section><p class="center small muted">Приём пожеланий закрыт организатором.</p></section>`;

  return invitePage({
    theme: opts.theme,
    title: "Пожелание молодожёнам",
    noindex: true,
    body: `${opts.saved ? `<p class="ok">Спасибо! Покажем на экране после проверки.</p>` : ""}
<section style="padding-bottom:0">
<h1 class="center" style="font-size:1.5rem">Пожелание молодожёнам</h1>
<p class="center small muted">${esc(opts.eventTitle)}</p>
</section>
${opts.error ? `<p class="error">${esc(opts.error)}</p>` : ""}
${form}
${list}
<p class="foot"><a href="${esc(opts.backHref)}">${esc(opts.backLabel)}</a></p>`,
  });
}
