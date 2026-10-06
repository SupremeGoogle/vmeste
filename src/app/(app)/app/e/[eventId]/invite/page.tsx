/**
 * Конструктор приглашения.
 *
 * Два экрана в одном месте, а не два маршрута: пока у мероприятия нет ни
 * одного раздела — это выбор шаблона и больше ничего, никакой панели
 * оформления и списка блоков поверх пустоты. Как только шаблон применён,
 * тот же экран становится редактором содержимого: организатор правит
 * текст и фотографии, убирает разделы, которые не нужны, и видит
 * результат в предпросмотре справа. Условие простое — `blocks.length`,
 * и оно верно ровно тогда, когда шаблон применён по-настоящему, а не
 * просто выбран на витрине.
 *
 * Оформление (цвета, шрифты, форма углов) сюда не вынесено: шаблон один,
 * и он уже задаёт вид, скопированный с образца, — крутить в нём цвета
 * значит перестать быть тем образцом. Раздел «Оформление» и его форма
 * остаются в репозитории на случай, если шаблонов станет больше и
 * настройка снова понадобится.
 *
 * Блоки правятся обычными формами, порядок — стрелками. Перетаскивание
 * здесь сознательно не сделано, хотя на рассадке оно есть: блоков
 * десяток, их переставляют один раз, и стрелка работает и с клавиатуры,
 * и пальцем. Вся сложность dnd на этом экране не окупается.
 *
 * Каждая правка сбрасывает кеш приглашения: `updateTag` вместо
 * `revalidateTag`, потому что организатор сразу жмёт «посмотреть» и обязан
 * увидеть свою правку, а не версию из кеша (read-your-own-writes).
 */
import { notifyPublished } from "@/server/notify/events";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent, setEventStatus } from "@/server/repositories/events";
import {
  appendTimelineItem, applyTemplate, deleteBlock, eventTag, getTheme, inviteSlugTag, listBlocks,
  moveBlock, removeTimelineItem, setBlockVisible, updateInlineBlockField,
  duplicateBlock, insertBlockAfter, moveBlockTo, blockActionProblem, updateTheme,
} from "@/server/repositories/invites";
import { findTemplate } from "@/lib/invite-templates";
import { hasTemplateIntro } from "@/server/guest-html/invite-html";
import { FONT_CHOICES, isFontChoice } from "@/server/guest-html/invite-style";
import { inviteImageSlots } from "@/lib/invite-image-slots";
import { TemplatePicker } from "@/components/invite/template-picker";
import { BLOCK_LABELS, BLOCK_ORDER, PERMANENT_BLOCKS, SINGLE_BLOCKS } from "@/lib/invite-blocks";
import type { BlockType } from "@/generated/prisma/enums";
import { listAssets, listAudioAssets } from "@/server/services/assets";
import { VisualInviteEditor, type BlockAction } from "@/components/invite/visual-invite-editor";
import { WeddingPanel } from "@/components/invite/wedding-panel";
import { saveWeddingProfile, savePhotoAdjustment } from "@/server/repositories/invites";
import { weddingSchema, invitationWarnings, personalizeBlocks, fromLocalInput, toLocalInput, type PhotoAdjustment } from "@/lib/invite-personalization";

export const dynamic = "force-dynamic";

