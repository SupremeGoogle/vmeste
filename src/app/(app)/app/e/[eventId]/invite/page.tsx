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
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent, setEventStatus } from "@/server/repositories/events";
import {
  addBlock, applyTemplate, deleteBlock, eventTag, getTheme, inviteSlugTag, listBlocks,
  moveBlock, setBlockVisible, updateBlockContent,
} from "@/server/repositories/invites";
import { blockContentFromForm } from "@/server/services/invite-forms";
import { TemplatePicker } from "@/components/invite/template-picker";
import { InvitePreview } from "@/components/invite/preview";
import { ConfirmButton } from "@/components/invite/confirm-button";
import { BLOCK_LABELS, BLOCK_ORDER } from "@/lib/invite-blocks";
import type { BlockType } from "@/generated/prisma/enums";
import { BlockFields } from "@/components/invite/block-form";
import { listAssets } from "@/server/services/assets";

export const dynamic = "force-dynamic";

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
  const [blocks, theme, assets] = await Promise.all([
    listBlocks(ctx),
    getTheme(ctx),
    listAssets(ctx),
  ]);

  /** Сброс кеша приглашения по обоим тегам: именная страница помечена id,
   *  публичная — слагом (тег задаётся до того, как известен id). */
  async function invalidate(slug: string) {
    "use server";
    updateTag(eventTag(eventId));
    updateTag(inviteSlugTag(slug));
    revalidatePath(`/app/e/${eventId}/invite`);
  }

  async function add(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const type = String(formData.get("type") ?? "") as BlockType;
    if (!BLOCK_ORDER.includes(type)) return;
    await addBlock(ctx, type);
    await invalidate(String(formData.get("slug") ?? ""));
  }

  async function save(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const blockId = String(formData.get("blockId") ?? "");
    const type = String(formData.get("type") ?? "") as BlockType;
    const slug = String(formData.get("slug") ?? "");

    const parsed = blockContentFromForm(type, formData);
    if (!parsed.ok) {
      redirect(`/app/e/${eventId}/invite?error=${encodeURIComponent(parsed.message)}`);
    }
    await updateBlockContent(ctx, blockId, parsed.content);
    await invalidate(slug);
  }

  async function move(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const dir = Number(formData.get("dir")) === 1 ? 1 : -1;
    await moveBlock(ctx, String(formData.get("blockId")), dir);
    await invalidate(String(formData.get("slug") ?? ""));
  }

  async function toggle(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await setBlockVisible(
      ctx,
      String(formData.get("blockId")),
      formData.get("visible") === "1",
    );
    await invalidate(String(formData.get("slug") ?? ""));
  }

  async function remove(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await deleteBlock(ctx, String(formData.get("blockId")));
    await invalidate(String(formData.get("slug") ?? ""));
  }

  async function publish(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await setEventStatus(ctx, eventId, formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
    await invalidate(String(formData.get("slug") ?? ""));
  }

  async function chooseTemplate(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await applyTemplate(ctx, String(formData.get("template") ?? ""));
    await invalidate(String(formData.get("slug") ?? ""));
    // Выбор шаблона — это и есть «открыть его»: сразу уводим в редактор,
    // иначе человек остаётся на витрине и не понимает, applied ли выбор.
    redirect(`/app/e/${eventId}/invite?edit=1`);
  }

  const publicHref = `/i/${event.slug}`;
  const hasInvite = blocks.length > 0;

  // Предпросмотру нужен признак «что-то изменилось». Считаем дёшево и
  // честно: тема плюс состав и содержимое блоков. Хеш не нужен — строка
  // никуда не уходит дальше атрибута `key`.
  const version = [
    event.status,
    JSON.stringify(theme),
    blocks.map((block) => `${block.id}:${block.order}:${block.visible}:${JSON.stringify(block.content)}`).join("|"),
  ].join("~").length.toString(36) + "-" + blocks.length;

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
  const showEditor = edit === "1" && hasInvite;

  if (!showEditor) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-xl text-stone-900">Приглашение</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Выберите шаблон — дальше откроется редактор: там правится текст,
          загружаются свои фотографии и убираются разделы, которые не нужны.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {/* У кого приглашение уже собрано — короткий путь назад в работу.
            Без него выбор шаблона был бы единственным выходом с витрины,
            то есть «продолжить» означало бы «затереть написанное». */}
        {hasInvite ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-stone-900">Приглашение уже собрано</p>
              <p className="mt-0.5 text-stone-500">
                Разделов: {blocks.length}. Выбор нового шаблона заменит текст и фотографии примерами.
              </p>
            </div>
            <a
              href={`/app/e/${eventId}/invite?edit=1`}
              className="flex min-h-11 items-center rounded-lg bg-stone-900 px-5 text-sm font-medium text-white transition-[opacity,transform] duration-200 ease-[var(--ease-soft)] hover:opacity-90 active:scale-[0.97]"
            >
              Продолжить редактирование
            </a>
          </div>
        ) : null}

        <div className="mt-8">
          <TemplatePicker
            action={chooseTemplate}
            currentId={theme.template}
            slug={event.slug}
            hasBlocks={hasInvite}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Выход с редактора обратно к шаблонам. Без него в витрину можно
          было бы попасть только стерев все разделы. */}
      <a
        href={`/app/e/${eventId}/invite`}
        className="mb-4 inline-flex min-h-11 items-center text-sm text-stone-500 transition-colors duration-200 hover:text-stone-900"
      >
        ← Все шаблоны
      </a>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="text-sm">
          <p className="text-stone-500">Публичная ссылка</p>
          <a href={publicHref} className="font-mono text-stone-900 underline">
            {publicHref}
          </a>
          <p className="mt-1 text-xs text-stone-400">
            Именные ссылки для гостей — на вкладке «Ответы».
          </p>
        </div>
        <form action={publish}>
          <input type="hidden" name="slug" value={event.slug} />
          <input
            type="hidden" name="status"
            value={event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
          />
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
            {event.status === "PUBLISHED" ? "Снять с публикации" : "Опубликовать"}
          </button>
        </form>
      </div>

      {event.status !== "PUBLISHED" ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Мероприятие не опубликовано: публичная ссылка отдаёт 404. Именные
          ссылки при этом работают — их можно проверить до публикации.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {/* Ниже — две колонки: слева правка, справа то, что получится.
          На узком экране предпросмотр уходит наверх: смотреть на телефоне
          «как это выглядит» важнее, чем править там же. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 lg:order-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">Разделы приглашения</h2>
            <form action={chooseTemplate}>
              <input type="hidden" name="template" value={theme.template} />
              <input type="hidden" name="slug" value={event.slug} />
              <ConfirmButton
                className="text-xs text-stone-500 underline decoration-dotted"
                confirmText="Собрать приглашение заново по шаблону? Весь нынешний текст и фотографии заменятся примерами шаблона."
              >
                Собрать заново по шаблону
              </ConfirmButton>
            </form>
          </div>

          <form action={add} className="mt-4 flex flex-wrap items-center gap-2">
            <input type="hidden" name="slug" value={event.slug} />
            <span className="text-sm text-stone-500">Добавить раздел:</span>
            {BLOCK_ORDER.map((type) => (
              <button
                key={type} name="type" value={type}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100"
              >
                {BLOCK_LABELS[type]}
              </button>
            ))}
          </form>

          <div className="mt-6 space-y-4">
            {blocks.map((block, index) => (
              <div key={block.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {BLOCK_LABELS[block.type]}
                    {!block.visible ? (
                      <span className="ml-2 text-xs text-stone-400">скрыт</span>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-1">
                    <form action={move}>
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="slug" value={event.slug} />
                      <input type="hidden" name="dir" value="-1" />
                      <button
                        disabled={index === 0}
                        className="rounded px-2 py-1 text-sm text-stone-500 disabled:opacity-30"
                        aria-label="Выше"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={move}>
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="slug" value={event.slug} />
                      <input type="hidden" name="dir" value="1" />
                      <button
                        disabled={index === blocks.length - 1}
                        className="rounded px-2 py-1 text-sm text-stone-500 disabled:opacity-30"
                        aria-label="Ниже"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={toggle}>
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="slug" value={event.slug} />
                      <input type="hidden" name="visible" value={block.visible ? "0" : "1"} />
                      <button className="rounded px-2 py-1 text-sm text-stone-500">
                        {block.visible ? "Скрыть" : "Показать"}
                      </button>
                    </form>
                    <form action={remove}>
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="slug" value={event.slug} />
                      <ConfirmButton
                        className="rounded px-2 py-1 text-sm text-stone-400 hover:text-red-700"
                        confirmText={`Удалить раздел «${BLOCK_LABELS[block.type]}»? Отменить не получится.`}
                      >
                        Удалить
                      </ConfirmButton>
                    </form>
                  </div>
                </div>

                {block.degraded ? (
                  <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Содержимое блока не совпало со схемой — часть полей показана
                    значениями по умолчанию. Сохраните блок, чтобы починить запись.
                  </p>
                ) : null}

                <form action={save} className="mt-3 space-y-3">
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="type" value={block.type} />
                  <input type="hidden" name="slug" value={event.slug} />
                  <BlockFields block={block} eventId={eventId} assets={assets} />
                  <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
                    Сохранить
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:order-2 lg:self-start">
          <InvitePreview
            src={publicHref}
            published={event.status === "PUBLISHED"}
            version={version}
          />
        </div>
      </div>
    </main>
  );
}
