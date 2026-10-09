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
import { findTemplate, templateSampleNames } from "@/lib/invite-templates";
import { hasTemplateIntro } from "@/server/guest-html/invite-html";
import { FONT_CHOICES, isFontChoice } from "@/server/guest-html/invite-style";
import { inviteImageSlots } from "@/lib/invite-image-slots";
import { TemplatePicker } from "@/components/invite/template-picker";
import { BLOCK_ORDER, PERMANENT_BLOCKS, SINGLE_BLOCKS, blockLabel, blockProblemEn } from "@/lib/invite-blocks";
import type { BlockType } from "@/generated/prisma/enums";
import { listAssets, listAudioAssets } from "@/server/services/assets";
import { VisualInviteEditor, type BlockAction } from "@/components/invite/visual-invite-editor";
import { WeddingPanel } from "@/components/invite/wedding-panel";
import { saveWeddingProfile, savePhotoAdjustment } from "@/server/repositories/invites";
import { discardDraft, getDraftState, saveSnapshot } from "@/server/repositories/invite-draft";
import { PublishControls } from "@/components/invite/publish-controls";
import { loadBuilder } from "./form/actions";
import { listRsvpQuestions, updateRsvpQuestion } from "@/server/repositories/rsvp-questions";
import { addDrinkOption, addMealOption } from "@/server/repositories/events";
import { RsvpFormBuilder } from "./form/rsvp-form-builder";
import { weddingSchema, invitationWarnings, personalizeBlocks, fromLocalInput, toLocalInput, type PhotoAdjustment } from "@/lib/invite-personalization";
import { getT, getUiLang } from "@/server/i18n";
import { makeT, parseLang, type Lang } from "@/lib/i18n";
import { TEMPLATE_COPY_EN } from "@/app/(app)/_landing/templates-en";

export const dynamic = "force-dynamic";

/** Подсказки «Перед отправкой» (`invitationWarnings`) по-английски — по русскому тексту. */
const EN_WARNINGS: Record<string, string> = {
  "Укажите имена, дату и место торжества — кнопка «Имена, дата и место».": "Add the names, date and venue — use the “Names, date & venue” button.",
  "В приглашении остались фотографии-примеры. Замените их своими или уберите.": "The invitation still has sample photos. Replace them with your own or remove them.",
  "Укажите адрес площадки.": "Add the venue address.",
  "Срок ответа не указан — гости смогут ответить без ограничения по дате.": "No RSVP deadline is set — guests can reply at any time.",
  "Проверьте незаполненные имена, название площадки и адрес.": "Check for placeholder names, venue name and address.",
};

/** Отказы репозитория приглашения (server/repositories/invites.ts) — по-английски, по русскому тексту. */
const EN_PROBLEMS: Record<string, string> = {
  "Эту надпись нельзя менять": "This label can’t be changed",
  "Надпись не сохранилась": "The label wasn’t saved",
  "Элемент не найден": "Element not found",
  "Раздел не найден": "Section not found",
  "Не удалось сохранить элемент": "Couldn’t save the element",
  "Это поле нельзя менять на странице": "This field can’t be edited on the page",
  "Поле больше не существует": "This field no longer exists",
  "Дату и город измените в панели «Имена, дата и место» — нажмите на дату.": "Change the date and city in “Names, date & venue” — tap the date.",
  "Не получилось сохранить": "Couldn’t save",
  "Блок «Этот день» не найден": "The day plan section wasn’t found",
  "Можно добавить не больше 30 деталей": "You can add up to 30 items",
  "Не получилось добавить деталь": "Couldn’t add the item",
  "Деталь дня не найдена": "Item not found",
  "Блок тайминга не найден": "The day plan section wasn’t found",
  "Деталь дня уже удалена": "This item was already removed",
  "Не получилось удалить деталь": "Couldn’t remove the item",
  "Такой раздел уже есть — он может быть только один. Покажите его, если он скрыт.": "This section already exists and there can only be one. Show it if it’s hidden.",
  "Раздел не найден — обновите страницу": "Section not found — please refresh the page",
  "Этот раздел может быть только один": "There can only be one of this section",
  "Обложку можно изменить, но не убрать: на ней имена пары": "The cover can be edited but not removed — it holds the couple’s names",
  "Некорректные настройки фотографии": "Invalid photo settings",
  "Фотография не найдена": "Photo not found",
  "Это не поле фотографии": "This isn’t a photo field",
  "Сначала заполните предыдущую фотографию": "Fill in the previous photo first",
  "Не удалось сохранить фотографию": "Couldn’t save the photo",
};