/** Короткая подпись раздела в списке: его заголовок, если он есть. */
function sectionHint(content: unknown): string {
  const value = content && typeof content === "object" ? (content as Record<string, unknown>) : {};
  const text = [value.title, value.names, value.tag].find((item) => typeof item === "string" && item.trim());
  return typeof text === "string" ? text.trim().slice(0, 60) : "";
}

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; edit?: string }>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { error, edit } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const eventSlug = event.slug;
  const [storedBlocks, theme, assets, audio] = await Promise.all([
    listBlocks(ctx),
    getTheme(ctx),
    listAssets(ctx),
    listAudioAssets(ctx),
  ]);
  const blocks = personalizeBlocks(storedBlocks, theme, event.eventDate, event.timezone);

  /** Сброс кеша приглашения по обоим тегам: именная страница помечена id,
   *  публичная — слагом (тег задаётся до того, как известен id). */
  async function invalidate(slug: string) {
    "use server";
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(slug));
    revalidatePath(`/app/e/${eventId}/invite`);
  }

  async function publish(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    await setEventStatus(ctx, eventId, status);
    const slug = String(formData.get("slug") ?? "");
    if (status === "PUBLISHED") {
      const published = await getEvent(ctx, eventId);
      if (published) notifyPublished(published.title, `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/i/${published.slug}`);
    }
    await invalidate(slug);
  }

  async function chooseTemplate(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await applyTemplate(ctx, String(formData.get("template") ?? ""), formData.get("reset") === "1");
    await invalidate(String(formData.get("slug") ?? ""));
    // Выбор шаблона — это и есть «открыть его»: сразу уводим в редактор,
    // иначе человек остаётся на витрине и не понимает, applied ли выбор.
    redirect(`/app/e/${eventId}/invite?edit=1`);
  }

  async function saveInline(input: { blockId: string; path: string; value: string }) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const result = await updateInlineBlockField(ctx, input.blockId, input.path, input.value);
    if (result.ok) {
      updateTag(eventTag(eventId));
      updateTag(inviteSlugTag(eventSlug));
    }
    return result;
  }

  async function visualBlockAction(input: { blockId: string; action: BlockAction; index?: number; type?: string }) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const problem = await blockActionProblem(ctx, input.action, input.blockId, input.type as BlockType | undefined);
    if (problem) return { ok: false, message: problem } as const;
    if (input.action === "insert-after") {
      // Новый раздел ниже выбранного; без раздела — в самое начало.
      const type = String(input.type ?? "") as BlockType;
      if (!BLOCK_ORDER.includes(type)) return { ok: false, message: "Такого раздела нет" } as const;
      await insertBlockAfter(ctx, type, input.blockId || null);
    } else if (input.action === "duplicate") await duplicateBlock(ctx, input.blockId);
    else if (input.action === "delete") await deleteBlock(ctx, input.blockId);
    else if (input.action === "move-to") await moveBlockTo(ctx, input.blockId, input.index ?? 0);
    else if (input.action === "up") await moveBlock(ctx, input.blockId, -1);
    else if (input.action === "down") await moveBlock(ctx, input.blockId, 1);
    else if (input.action === "hide") await setBlockVisible(ctx, input.blockId, false);
    else if (input.action === "show") await setBlockVisible(ctx, input.blockId, true);
    else if (input.action === "add-detail") {
      const result = await appendTimelineItem(ctx, input.blockId);
      if (!result.ok) return result;
    } else {
      const result = await removeTimelineItem(ctx, input.blockId, input.index ?? -1);
      if (!result.ok) return result;
    }
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  /** Свои цвета и шрифты поверх шаблона (стандарт, §4). Пусто — как в образце. */
  async function saveStyle(input: { accent: string | null; fonts: Record<string, string> }) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const fonts = Object.fromEntries(Object.entries(input.fonts ?? {}).filter(([from, to]) => from && to && from !== to && isFontChoice(to)).slice(0, 8));
    const style = { ...(input.accent ? { accent: input.accent } : {}), ...(Object.keys(fonts).length ? { fonts } : {}) };
    const saved = await updateTheme(ctx, (current) => ({ ...current, style: Object.keys(style).length ? style : undefined }));
    if (!saved) return { ok: false, message: "Такой цвет или шрифт не подходит" } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  /** Заставка шаблона: включить или выключить (стандарт, §3). */
  async function saveIntro(off: boolean) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const saved = await updateTheme(ctx, (current) => ({ ...current, introOff: off }));
    if (!saved) return { ok: false, message: "Не получилось сохранить" } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  /** Музыка приглашения хранится в теме: проверка адреса — схемой темы. */
  async function saveMusic(url: string) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const saved = await updateTheme(ctx, (current) => ({ ...current, musicUrl: url }));
    if (!saved) return { ok: false, message: "Этот файл нельзя поставить музыкой" } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  const publicHref = `/i/${event.slug}`;
  async function saveWedding(form: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const latest = await getEvent(ctx, eventId);
    if (!latest) notFound();
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const date = fromLocalInput(text("eventDate"), latest.timezone);
    const deadline = text("deadline") ? fromLocalInput(`${text("deadline")}T23:59`, latest.timezone) : null;
    const parsed = weddingSchema.safeParse({ ...Object.fromEntries(form), childhood: form.get("childhood") === "on", deadline: deadline?.toISOString() ?? "" });
    if (!date || (text("deadline") && !deadline) || !parsed.success || (deadline && date && deadline > date)) redirect(`/app/e/${eventId}/invite?edit=1&error=${encodeURIComponent("Проверьте имена, дату, ссылку на карту и срок ответа — он должен быть не позже свадьбы.")}`);
    await saveWeddingProfile(ctx, parsed.data, date, deadline);
    await invalidate(eventSlug);
    revalidatePath(`/app/e/${eventId}/settings`);
    redirect(`/app/e/${eventId}/invite?edit=1`);
  }
  async function savePhoto(input: { blockId: string; path: string; url: string; settings: PhotoAdjustment }) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const result = await savePhotoAdjustment(ctx, input.blockId, input.path, input.settings, input.url);
    if (result.ok) await invalidate(eventSlug);
    return result;
  }
  const wedding = theme.wedding ?? weddingSchema.parse({ names: event.title || "Наша свадьба", city: "", venueName: event.venueName ?? "", venueAddress: event.venueAddr ?? "", mapUrl: "" });
  const warnings = invitationWarnings(personalizeBlocks(blocks, theme, event.eventDate, event.timezone), theme);
  const hasInvite = blocks.length > 0;

  /*
   * Витрина шаблонов — точка входа в раздел, а не запасной экран.
   *
   * Раньше условием был `blocks.length`, и у любого мероприятия с уже
   * заведёнными разделами витрина не показывалась никогда: человек
   * попадал сразу в редактор чужого приглашения и даже не знал, что
   * шаблоны есть. Теперь «Приглашение» всегда открывается выбором,
   * а редактор живёт за `?edit=1` — туда уводит и клик по шаблону,
   * и кнопка «Продолжить редактирование» для уже начатого.
   */
  const showEditor = (edit === "1" || edit === "classic") && hasInvite;

  if (!showEditor) {
    // Витрина — это выбор шаблона и ничего больше. Имена, дата и место
    // («Наша свадьба») спрашиваются в редакторе, куда ведёт любой шаблон:
    // до выбора дизайна эта форма — стена текста перед тем единственным,
    // зачем сюда пришли.
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Печатное приглашение — не отдельный раздел, а вторая версия
            того же приглашения: кнопка здесь, а не вкладка в ленте. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl text-stone-900">Приглашение</h1>
          <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/app/e/${eventId}/invite/print`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-card px-4 text-sm font-medium text-stone-800 transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 7V2.5h10V7M5 14.5H3.5A1.5 1.5 0 0 1 2 13V8.5A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5V13a1.5 1.5 0 0 1-1.5 1.5H15M5 11.5h10v6H5z" strokeLinejoin="round" /></svg>
            Печатное приглашение
          </a>
          <a
            href={`/app/e/${eventId}/invite/form`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-card px-4 text-sm font-medium text-stone-800 transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3.5" y="2.5" width="13" height="15" rx="2" /><path d="M7 7h6M7 10.5h6M7 14h3.5" strokeLinecap="round" /></svg>
            Анкета гостя
          </a>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {/* У кого приглашение уже собрано — короткий путь назад в работу.
            Без него выбор шаблона был бы единственным выходом с витрины,
            то есть «продолжить» означало бы «затереть написанное». */}
        {hasInvite ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-card px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-stone-500">
              Приглашение уже собрано — разделов: {blocks.length}. Другой дизайн
              можно примерить, тексты и фотографии сохранятся.
            </p>
            <a
              href={`/app/e/${eventId}/invite?edit=1`}
              className="flex min-h-11 items-center rounded-lg bg-stone-900 px-5 text-sm font-medium text-white transition-[opacity,transform] duration-200 ease-[var(--ease-soft)] hover:opacity-90 active:scale-[0.97]"
            >
              Продолжить редактирование
            </a>
          </div>
        ) : null}

        <div className="mt-6">
          <TemplatePicker
            action={chooseTemplate}
            currentId={theme.template}
            slug={event.slug}
          />
        </div>
      </main>
    );
  }

  // Редактор один — визуальный, для любого шаблона.
  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      {/* На телефоне шапка — две строки: название и три короткие кнопки.
          Подсказка «нажмите на текст» есть и в панели редактора. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:mb-4">
        <div className="min-w-0">
          <a href={`/app/e/${eventId}/invite`} className="text-sm text-stone-500 hover:text-stone-900">← Все шаблоны</a>
          <h1 className="mt-1 text-xl text-stone-900">{findTemplate(theme.template)?.name ?? "Приглашение"}</h1>
          <p className="mt-1 hidden text-sm text-stone-500 sm:block">Нажмите прямо на текст, фотографию или дату внутри приглашения.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <a
          href={`/app/e/${eventId}/invite/print`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-card px-3 text-sm font-medium sm:min-h-11 sm:px-4 text-stone-800 transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 7V2.5h10V7M5 14.5H3.5A1.5 1.5 0 0 1 2 13V8.5A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5V13a1.5 1.5 0 0 1-1.5 1.5H15M5 11.5h10v6H5z" strokeLinejoin="round" /></svg>
          <span className="sm:hidden">Печать</span><span className="hidden sm:inline">Печатное приглашение</span>
        </a>
        <a
          href={`/app/e/${eventId}/invite/form`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-card px-3 text-sm font-medium sm:min-h-11 sm:px-4 text-stone-800 transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3.5" y="2.5" width="13" height="15" rx="2" /><path d="M7 7h6M7 10.5h6M7 14h3.5" strokeLinecap="round" /></svg>
          Анкета<span className="hidden sm:inline"> гостя</span>
        </a>
        <form action={publish}>
          <input type="hidden" name="slug" value={event.slug} />
          <input type="hidden" name="status" value={event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
          <button className="min-h-10 rounded-lg border border-stone-300 bg-card px-3 text-sm text-stone-800 sm:min-h-11 sm:px-4" data-rybbit-event={event.status === "PUBLISHED" ? "invite_unpublish" : "invite_publish"}>
            {event.status === "PUBLISHED" ? "Снять с публикации" : "Опубликовать"}
          </button>
        </form>
        </div>
      </div>
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {/* Форм над приглашением нет: имена, дата и место открываются в
          боковой панели редактора, а «перед отправкой» — значком в его
          панели инструментов. Редактор начинается сразу с самой страницы. */}
      {theme.previousTemplate && findTemplate(theme.previousTemplate) && <form action={chooseTemplate} className="mb-4"><input type="hidden" name="template" value={theme.previousTemplate} /><input type="hidden" name="slug" value={event.slug} /><button className="text-sm text-stone-600 underline">Вернуть предыдущий дизайн: {findTemplate(theme.previousTemplate)?.name}</button></form>}
      <VisualInviteEditor
        key={`${theme.template}:${JSON.stringify(theme.wedding)}`}
        eventId={eventId}
        template={theme.template}
        canvasSrc={`/app/e/${eventId}/invite/canvas`}
        publicHref={publicHref}
        assets={assets}
        audio={audio}
        musicUrl={theme.musicUrl}
        photoSlots={inviteImageSlots(blocks)}
        hidden={blocks.filter((block) => !block.visible).map((block) => ({ id: block.id, label: BLOCK_LABELS[block.type] }))}
        sections={blocks.map((block) => ({ id: block.id, type: block.type, label: BLOCK_LABELS[block.type], hint: sectionHint(block.content), visible: block.visible, single: SINGLE_BLOCKS.includes(block.type), permanent: PERMANENT_BLOCKS.includes(block.type) }))}
        blockTypes={BLOCK_ORDER.filter((type) => !(SINGLE_BLOCKS.includes(type) && blocks.some((block) => block.type === type))).map((type) => ({ type, label: BLOCK_LABELS[type] }))}
        weddingForm={<WeddingPanel variant="plain" value={wedding} date={toLocalInput(event.eventDate, event.timezone)} deadline={event.rsvpDeadline ? toLocalInput(event.rsvpDeadline, event.timezone).slice(0, 10) : ""} timezone={event.timezone} action={saveWedding} warnings={warnings} />}
        weddingReady={Boolean(theme.wedding)}
        warnings={warnings}
        saveField={saveInline}
        blockAction={visualBlockAction}
        saveMusic={saveMusic}
        introAvailable={hasTemplateIntro(theme.template)}
        introOff={theme.introOff === true}
        saveIntro={saveIntro}
        style={{ accent: theme.style?.accent ?? null, fonts: theme.style?.fonts ?? {} }}
        saveStyle={saveStyle}
        fontChoices={FONT_CHOICES.map((font) => ({ family: font.family, kind: font.kind }))}
        savePhoto={savePhoto}
      />
    </main>
  );
}
