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
import { gl } from "@/server/guest-html/guest-lang";

const STATUS: Record<string, () => string> = {
  PENDING: () => gl("ждёт проверки", "awaiting review"),
  APPROVED: () => gl("показано в зале", "shown at the venue"),
  REJECTED: () => gl("не подошло", "not approved"),
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
      : `<section><h2>${gl("Ваши пожелания", "Your wishes")}</h2>
${opts.mine
  .map(
    (wish) => `<p class="pre small" style="margin-bottom:.75rem">${esc(wish.text)}
<span class="muted"> — ${esc(STATUS[wish.status]?.() ?? wish.status)}</span></p>`,
  )
  .join("")}</section>`;

  const form = opts.enabled
    ? `<form method="post" action="${esc(opts.action)}">
  <label class="field"><span>${gl("Как подписать", "Sign as")}</span>
  <input name="authorName" required maxlength="80" value="${esc(opts.authorName)}"></label>
  <label class="field"><span>${gl("Пожелание", "Your wish")}</span>
  <textarea name="text" required minlength="3" maxlength="500" rows="5"
    placeholder="${gl("Несколько слов — их прочитают в зале", "A few words to be read at the venue")}"></textarea></label>
  <button class="submit" type="submit">${gl("Отправить", "Send")}</button>
</form>`
    : `<section><p class="center small muted">${gl("Приём пожеланий закрыт организатором.", "The organizer has closed wishes.")}</p></section>`;

  return invitePage({
    theme: opts.theme,
    title: gl("Пожелание молодожёнам", "Wishes for the couple"),
    noindex: true,
    body: `${opts.saved ? `<p class="ok">${gl("Спасибо! Пожелание отправлено.", "Thank you! Your wish has been sent.")}</p>` : ""}
<section style="padding-bottom:0">
<h1 class="center" style="font-size:1.5rem">${gl("Пожелание молодожёнам", "Wishes for the couple")}</h1>
<p class="center small muted">${esc(opts.eventTitle)}</p>
</section>
${opts.error ? `<p class="error">${esc(opts.error)}</p>` : ""}
${form}
${list}
<p class="foot"><a href="${esc(opts.backHref)}">${esc(opts.backLabel)}</a></p>`,
  });
}
