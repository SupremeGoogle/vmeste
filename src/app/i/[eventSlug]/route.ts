/**
 * Публичное приглашение — ссылка для соцсетей и общего чата.
 *
 * Отдаётся строкой HTML: интерактивности здесь нет вовсе, а рантайм React
 * стоил 174 КБ при 5 КБ собственной разметки. Форма ответа сюда не входит
 * намеренно — отвечать может только гость с именной ссылкой, иначе в
 * списке появятся ответы неизвестно от кого.
 */
import { getInviteBySlug } from "@/server/repositories/invites";
import { formatEventDateTime } from "@/lib/format-datetime";
import { html } from "@/server/guest-html/layout";
import { invitePage, renderBlocks } from "@/server/guest-html/invite-html";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const { eventSlug } = await params;
  const invite = await getInviteBySlug(eventSlug);

  if (!invite) {
    return html(invitePage({ title: "Не найдено", body: "<section><h1>Приглашение не найдено</h1></section>" }), {
      status: 404,
    });
  }

  const when = formatEventDateTime(invite.event.eventDate, invite.event.timezone);

  return html(
    invitePage({
      title: invite.event.title,
      body: `${renderBlocks(invite.blocks, null, null)}<p class="foot">${when}</p>`,
    }),
    {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=86400",
      },
    },
  );
}
