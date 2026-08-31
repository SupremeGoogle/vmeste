"use client";

/**
 * Предпросмотр приглашения — настоящая страница в рамке телефона.
 *
 * Не макет и не пересборка вёрстки на React: внутри `<iframe>` открыт тот
 * самый адрес, который увидит гость. Любая пересборка предпросмотра
 * отдельным кодом означает, что рано или поздно он покажет не то, что
 * получит гость, — и это худший из возможных изъянов инструмента, потому
 * что обнаруживается он уже после рассылки.
 *
 * Приглашение может быть не опубликовано — тогда публичный адрес честно
 * отдаёт 404, и мы показываем это же. Не подменяем: организатор должен
 * видеть, что гость сейчас упрётся в «не найдено», а не узнать об этом
 * из звонка.
 */
import { useRef, useState } from "react";

export function InvitePreview({
  src, published, version,
}: {
  src: string;
  published: boolean;
  /**
   * Отпечаток содержимого приглашения. Считает его сервер; при любой
   * правке он меняется, и рамка перечитывает страницу.
   *
   * Иначе адрес остался бы прежним, и браузер показал бы версию из
   * своего кеша — предпросмотр, отстающий на одну правку, хуже, чем
   * отсутствие предпросмотра: ему верят.
   */
  version: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [reload, setReload] = useState(0);
  const [wide, setWide] = useState(false);
  const nonce = `${version}-${reload}`;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-900">Как увидит гость</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWide((value) => !value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700"
          >
            {wide ? "Телефон" : "Во всю ширину"}
          </button>
          <button
            type="button"
            onClick={() => {
              setReload((value) => value + 1);
              frame.current?.contentWindow?.scrollTo(0, 0);
            }}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700"
          >
            Обновить
          </button>
        </div>
      </div>

      {!published && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Мероприятие не опубликовано — по публичной ссылке гость увидит «не
          найдено». Именные ссылки работают и сейчас.
        </p>
      )}

      <div
        className={`mx-auto mt-4 overflow-hidden bg-stone-100 ${
          wide ? "rounded-lg" : "w-[320px] rounded-[2rem] border-[7px] border-stone-800/90"
        }`}
      >
        <iframe
          key={nonce}
          ref={frame}
          src={`${src}${src.includes("?") ? "&" : "?"}v=${nonce}`}
          title="Предпросмотр приглашения"
          className={`block w-full ${wide ? "h-[70vh]" : "h-[560px]"}`}
          // Приглашение — наша же страница, но песочница ничего не стоит
          // и снимает целый класс неприятностей, если в блок однажды
          // попадёт то, чего мы не ждали.
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
