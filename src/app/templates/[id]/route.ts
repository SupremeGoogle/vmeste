/**
 * Образец шаблона по его идентификатору: /templates/story.
 *
 * Раньше такой маршрут был один и жёстко знал про единственный шаблон.
 * Витрине же нужно «посмотреть, как выглядит» для любого из них, а мне —
 * возможность открыть шаблон, не применяя его к настоящему мероприятию
 * и не затирая чужой текст.
 *
 * Страница ничего не читает из базы и ничего в ней не меняет.
 */
import { notFound } from "next/navigation";
import { findTemplate } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";

/** Пример вместо плейсхолдера: пустая обложка не показывает оформление. */
const SAMPLE_NAMES = "Анна и Михаил";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = findTemplate(id);
  if (!template) notFound();

  const blocks: InviteBlockView[] = template.blocks.map((block, index) => {
    const content =
      block.type === "COVER"
        ? { ...block.content, names: SAMPLE_NAMES }
        : block.type === "VENUE"
          ? { ...block.content, name: "Усадьба Гребнево", address: "Московская область" }
          : block.content;
    return {
      id: `${template.id}-demo-${index}`,
      type: block.type,
      order: index,
      visible: true,
      ...readBlockContent(block.type, content),
    };
  });

  // Дата в будущем — иначе обратный отсчёт показывает «праздник прошёл»
  // и образец выглядит сломанным.
  const date = new Date("2027-07-11T14:00:00Z");
  const { theme } = template;

  return new Response(
    invitePage({
      title: `${template.name} — образец приглашения`,
      theme,
      noindex: true,
      body: `${renderBlocks(blocks, null, null, date, theme, "Europe/Moscow")}<p class="foot">Образец шаблона. Имена, фотографии, место и тексты меняются в редакторе.</p>`,
      script: inviteScript(blocks, theme, SAMPLE_NAMES),
    }),
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } },
  );
}
