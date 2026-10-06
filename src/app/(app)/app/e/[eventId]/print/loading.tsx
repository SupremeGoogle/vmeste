import { Bone, LoadingHeading, LoadingScreen } from "@/components/loading/skeleton";

export default function PrintLoading() {
  return (
    <LoadingScreen label="Загружаем макеты для печати">
      <LoadingHeading title="Печать" detail="Готовим макеты и список гостей…" />
      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-36" /><Bone className="mt-5 h-10 w-full rounded-lg" /><Bone className="mt-3 h-10 w-full rounded-lg" /><Bone className="mt-3 h-10 w-full rounded-lg" /></div>
        <div className="rounded-xl border border-stone-200 bg-stone-100/70 p-6"><Bone className="mx-auto aspect-[3/4] w-full max-w-sm rounded-lg bg-card" /></div>
      </div>
    </LoadingScreen>
  );
}
