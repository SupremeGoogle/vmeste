"use client";

/**
 * Загрузка списка гостей.
 *
 * Файл можно бросить на карточку или выбрать. Пока сервер разбирает его,
 * показываем шаги разбора — сервер присылает их потоком, поэтому галочки
 * ставятся по-настоящему, а не по таймеру. Разбор с ИИ идёт секунды,
 * и пустое колесо на это время выглядело бы как зависание.
 *
 * Без JS это обычная форма: файл уходит на тот же адрес, и сервер
 * переводит на страницу с предпросмотром.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 2 * 1024 * 1024;

const STAGES = [
  { id: "read", label: "Читаем файл" },
  { id: "structure", label: "Понимаем, что в каких столбцах" },
  { id: "people", label: "Разбираем пары и семьи" },
  { id: "duplicates", label: "Ищем повторы" },
] as const;

type Stage = (typeof STAGES)[number]["id"];

export function ImportCard({ eventId, aiAvailable }: { eventId: string; aiAvailable: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [smart, setSmart] = useState(aiAvailable);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const action = `/api/app/events/${eventId}/guests/import`;

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`Файл весит ${(file.size / 1024 / 1024).toFixed(1)} МБ, а можно до 2 МБ. Сохраните в новый файл только таблицу с гостями.`);
      return;
    }
    if (/\.xls$/i.test(file.name)) {
      setError("Это старый формат Excel (.xls). Откройте файл в Excel и сохраните как «Книга Excel (.xlsx)».");
      return;
    }

    setFileName(file.name);
    setStage("read");
    const body = new FormData();
    body.set("file", file);
    body.set("smart", smart ? "on" : "off");
    const controller = new AbortController();
    abort.current = controller;

    try {
      const response = await fetch(action, {
        method: "POST",
        body,
        headers: { accept: "application/x-ndjson" },
        signal: controller.signal,
      });
      if (!response.body) throw new Error("no body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const event = JSON.parse(line) as { type: string; stage?: Stage; draftId?: string; message?: string };
          if (event.type === "stage" && event.stage) setStage(event.stage);
          if (event.type === "error") throw new Error(event.message);
          if (event.type === "done" && event.draftId) {
            router.push(`/app/e/${eventId}/guests?draft=${event.draftId}`, { scroll: false });
            return;
          }
        }
      }
      // Ответ-ошибка приходит одним JSON без переноса строки.
      const tail = buffer.trim() ? (JSON.parse(buffer) as { message?: string }) : null;
      throw new Error(tail?.message ?? "Сервер не ответил. Попробуйте ещё раз.");
    } catch (err) {
      if (controller.signal.aborted) {
        setStage(null);
        return;
      }
      setError(err instanceof Error && err.message !== "no body" ? err.message : "Не получилось загрузить файл. Попробуйте ещё раз.");
      setStage(null);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const busy = stage !== null;
  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    // Загрузка файла — дело одного раза в жизни мероприятия, а место на
    // экране занимала постоянно. Свёрнутая строка: открыли, загрузили,
    // забыли. Без JS <details> раскрывается сам, форма внутри та же.
    <details className="group overflow-hidden rounded-2xl border border-stone-200 bg-card open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-stone-50">
        <span className="min-w-0">
          <span className="font-medium text-stone-900">Загрузить список</span>
          <span className="ml-2 text-stone-500">Excel или CSV</span>
        </span>
        <span aria-hidden className="shrink-0 text-stone-400 transition-transform group-open:rotate-180">▾</span>
      </summary>

    <form
      action={action}
      method="post"
      encType="multipart/form-data"
      onSubmit={(event) => {
        event.preventDefault();
        const file = input.current?.files?.[0];
        if (file) void upload(file);
      }}
      className="relative flex flex-col border-t border-stone-200 px-4 pb-4 pt-3"
    >
      <p className="text-sm text-stone-500">Столбцы в любом порядке и с любыми названиями.</p>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !busy) void upload(file);
        }}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
          dragOver ? "border-stone-900 bg-stone-100" : "border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-stone-100/70"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className={`h-8 w-8 text-stone-500 transition-transform ${dragOver ? "-translate-y-1" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
        </svg>
        <span className="mt-2 text-sm font-medium text-stone-800">
          {dragOver ? "Отпустите файл" : "Перетащите файл сюда или выберите"}
        </span>
        <span className="mt-1 text-xs text-stone-500">.xlsx, .csv · до 2 МБ</span>
        <input
          ref={input}
          type="file"
          name="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {aiAvailable ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700" title="Имена уходят в DeepSeek, телефоны и почты — нет">
            <input
              type="checkbox"
              name="smart"
              value="on"
              checked={smart}
              onChange={(event) => setSmart(event.target.checked)}
              className="peer sr-only"
            />
            <span aria-hidden className="relative h-5 w-9 rounded-full bg-stone-300 transition-colors peer-checked:bg-stone-900 peer-focus-visible:outline peer-focus-visible:outline-2 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-card after:shadow after:transition-transform peer-checked:after:translate-x-4" />
            <span>Умный разбор</span>
          </label>
        ) : (
          <input type="hidden" name="smart" value="off" />
        )}
        {/* Без JS файл не уходит сам при выборе — нужна кнопка. */}
        <noscript>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Загрузить</button>
        </noscript>
        <a href="/samples/guests-example.xlsx" download className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
          Скачать пример
        </a>
      </div>
      {aiAvailable && smart && (
        <p className="mt-2 text-xs text-stone-400">Имена отправляются в DeepSeek для разбора, телефоны и почты — нет.</p>
      )}

      {busy && (
        <div className="loading-in absolute inset-0 z-10 flex flex-col justify-center bg-card/95 px-6 backdrop-blur-sm" role="status" aria-live="polite">
          <p className="truncate text-sm font-medium text-stone-900">{fileName}</p>
          <ol className="mt-4 space-y-2.5">
            {STAGES.map((item, index) => {
              const done = index < stageIndex;
              const current = index === stageIndex;
              return (
                <li key={item.id} className={`flex items-center gap-3 text-sm transition-colors ${done ? "text-stone-500" : current ? "text-stone-900" : "text-stone-300"}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${done ? "bg-stone-900 text-white" : current ? "border-2 border-stone-900" : "border border-stone-300"}`}>
                    {done ? "✓" : current ? <span className="h-2 w-2 animate-ping rounded-full bg-stone-900" /> : null}
                  </span>
                  {item.label}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={() => abort.current?.abort()}
            className="mt-5 self-start text-xs text-stone-500 underline underline-offset-2 hover:text-stone-900"
          >
            Отменить
          </button>
        </div>
      )}
    </form>
    </details>
  );
}
