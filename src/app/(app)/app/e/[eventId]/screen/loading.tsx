import { Bone, LoadingHeading, LoadingScreen } from "@/components/loading/skeleton";

export default function ScreenLoading() {
  return (
    <LoadingScreen label="Загружаем экран в зале">
      <LoadingHeading title="Экран в зале" detail="Проверяем подключение и готовим показ…" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl border border-stone-200 bg-stone-900 p-5"><Bone className="aspect-video w-full rounded-xl" /></div>
        <div className="rounded-2xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-32" /><Bone className="mt-5 h-11 w-full rounded-lg" /><Bone className="mt-3 h-11 w-full rounded-lg" /><Bone className="mt-3 h-11 w-full rounded-lg" /></div>
      </div>
    </LoadingScreen>
  );
}
