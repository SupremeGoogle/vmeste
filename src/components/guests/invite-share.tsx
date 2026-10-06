"use client";

/**
 * «Разослать приглашение» — два способа, которыми пары реально рассылают.
 *
 * 1. Общая ссылка. Её кидают в общий чат или тем, кого не успели завести в
 *    список. Гость пишет в анкете своё имя и появляется у организатора
 *    отдельной строкой с пометкой «добавился сам».
 *
 * 2. Приглашение конкретному человеку. Вписали имя — ссылка уже в буфере
 *    обмена, осталось вставить в мессенджер. В приглашении это имя уже
 *    стоит в анкете, но гость может его исправить (опечатка, фамилия,
 *    «Саша» вместо «Александр»).
 *
 *    По умолчанию человек сразу заводится в список — так видно, открыл ли
 *    он ссылку и ответил ли. Если список вести не хочется, ссылка может
 *    просто нести имя (`?name=`), а гость появится в списке, когда ответит.
 */
import { useState, useSyncExternalStore, useTransition } from "react";

const noop = () => () => {};

type Created = { name: string; url: string; listed: boolean };

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function inviteText(name: string, url: string): string {
  return `${name ? `${name}, ` : ""}мы приглашаем вас на нашу свадьбу! Всё о празднике и ответ — по ссылке:\n${url}`;
}

export function InviteShare({
  publicPath,
  published,
  editorHref,
  inviteByName,
}: {
  /** `/i/{slug}` — общая ссылка без домена. */
  publicPath: string;
  published: boolean;
  editorHref: string;
  /** Завести гостя и вернуть путь его именной ссылки. */
  inviteByName: (name: string) => Promise<{ ok: true; path: string; existing: boolean; name: string } | { ok: false; message: string }>;
}) {
  const [name, setName] = useState("");
  const [listed, setListed] = useState(true);
  const [created, setCreated] = useState<Created[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Домен — только в браузере: на сервере его нет, и без этого разметка
  // сервера и клиента разошлись бы при гидратации.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const publicUrl = `${origin}${publicPath}`;

  function notify(text: string) {
    setFlash(text);
    window.setTimeout(() => setFlash((current) => (current === text ? null : current)), 2200);
  }

  async function share(text: string, url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // Закрыли окно «Поделиться» — ничего не делаем.
        return;
      }
    }
    if (await copy(text)) notify("Текст с ссылкой скопирован");
  }

  function create(event: React.FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setError(null);
    if (!listed) {
      const url = `${publicUrl}?name=${encodeURIComponent(clean)}`;
      setCreated((list) => [{ name: clean, url, listed: false }, ...list]);
      setName("");
      void copy(url).then((ok) => ok && notify(`Ссылка для «${clean}» скопирована`));
      return;
    }
    startTransition(async () => {
      const result = await inviteByName(clean);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const url = `${origin}${result.path}`;
      setCreated((list) => [{ name: result.name, url, listed: true }, ...list.filter((item) => item.url !== url)]);
      setName("");
      if (await copy(url)) {
        notify(result.existing
          ? `«${result.name}» уже есть в списке — скопирована ссылка этого гостя`
          : `«${clean}» в списке гостей, ссылка скопирована`);
      }
    });
  }

  const button = "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-card px-3 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-50";

  return (
    <section className="rise rounded-2xl border border-stone-200 bg-card p-5 sm:p-6">
      <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Рассылка</p>
      <h2 className="mt-1 font-serif text-3xl text-stone-900">Разослать приглашение</h2>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Общая ссылка */}
        <div>
          <h3 className="text-sm font-medium text-stone-900">Общая ссылка</h3>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            Для общего чата и всех, кого нет в списке. Гость напишет своё имя в анкете и сам
            появится среди гостей с пометкой «добавился сам».
          </p>
          {!published && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Приглашение ещё не опубликовано — общая ссылка заработает после публикации.{" "}
              <a href={editorHref} className="underline underline-offset-2">Открыть редактор</a>
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-stone-700">{publicUrl || publicPath}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={button} onClick={() => void copy(publicUrl).then((ok) => ok && notify("Общая ссылка скопирована"))}>
              Скопировать ссылку
            </button>
            <button type="button" className={button} onClick={() => void share(inviteText("", publicUrl), publicUrl)}>
              Поделиться с текстом
            </button>
            <a href={publicPath} target="_blank" rel="noreferrer" className={button}>Открыть ↗</a>
          </div>
        </div>

        {/* Приглашение для человека */}
        <div>
          <h3 className="text-sm font-medium text-stone-900">Приглашение для человека</h3>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            Впишите имя — ссылка сразу скопируется. В анкете имя будет уже заполнено, но гость
            сможет его поправить.
          </p>
          <form onSubmit={create} className="mt-3 flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Например: Иван и Мария Петровы"
              aria-label="Имя гостя"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-card px-3 text-sm"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="min-h-10 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Создаём…" : "Создать и скопировать"}
            </button>
          </form>
          <label className="mt-2 flex items-start gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={listed} onChange={(event) => setListed(event.target.checked)} className="mt-0.5 size-4 accent-stone-900" />
            <span>Сразу добавить в список гостей — будет видно, открыл ли он ссылку и ответил ли</span>
          </label>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

          {created.length > 0 && (
            <ul className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
              {created.map((item) => (
                <li key={item.url} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-900">
                    {item.name}
                    <span className="ml-2 text-xs text-stone-400">{item.listed ? "в списке" : "добавится при ответе"}</span>
                  </span>
                  <button type="button" className="text-sm text-stone-600 underline underline-offset-2" onClick={() => void copy(item.url).then((ok) => ok && notify("Ссылка скопирована"))}>
                    Ссылка
                  </button>
                  <button type="button" className="text-sm text-stone-600 underline underline-offset-2" onClick={() => void share(inviteText(item.name, item.url), item.url)}>
                    С текстом
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p role="status" aria-live="polite" className={`mt-4 h-5 text-sm text-emerald-700 transition-opacity ${flash ? "opacity-100" : "opacity-0"}`}>
        {flash ? `✓ ${flash}` : ""}
      </p>
    </section>
  );
}
