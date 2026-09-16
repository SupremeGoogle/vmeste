import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { getTheme, listBlocks } from "@/server/repositories/invites";
import { formatEventDateTime } from "@/lib/format-datetime";
import { html } from "@/server/guest-html/layout";
import { invitePage, renderBlocks } from "@/server/guest-html/invite-html";
import { renderEvergreenBlocks } from "@/server/guest-html/evergreen/markup";
import { EVERGREEN_EDITOR_CSS } from "@/server/guest-html/evergreen/style";
import { EVERGREEN_EDITOR_SCRIPT } from "@/server/guest-html/evergreen/script";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, blocks, theme] = await Promise.all([
    getEvent(ctx, eventId),
    listBlocks(ctx),
    getTheme(ctx),
  ]);
  if (!event || theme.template !== "evergreen") {
    return new Response("Редактор этого шаблона недоступен", { status: 404 });
  }

  const body = renderEvergreenBlocks(
    blocks.filter((block) => block.visible),
    theme,
    null,
    null,
    (block) => renderBlocks([block], null, null, event.eventDate, { ...theme, template: "" }, event.timezone),
    { editable: true },
  );

  return html(invitePage({
    title: `${event.title} — визуальный редактор`,
    theme,
    noindex: true,
    extraCss: EVERGREEN_EDITOR_CSS,
    body: `${body}<p class="foot">${formatEventDateTime(event.eventDate, event.timezone)}</p><p class="eg-edit-tip">Нажмите на текст или фотографию, чтобы изменить</p>`,
    script: EVERGREEN_EDITOR_SCRIPT,
  }), {
    headers: { "cache-control": "private, no-store" },
  });
}