/** Сообщение об отказе на языке кабинета: русские тексты репозитория и схем блоков. */
function problemIn(lang: Lang, message: string): string {
  return lang === "en" ? EN_PROBLEMS[message] ?? blockProblemEn(message) : message;
}

/** Ответ действия с переведённым сообщением об отказе. */
async function localized<R extends { ok: boolean; message?: string }>(result: R): Promise<R> {
  if (result.ok || !result.message) return result;
  return { ...result, message: problemIn(await getUiLang(), result.message) };
}

/** Короткая подпись раздела в списке: его заголовок, если он есть. */
function sectionHint(content: unknown): string {
  const value = content && typeof content === "object" ? (content as Record<string, unknown>) : {};
  const text = [value.title, value.names, value.tag].find((item) => typeof item === "string" && item.trim());
  return typeof text === "string" ? text.trim().slice(0, 60) : "";
}

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; edit?: string; rsvp?: string }>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { error, edit, rsvp } = await searchParams;
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
  const blocks = personalizeBlocks(storedBlocks, theme, event.eventDate, event.timezone, templateSampleNames(theme.template));
  const lang = await getUiLang();
  const t = makeT(lang);
  const templateName = (id: string) => (lang === "en" ? TEMPLATE_COPY_EN[id]?.name : undefined) ?? findTemplate(id)?.name;

  /** Сброс кеша приглашения по обоим тегам: именная страница помечена id,
   *  публичная — слагом (тег задаётся до того, как известен id). */
  async function invalidate(slug: string) {
    "use server";
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(slug));
    revalidatePath(`/app/e/${eventId}/invite`);
  }

  /** Публикация: снимок черновика уходит гостям, статус — «опубликовано». */
  async function publish() {
    "use server";
    const ctx = await requireEventContext(eventId);
    const t = await getT();
    if (!(await saveSnapshot(ctx))) return { ok: false, message: t("Не получилось опубликовать — обновите страницу", "Couldn’t publish — please refresh the page") } as const;
    await setEventStatus(ctx, eventId, "PUBLISHED");
    const published = await getEvent(ctx, eventId);
    if (published) notifyPublished(published.title, `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/i/${published.slug}`);
    await invalidate(eventSlug);
    return { ok: true, path: `/i/${eventSlug}` } as const;
  }

  async function unpublish() {
    "use server";
    const ctx = await requireEventContext(eventId);
    await setEventStatus(ctx, eventId, "DRAFT");
    await invalidate(eventSlug);
    return { ok: true, path: `/i/${eventSlug}` } as const;
  }

  /** «Сохранить изменения»: гости начинают видеть черновик. */
  async function saveChanges() {
    "use server";
    const ctx = await requireEventContext(eventId);
    const t = await getT();
    if (!(await saveSnapshot(ctx))) return { ok: false, message: t("Не получилось сохранить — обновите страницу", "Couldn’t save — please refresh the page") } as const;
    await invalidate(eventSlug);
    return { ok: true, path: `/i/${eventSlug}` } as const;
  }

  /** «Отменить изменения»: черновик возвращается к тому, что видят гости. */
  async function discardChanges() {
    "use server";
    const ctx = await requireEventContext(eventId);
    const t = await getT();
    if (!(await discardDraft(ctx))) return { ok: false, message: t("Нечего отменять", "Nothing to discard") } as const;
    await invalidate(eventSlug);
    return { ok: true, path: `/i/${eventSlug}` } as const;
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
    return localized(result);
  }

  async function visualBlockAction(input: { blockId: string; action: BlockAction; index?: number; type?: string }) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const problem = await blockActionProblem(ctx, input.action, input.blockId, input.type as BlockType | undefined);
    if (problem) return { ok: false, message: problemIn(await getUiLang(), problem) } as const;
    if (input.action === "insert-after") {
      // Новый раздел ниже выбранного; без раздела — в самое начало.
      const type = String(input.type ?? "") as BlockType;
      if (!BLOCK_ORDER.includes(type)) return { ok: false, message: (await getT())("Такого раздела нет", "That section doesn’t exist") } as const;
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
    if (!saved) return { ok: false, message: (await getT())("Такой цвет или шрифт не подходит", "That color or font can’t be used") } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  /** Заставка шаблона: включить или выключить (стандарт, §3). */
  async function saveIntro(off: boolean) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const saved = await updateTheme(ctx, (current) => ({ ...current, introOff: off }));
    if (!saved) return { ok: false, message: (await getT())("Не получилось сохранить", "Couldn’t save") } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  /** «+ Добавить вариант» в анкете прямо из приглашения. */
  async function addRsvpOption(input: { target: string; title: string }) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const t = await getT();
    const title = String(input.title ?? "").trim().slice(0, 120);
    if (!title) return { ok: false, message: t("Напишите вариант", "Type an option") } as const;
    if (input.target === "drink") await addDrinkOption(ctx, eventId, title);
    else if (input.target === "meal") await addMealOption(ctx, eventId, title);
    else if (input.target.startsWith("q:")) {
      const question = (await listRsvpQuestions(ctx)).find((item) => item.id === input.target.slice(2));
      if (!question) return { ok: false, message: t("Вопрос не найден — обновите страницу", "Question not found — please refresh the page") } as const;
      if (question.options.includes(title)) return { ok: false, message: t("Такой вариант уже есть", "That option already exists") } as const;
      await updateRsvpQuestion(ctx, question.id, { options: [...question.options, title] });
    } else return { ok: false, message: t("Не понял, куда добавить", "Not sure where to add this") } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  /** Музыка приглашения хранится в теме: проверка адреса — схемой темы. */
  async function saveMusic(url: string) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const saved = await updateTheme(ctx, (current) => ({ ...current, musicUrl: url }));
    if (!saved) return { ok: false, message: (await getT())("Этот файл нельзя поставить музыкой", "This file can’t be used as music") } as const;
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(eventSlug));
    return { ok: true } as const;
  }

  // Просмотр должен открывать это мероприятие, включая черновик. Общий
  // слаг уникален лишь внутри организации и может вести к чужой публикации.
  const previewHref = `/app/e/${eventId}/invite/canvas?preview=1`;
  async function saveWedding(form: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const latest = await getEvent(ctx, eventId);
    if (!latest) notFound();
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const date = fromLocalInput(text("eventDate"), latest.timezone);
    const deadline = text("deadline") ? fromLocalInput(`${text("deadline")}T23:59`, latest.timezone) : null;
    const parsed = weddingSchema.safeParse({ ...Object.fromEntries(form), childhood: form.get("childhood") === "on", deadline: deadline?.toISOString() ?? "" });
    if (!date || (text("deadline") && !deadline) || !parsed.success || (deadline && date && deadline > date)) redirect(`/app/e/${eventId}/invite?edit=1&error=${encodeURIComponent((await getT())("Проверьте имена, дату, ссылку на карту и срок ответа — он должен быть не позже свадьбы.", "Check the names, date, map link and RSVP deadline — the deadline can’t be after the wedding."))}`);
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
    return localized(result);
  }
  // Имена по умолчанию попадут на обложку — на языке мероприятия, как и всё, что видят гости.
  const wedding = theme.wedding ?? weddingSchema.parse({ names: event.title || (event.language === "en" ? "Our wedding" : "Наша свадьба"), city: "", venueName: event.venueName ?? "", venueAddress: event.venueAddr ?? "", mapUrl: "" });
  const warnings = invitationWarnings(personalizeBlocks(blocks, theme, event.eventDate, event.timezone, templateSampleNames(theme.template)), theme)
    .map((warning) => (lang === "en" ? EN_WARNINGS[warning] ?? warning : warning));
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
  const [draft, rsvpState] = showEditor ? await Promise.all([getDraftState(ctx), loadBuilder(eventId)]) : [null, null];

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
          <h1 className="text-xl text-stone-900">{t("Приглашение", "Invitation")}</h1>
          <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/app/e/${eventId}/invite/print`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-card px-4 text-sm font-medium text-stone-800 transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 7V2.5h10V7M5 14.5H3.5A1.5 1.5 0 0 1 2 13V8.5A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5V13a1.5 1.5 0 0 1-1.5 1.5H15M5 11.5h10v6H5z" strokeLinejoin="round" /></svg>
            {t("Печатное приглашение", "Printed invitation")}
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
              {t(`Приглашение уже собрано — разделов: ${blocks.length}. Другой дизайн можно примерить, тексты и фотографии сохранятся.`, `Your invitation is already set up — sections: ${blocks.length}. You can try another design; your text and photos will be kept.`)}
            </p>
            <a
              href={`/app/e/${eventId}/invite?edit=1`}
              className="flex min-h-11 items-center rounded-lg bg-stone-900 px-5 text-sm font-medium text-white transition-[opacity,transform] duration-200 ease-[var(--ease-soft)] hover:opacity-90 active:scale-[0.97]"
            >
              {t("Продолжить редактирование", "Continue editing")}
            </a>
          </div>
        ) : null}

        <div className="mt-6">
          <TemplatePicker
            action={chooseTemplate}
            currentId={theme.template}
            slug={event.slug}
            lang={lang}
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
          <a href={`/app/e/${eventId}/invite`} className="text-sm text-stone-500 hover:text-stone-900">{t("← Все шаблоны", "← All templates")}</a>
          <h1 className="mt-1 text-xl text-stone-900">{templateName(theme.template) ?? t("Приглашение", "Invitation")}</h1>
          <p className="mt-1 hidden text-sm text-stone-500 sm:block">{t("Нажмите прямо на текст, фотографию или дату внутри приглашения.", "Tap any text, photo or date right inside the invitation.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <a
          href={`/app/e/${eventId}/invite/print`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-card px-3 text-sm font-medium sm:min-h-11 sm:px-4 text-stone-800 transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 7V2.5h10V7M5 14.5H3.5A1.5 1.5 0 0 1 2 13V8.5A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5V13a1.5 1.5 0 0 1-1.5 1.5H15M5 11.5h10v6H5z" strokeLinejoin="round" /></svg>
          <span className="sm:hidden">{t("Печать", "Print")}</span><span className="hidden sm:inline">{t("Печатное приглашение", "Printed invitation")}</span>
        </a>
        <PublishControls
          eventId={eventId}
          published={draft?.published ?? false}
          dirty={draft?.dirty ?? false}
          publicPath={`/i/${event.slug}`}
          publish={publish}
          unpublish={unpublish}
          saveChanges={saveChanges}
          discardChanges={discardChanges}
        />
        </div>
      </div>
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {/* Форм над приглашением нет: имена, дата и место открываются в
          боковой панели редактора, а «перед отправкой» — значком в его
          панели инструментов. Редактор начинается сразу с самой страницы. */}
      {theme.previousTemplate && findTemplate(theme.previousTemplate) && <form action={chooseTemplate} className="mb-4"><input type="hidden" name="template" value={theme.previousTemplate} /><input type="hidden" name="slug" value={event.slug} /><button className="text-sm text-stone-600 underline">{t("Вернуть предыдущий дизайн:", "Back to previous design:")} {templateName(theme.previousTemplate)}</button></form>}
      <VisualInviteEditor
        key={`${theme.template}:${JSON.stringify(theme.wedding)}`}
        eventId={eventId}
        template={theme.template}
        canvasSrc={`/app/e/${eventId}/invite/canvas`}
        previewHref={previewHref}
        assets={assets}
        audio={audio}
        musicUrl={theme.musicUrl}
        photoSlots={inviteImageSlots(blocks)}
        hidden={blocks.filter((block) => !block.visible).map((block) => ({ id: block.id, label: blockLabel(block.type, lang) }))}
        sections={blocks.map((block) => ({ id: block.id, type: block.type, label: blockLabel(block.type, lang), hint: sectionHint(block.content), visible: block.visible, single: SINGLE_BLOCKS.includes(block.type), permanent: PERMANENT_BLOCKS.includes(block.type) }))}
        blockTypes={BLOCK_ORDER.filter((type) => !(SINGLE_BLOCKS.includes(type) && blocks.some((block) => block.type === type))).map((type) => ({ type, label: blockLabel(type, lang) }))}
        rsvpBuilder={rsvpState ? <RsvpFormBuilder eventId={eventId} initial={rsvpState} allowPlusOne={event.allowPlusOne} guestLang={parseLang(event.language) ?? "ru"} /> : null}
        rsvpOpen={rsvp === "1"}
        addRsvpOption={addRsvpOption}
        weddingForm={<WeddingPanel variant="plain" value={wedding} date={toLocalInput(event.eventDate, event.timezone)} deadline={event.rsvpDeadline ? toLocalInput(event.rsvpDeadline, event.timezone).slice(0, 10) : ""} timezone={event.timezone} action={saveWedding} warnings={warnings} lang={lang} />}
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
