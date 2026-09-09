import { PROMISE_TEMPLATE } from "@/lib/invite-templates/promise";
import { readBlockContent } from "@/lib/invite-blocks";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

/** Public, read-only sample. Never reads or changes a real event. */
export function GET() {
  const blocks: InviteBlockView[] = PROMISE_TEMPLATE.blocks.map((block, index) => {
    const content = block.type === "COVER"
      ? { ...block.content, names: "Анна и Михаил" }
      : block.type === "VENUE"
        ? { ...block.content, name: "Вилла у моря", address: "Италия, побережье Амальфи" }
        : block.content;
    return { id: `promise-demo-${index}`, type: block.type, order: index, visible: true, ...readBlockContent(block.type, content) };
  });
  const date = new Date("2027-08-21T14:00:00Z");
  const { theme } = PROMISE_TEMPLATE;
  return new Response(invitePage({
    title: "Обещание — макет приглашения",
    theme,
    noindex: true,
    body: `<p class="who">Обещание · пример оформления</p>${renderBlocks(blocks, null, null, date, theme, "Europe/Rome")}<p class="foot">Образец шаблона. Имена, фотографии, место и тексты меняются в редакторе приглашения.</p>`,
    script: inviteScript(blocks, theme, "Анна и Михаил"),
  }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}
