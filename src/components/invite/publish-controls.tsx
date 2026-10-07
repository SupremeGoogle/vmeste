"use client";

/**
 * Публикация и черновик приглашения в шапке редактора.
 *
 *  — «Опубликовать» сразу открывает окно: опубликовано, вот ссылка —
 *    скопировать, открыть, разослать гостям. Раньше кнопка просто
 *    перерисовывала страницу, и было непонятно, что произошло и где ссылка.
 *  — У опубликованного приглашения правки копятся в черновике (см.
 *    server/repositories/invite-draft.ts). Пока они не сохранены, сверху
 *    висит плашка «Изменения не сохранены» с «Сохранить» и «Отменить»,
 *    а уход со страницы спрашивает подтверждение — чтобы не забыть.
 *  — При входе в редактор опубликованного приглашения один раз за
 *    сеанс объясняем, как это устроено.
 *
 * О правках редактор сообщает событием DRAFT_CHANGED на window: плашке
 * не нужно знать, какой именно инструмент что-то поменял.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";

export const DRAFT_CHANGED = "invite-draft-changed";
/** Сообщение напоминанию в шапке мероприятия: есть ли несохранённое. */
export const DRAFT_STATE = "invite-draft-state";

type ActionResult = { ok: true; path: string } | { ok: false; message: string };

const noop = () => () => {};

export function PublishControls({
  eventId,
  published: initialPublished,
  dirty: initialDirty,
  publicPath,
  publish,
  unpublish,
  saveChanges,
  discardChanges,
}: {
  eventId: string;
  published: boolean;
  dirty: boolean;
  /** `/i/{slug}` — ссылка для гостей без домена. */
  publicPath: string;
  publish: () => Promise<ActionResult>;
  unpublish: () => Promise<ActionResult>;
  saveChanges: () => Promise<ActionResult>;
  discardChanges: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(initialPublished);
  const [dirty, setDirty] = useState(initialDirty);
  const [dialog, setDialog] = useState<null | "published" | "saved">(null);
  const [intro, setIntro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  // Сервер пересчитал состояние (перезагрузка, форма «Имена, дата и место») —
  // принимаем его прямо при отрисовке, без лишнего прохода через эффект.
  const [server, setServer] = useState({ published: initialPublished, dirty: initialDirty });
  if (server.published !== initialPublished || server.dirty !== initialDirty) {
    setServer({ published: initialPublished, dirty: initialDirty });
    setPublished(initialPublished);
    setDirty(initialDirty);
  }

  // Любая правка в редакторе опубликованного приглашения — черновик.
  useEffect(() => {
    const onChange = () => setDirty(true);
    window.addEventListener(DRAFT_CHANGED, onChange);
    return () => window.removeEventListener(DRAFT_CHANGED, onChange);
  }, []);

  const unsaved = published && dirty;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(DRAFT_STATE, { detail: { unsaved } }));
  }, [unsaved]);

  // Уход со страницы с несохранёнными правками — браузер переспросит.
  useEffect(() => {
    if (!unsaved) return;
    const onLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [unsaved]);

  // Один раз за сеанс: как устроено редактирование опубликованного.
  // Только если приглашение было опубликовано уже при входе в редактор:
  // сразу после «Опубликовать» хватает окна с ссылкой.
  const [publishedOnOpen] = useState(initialPublished);
  useEffect(() => {
    if (!publishedOnOpen) return;
    const key = `invite-intro:${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    // С короткой паузой: окно поверх ещё не отрисованного редактора выглядит как сбой.
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(key, "1"); } catch {}
      setIntro(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [eventId, publishedOnOpen]);

  function run(action: () => Promise<ActionResult>, after: (result: Extract<ActionResult, { ok: true }>) => void) {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      after(result);
      router.refresh();
    });
  }

  const button = "inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-medium sm:min-h-11 sm:px-4 disabled:opacity-50";

  return (
    <>
      {published ? (
        <button
          type="button"
          disabled={pending}
          className={`${button} border border-stone-300 bg-card text-stone-800`}
          data-rybbit-event="invite_unpublish"
          onClick={() => {
            if (!window.confirm("Снять приглашение с публикации? Гости перестанут его открывать, пока вы не опубликуете снова.")) return;
            run(unpublish, () => { setPublished(false); setDirty(false); });
          }}
        >
          Снять с публикации
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={`${button} bg-stone-900 text-white`}
          data-rybbit-event="invite_publish"
          onClick={() => run(publish, () => { setPublished(true); setDirty(false); setDialog("published"); })}
        >
          {pending ? "Публикуем…" : "Опубликовать"}
        </button>
      )}

      {/* Плашка черновика — во всю ширину под шапкой, липкая. */}
      <AnimatePresence>
        {unsaved ? (
          <motion.div
            key="draft"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-[0_18px_40px_-20px_rgba(64,56,51,0.6)] sm:bottom-5"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" aria-hidden />
              <span><b>Изменения не сохранены.</b> Гости пока видят прошлую версию приглашения.</span>
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-lg px-3 py-2 text-amber-900 underline underline-offset-2 disabled:opacity-50"
                onClick={() => {
                  if (!window.confirm("Отменить все несохранённые изменения? Приглашение вернётся к версии, которую видят гости.")) return;
                  run(discardChanges, () => setDirty(false));
                }}
              >
                Отменить
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-50"
                onClick={() => run(saveChanges, () => { setDirty(false); setDialog("saved"); })}
              >
                {pending ? "Сохраняем…" : "Сохранить изменения"}
              </button>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <p role="alert" className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-800">{error}</p>
      ) : null}

      <Dialog open={dialog !== null} onClose={() => setDialog(null)}>
        <p className="text-4xl" aria-hidden>{dialog === "saved" ? "✓" : "🎉"}</p>
        <h2 className="mt-3 font-serif text-2xl text-stone-900">{dialog === "saved" ? "Изменения сохранены" : "Приглашение опубликовано"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          {dialog === "saved" ? "Гости уже видят новую версию по той же ссылке." : "Теперь его видят гости. Скопируйте ссылку и отправьте её — или разошлите именные приглашения из списка гостей."}
        </p>
        <LinkBox url={`${origin}${publicPath}`} />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a href={publicPath} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-800">Посмотреть приглашение ↗</a>
          {dialog === "published" ? (
            <a href={`/app/e/${eventId}/guests`} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white">Разослать гостям →</a>
          ) : null}
        </div>
        <button type="button" onClick={() => setDialog(null)} className="mt-4 text-sm text-stone-500 underline underline-offset-2">Закрыть</button>
      </Dialog>

      <Dialog open={intro} onClose={() => setIntro(false)}>
        <p className="text-4xl" aria-hidden>✎</p>
        <h2 className="mt-3 font-serif text-2xl text-stone-900">Приглашение уже у гостей</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Правьте спокойно: изменения сначала копятся в черновике, и гости их не видят. Когда закончите — нажмите
          {" "}<b>«Сохранить изменения»</b> на плашке внизу. Передумали — <b>«Отменить»</b>.
        </p>
        <button type="button" onClick={() => setIntro(false)} className="mt-5 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">Понятно, редактировать</button>
      </Dialog>
    </>
  );
}

function LinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate text-left font-mono text-sm text-stone-700">{url}</span>
      <button
        type="button"
        className="shrink-0 rounded-lg bg-card px-3 py-2 text-sm font-medium text-stone-800 shadow-sm"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }).catch(() => {});
        }}
      >
        {copied ? "Скопировано ✓" : "Скопировать"}
      </button>
    </div>
  );
}

function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
