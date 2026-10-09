/**
 * Отдельная страница подарков — то, что открывает кнопка «Открыть
 * виш-лист» в приглашении. Оформление то же, что у приглашения: шапку
 * раздела рисует шаблон, под ней вся сетка подарков и реквизиты.
 */
import type { InviteTheme } from "@/lib/invite-theme";
import type { InviteBlockView } from "@/server/repositories/invites";
import { esc } from "@/server/guest-html/layout";
import { gl } from "@/server/guest-html/guest-lang";
import { coupleNames, invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { WishlistData } from "@/server/guest-html/wishlist";

export function wishlistPage(opts: {
  title: string;
  theme: InviteTheme;
  blocks: InviteBlockView[];
  eventDate: Date;
  timezone: string;
  wishlist: WishlistData;
  back: string;
}): string | null {
  const block = opts.blocks.find((item) => item.type === "WISHLIST" && item.visible);
  if (!block) return null;
  const body = `<div class="links" style="margin:0;padding-top:1.25rem"><a href="${esc(opts.back)}">← ${gl("К приглашению", "Invitation")}</a></div>${renderBlocks(
    [block], null, null, opts.eventDate, opts.theme, opts.timezone, { wishlist: opts.wishlist, wishlistPage: true },
  )}<div class="links" style="margin:1.5rem 0 3rem"><a href="${esc(opts.back)}">${gl("Вернуться к приглашению", "Back to the invitation")}</a></div>`;
  return invitePage({
    title: `${gl("Виш-лист", "Gift list")} — ${opts.title}`,
    theme: opts.theme,
    noindex: true,
    body,
    script: inviteScript([block], opts.theme, coupleNames(opts.blocks, opts.title)),
  });
}
