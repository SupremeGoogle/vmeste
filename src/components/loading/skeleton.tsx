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

/** Название будущего раздела остаётся читаемым, пока данные ещё приходят. */
export function LoadingHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-7 flex items-start gap-3">
      <div aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500/70 shadow-[0_0_0_5px_rgba(217,170,93,.12)]" />
      <div>
        <h1 className="font-serif text-3xl leading-tight text-stone-900">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{detail}</p>
      </div>
    </div>
  );
}

/** Ряд плиток-счётчиков, как на обзоре и в ответах. */
export function TileRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-card p-4">
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
    <div className="mt-8 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-card">
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
