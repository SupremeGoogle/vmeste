import { Bone, LoadingHeading, LoadingScreen, TileRow } from "@/components/loading/skeleton";

export default function PhotosLoading() {
  return (
    <LoadingScreen label="Загружаем фотографии">
      <LoadingHeading title="Фотографии" detail="Собираем снимки и очередь модерации…" />
      <TileRow count={4} />
      <div className="mt-7 rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-48" /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Bone key={index} className="aspect-square w-full rounded-xl" />)}</div></div>
      <div className="mt-7"><Bone className="h-5 w-40" /><div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Bone key={index} className="aspect-square w-full rounded-lg" />)}</div></div>
    </LoadingScreen>
  );
}
