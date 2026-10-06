/**
 * Приглашение в режиме визуального редактора — для любого шаблона.
 *
 * Страница та же, что видит гость, но поля помечены (см.
 * `guest-html/inline-editor.ts`), а скрипт редактора сообщает родительскому
 * окну о правках. Скрытые разделы не рисуются: вернуть их можно из панели
 * редактора.
 */
import { requireEventContext } from "@/server/context";
import { findTemplate } from "@/lib/invite-templates";
import { getEvent } from "@/server/repositories/events";
import { getTheme, listBlocks } from "@/server/repositories/invites";
import { formatEventDateTime } from "@/lib/format-datetime";
import { html } from "@/server/guest-html/layout";
import { coupleNames, invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import { CONSTELLATION_EDITOR_CSS } from "@/server/guest-html/constellation/style";
import { EVERGREEN_EDITOR_CSS } from "@/server/guest-html/evergreen/style";
import { SILK_EDITOR_CSS } from "@/server/guest-html/silk/style";
import { PEARL_EDITOR_CSS } from "@/server/guest-html/pearl/style";
import { PRISM_EDITOR_CSS } from "@/server/guest-html/prism/style";
import { RUBY_EDITOR_CSS } from "@/server/guest-html/ruby/style";
import { TUSCANY_EDITOR_CSS } from "@/server/guest-html/tuscany/style";
import { VINYL_EDITOR_CSS } from "@/server/guest-html/vinyl/style";
import { AQUARELLE_EDITOR_CSS } from "@/server/guest-html/aquarelle/style";
import { LILY_EDITOR_CSS } from "@/server/guest-html/lily/style";
import { INLINE_EDITOR_CSS, INLINE_EDITOR_SCRIPT } from "@/server/guest-html/inline-editor";
import { loadWishlist } from "@/server/guest-html/wishlist";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const [event, blocks, currentTheme] = await Promise.all([
    getEvent(ctx, eventId),
    listBlocks(ctx),
    getTheme(ctx),
  ]);
  if (!event) return new Response("Не найдено", { status: 404 });
  const url = new URL(request.url);
  const template = findTemplate(url.searchParams.get("template") ?? "");
  const preview = url.searchParams.get("preview") === "1";
  const theme = template ? { ...template.theme, wedding: currentTheme.wedding, musicUrl: currentTheme.musicUrl } : currentTheme;

  const visible = blocks.filter((block) => block.visible);
  // Подарки — настоящие; в редакторе раздел ведёт к их списку.
  const wishlist = { ...(await loadWishlist(eventId)), manageHref: `/app/e/${eventId}/invite/wishlist` };
  const body = renderBlocks(visible, null, null, event.eventDate, theme, event.timezone, { editable: !preview, wishlist });

  // Скрипт редактора — первым: по его классу шаблоны выключают заставку,
  // появление при прокрутке и шейдеры, которые мешают править.
  // Скрипт самого шаблона нужен только «Тили-тесто»: без него страница
  // остаётся под конвертом. Остальным шаблонам в редакторе анимации ни к чему.
  const scripts = preview ? [inviteScript(visible, theme, coupleNames(visible, event.title)) ?? ""] : [
    INLINE_EDITOR_SCRIPT,
    theme.template === "evergreen" ? "document.documentElement.classList.add('eg-editing')" : "",
    theme.template === "tili" ? inviteScript(visible, theme, coupleNames(visible, event.title)) ?? "" : "",
  ].filter(Boolean);

  return html(invitePage({
    title: `${event.title} — визуальный редактор`,
    styleMeta: true,
    theme,
    noindex: true,
    extraCss: preview ? "" : `${INLINE_EDITOR_CSS}${theme.template === "constellation" ? CONSTELLATION_EDITOR_CSS : ""}${theme.template === "evergreen" ? EVERGREEN_EDITOR_CSS : ""}${theme.template === "silk" ? SILK_EDITOR_CSS : ""}${theme.template === "pearl" ? PEARL_EDITOR_CSS : ""}${theme.template === "prism" ? PRISM_EDITOR_CSS : ""}${theme.template === "ruby" ? RUBY_EDITOR_CSS : ""}${theme.template === "tuscany" ? TUSCANY_EDITOR_CSS : ""}${theme.template === "vinyl" ? VINYL_EDITOR_CSS : ""}${theme.template === "aquarelle" ? AQUARELLE_EDITOR_CSS : ""}${theme.template === "lily" ? LILY_EDITOR_CSS : ""}`,
    body: `${body}<p class="foot">${formatEventDateTime(event.eventDate, event.timezone)}</p>`,
    script: scripts.join(";"),
  }), {
    headers: { "cache-control": "private, no-store" },
  });
}
