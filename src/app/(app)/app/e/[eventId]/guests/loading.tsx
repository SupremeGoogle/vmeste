import { Bone, LoadingHeading, LoadingScreen, Rows, TileRow } from "@/components/loading/skeleton";

export default function GuestsLoading() {
  return (
    <LoadingScreen label="Загружаем гостей">
      <LoadingHeading title="Гости" detail="Собираем список и ответы…" />
      <TileRow />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-36" /><Bone className="mt-5 h-10 w-full rounded-lg" /><Bone className="mt-3 h-10 w-full rounded-lg" /></div>
        <div className="rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-44" /><Bone className="mt-5 h-20 w-full rounded-lg" /></div>
      </div>
      <Rows count={7} />
    </LoadingScreen>
  );
}
