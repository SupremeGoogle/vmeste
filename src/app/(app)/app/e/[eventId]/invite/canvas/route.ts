/**
 * Приглашение в режиме визуального редактора — для любого шаблона.
 *
 * Страница та же, что видит гость, но поля помечены (см.
 * `guest-html/inline-editor.ts`), а скрипт редактора сообщает родительскому
 * окну о правках. Скрытые разделы не рисуются: вернуть их можно из панели
 * редактора.
 */
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { getTheme, listBlocks } from "@/server/repositories/invites";
import { formatEventDateTime } from "@/lib/format-datetime";
import { html } from "@/server/guest-html/layout";
import { coupleNames, invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { EVERGREEN_EDITOR_CSS } from "@/server/guest-html/evergreen/style";
import { INLINE_EDITOR_CSS, INLINE_EDITOR_SCRIPT } from "@/server/guest-html/inline-editor";

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
  if (!event) return new Response("Не найдено", { status: 404 });

  const visible = blocks.filter((block) => block.visible);
  const body = renderBlocks(visible, null, null, event.eventDate, theme, event.timezone, { editable: true });

  // Скрипт редактора — первым: по его классу шаблоны выключают заставку,
  // появление при прокрутке и шейдеры, которые мешают править.
  // Скрипт самого шаблона нужен только «Тили-тесто»: без него страница
  // остаётся под конвертом. Остальным шаблонам в редакторе анимации ни к чему.
  const scripts = [
    INLINE_EDITOR_SCRIPT,
    theme.template === "evergreen" ? "document.documentElement.classList.add('eg-editing')" : "",
    theme.template === "tili" ? inviteScript(visible, theme, coupleNames(visible, event.title)) ?? "" : "",
  ].filter(Boolean);

  return html(invitePage({
    title: `${event.title} — визуальный редактор`,
    theme,
    noindex: true,
    extraCss: `${INLINE_EDITOR_CSS}${theme.template === "evergreen" ? EVERGREEN_EDITOR_CSS : ""}`,
    body: `${body}<p class="foot">${formatEventDateTime(event.eventDate, event.timezone)}</p>`,
    script: scripts.join(";"),
  }), {
    headers: { "cache-control": "private, no-store" },
  });
}
