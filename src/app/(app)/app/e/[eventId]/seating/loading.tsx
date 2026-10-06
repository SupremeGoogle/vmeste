/**
 * Экран загрузки рассадки: панель, пустой зал с силуэтами столов
 * и список гостей справа — ровно там, где они появятся.
 */
import { Bone, LoadingScreen } from "@/components/loading/skeleton";

/** Силуэты столов в долях зала: круглые и один длинный — стол молодожёнов. */
const TABLES = [
  { x: 50, y: 16, w: 30, h: 12, round: false },
  { x: 22, y: 50, w: 15, h: 21, round: true },
  { x: 50, y: 55, w: 15, h: 21, round: true },
  { x: 78, y: 50, w: 15, h: 21, round: true },
  { x: 32, y: 84, w: 15, h: 21, round: true },
  { x: 68, y: 84, w: 15, h: 21, round: true },
];

export default function SeatingLoading() {
  return (
    <LoadingScreen label="Загружаем план зала">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 lg:flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Bone className="h-9 w-36 rounded-lg" />
            <Bone className="h-9 w-24 rounded-lg" />
            <Bone className="h-9 w-52 rounded-lg" />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <Bone className="h-3 w-64" />
            <Bone className="h-6 w-40 rounded-lg" />
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-100/60 p-6">
            <div className="relative aspect-[10/7] w-full rounded-sm bg-card shadow-sm">
              {TABLES.map((table, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${table.x}%`, top: `${table.y}%`, width: `${table.w}%`, height: `${table.h}%` }}
                >
                  <Bone
                    className={`h-full w-full ${table.round ? "rounded-full" : "rounded-2xl"}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden lg:block lg:w-72">
          <div className="rounded-xl border border-stone-200 bg-card p-4">
            <Bone className="h-4 w-32" />
            <Bone className="mt-4 h-9 w-full rounded-lg" />
            {Array.from({ length: 7 }, (_, i) => (
              <Bone key={i} className="mt-3 h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </LoadingScreen>
  );
}
