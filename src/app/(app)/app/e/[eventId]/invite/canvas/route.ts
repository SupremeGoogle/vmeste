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
import { buildInlineRsvp } from "@/server/guest-html/inline-rsvp";
import { RSVP_FIELDS_CSS } from "@/server/guest-html/rsvp-fields";
import { getT } from "@/server/i18n";

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
  const t = await getT();
  if (!event) return new Response(t("Не найдено", "Not found"), { status: 404 });
  const url = new URL(request.url);
  const template = findTemplate(url.searchParams.get("template") ?? "");
  const preview = url.searchParams.get("preview") === "1";
  const theme = template ? { ...template.theme, wedding: currentTheme.wedding, musicUrl: currentTheme.musicUrl } : currentTheme;

  const visible = blocks.filter((block) => block.visible);
  // Подарки — настоящие; управление доступно только в редакторе.
  const wishlist = { ...(await loadWishlist(eventId)), ...(!preview ? { manageHref: `/app/e/${eventId}/invite/wishlist` } : {}) };
  // Анкета — настоящая, с вопросами и вариантами этой свадьбы, а не образец:
  // организатор видит, что увидит гость, и добавляет варианты прямо здесь.
  const rsvp = await buildInlineRsvp(eventId, theme.template, {
    name: "", status: "PENDING", mealOptionId: null, drinkIds: [], answers: [], musicWish: "",
    plusOneAllowed: event.allowPlusOne, comment: "", plusOneName: "", plusOneMealOptionId: null, plusOneDrinkOptionIds: [],
  }, { action: "", saved: false, flash: { error: null, message: null } });
  const body = renderBlocks(visible, null, null, event.eventDate, theme, event.timezone, { editable: !preview, wishlist, rsvp });

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
    title: preview ? event.title : t(`${event.title} — визуальный редактор`, `${event.title} — visual editor`),
    styleMeta: true,
    theme,
    noindex: true,
    extraCss: preview ? RSVP_FIELDS_CSS : `${RSVP_FIELDS_CSS}${INLINE_EDITOR_CSS}${theme.template === "constellation" ? CONSTELLATION_EDITOR_CSS : ""}${theme.template === "evergreen" ? EVERGREEN_EDITOR_CSS : ""}${theme.template === "silk" ? SILK_EDITOR_CSS : ""}${theme.template === "pearl" ? PEARL_EDITOR_CSS : ""}${theme.template === "prism" ? PRISM_EDITOR_CSS : ""}${theme.template === "ruby" ? RUBY_EDITOR_CSS : ""}${theme.template === "tuscany" ? TUSCANY_EDITOR_CSS : ""}${theme.template === "vinyl" ? VINYL_EDITOR_CSS : ""}${theme.template === "aquarelle" ? AQUARELLE_EDITOR_CSS : ""}${theme.template === "lily" ? LILY_EDITOR_CSS : ""}`,
    body: `${body}<p class="foot">${formatEventDateTime(event.eventDate, event.timezone)}</p>`,
    script: scripts.join(";"),
  }), {
    headers: { "cache-control": "private, no-store" },
  });
}
