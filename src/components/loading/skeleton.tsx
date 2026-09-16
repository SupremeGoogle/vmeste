/**
 * Кирпичики экранов загрузки.
 *
 * Заглушка повторяет раскладку настоящей страницы — плитки, строки,
 * план зала, — а не крутит колесо посреди пустоты: когда данные
 * приходят, глаз не прыгает, а страница просто «проявляется».
 * Серверный компонент без состояния: файлы loading.tsx отдаются
 * при переходе мгновенно, ещё до ответа базы.
 */
export function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={`skeleton rounded-md ${className}`} style={style} />;
}

/** Обёртка экрана загрузки: подпись для читалок и мягкое проявление. */
export function LoadingScreen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="loading-in mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <span className="sr-only">{label}</span>
      {children}
    </main>
  );
}

/** Ряд плиток-счётчиков, как на обзоре и в ответах. */
export function TileRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
          <Bone className="h-7 w-12" />
          <Bone className="mt-2 h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Таблица или список: строки разной длины, чтобы не выглядело штампом. */
export function Rows({ count = 6 }: { count?: number }) {
  const widths = ["w-40", "w-56", "w-32", "w-48", "w-36", "w-52"];
  return (
    <div className="mt-8 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Bone className="h-8 w-8 shrink-0 rounded-full" />
          <Bone className={`h-3.5 ${widths[i % widths.length]}`} />
          <Bone className="ml-auto hidden h-3.5 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}
