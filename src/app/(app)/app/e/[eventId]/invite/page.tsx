/**
 * Конструктор приглашения.
 *
 * Блоки правятся обычными формами, порядок — стрелками. Перетаскивание
 * здесь сознательно не сделано, хотя на рассадке оно есть: блоков пять-семь,
 * их переставляют один раз, и стрелка работает и с клавиатуры, и пальцем.
 * Вся сложность dnd на этом экране не окупается.
 *
 * Каждая правка сбрасывает кеш приглашения: `updateTag` вместо
 * `revalidateTag`, потому что организатор сразу жмёт «посмотреть» и обязан
 * увидеть свою правку, а не версию из кеша (read-your-own-writes).
 */
import Link from "next/link";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent, setEventStatus } from "@/server/repositories/events";
import {
  addBlock, deleteBlock, eventTag, inviteSlugTag, listBlocks, moveBlock,
  setBlockVisible, updateBlockContent,
} from "@/server/repositories/invites";
import { blockContentFromForm } from "@/server/services/invite-forms";
import { BLOCK_LABELS, BLOCK_ORDER } from "@/lib/invite-blocks";
import type { BlockType } from "@/generated/prisma/enums";
import { BlockFields } from "@/components/invite/block-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { error } = await searchParams;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const blocks = await listBlocks(ctx);

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

  const publicHref = `/i/${event.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="text-sm">
          <p className="text-stone-500">Публичная ссылка</p>
          <Link href={publicHref} className="font-mono text-stone-900 underline">
            {publicHref}
          </Link>
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

      <form action={add} className="mt-6 flex flex-wrap items-center gap-2">
        <input type="hidden" name="slug" value={event.slug} />
        <span className="text-sm text-stone-500">Добавить блок:</span>
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
          <div key={block.id} className="rounded-xl border border-stone-200 bg-white p-4">
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
                  <button className="rounded px-2 py-1 text-sm text-stone-400 hover:text-red-700">
                    Удалить
                  </button>
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
              <BlockFields block={block} />
              <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
                Сохранить
              </button>
            </form>
          </div>
        ))}
      </div>

      {blocks.length === 0 ? (
        <p className="mt-8 text-stone-600">
          Приглашение пустое. Начните с обложки — остальное можно добавить позже.
        </p>
      ) : null}
    </main>
  );
}
