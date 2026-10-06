import { Bone, LoadingHeading, LoadingScreen } from "@/components/loading/skeleton";

export default function InviteLoading() {
  return (
    <LoadingScreen label="Загружаем приглашение">
      <LoadingHeading title="Приглашение" detail="Подготавливаем редактор и фотографии…" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-40" /><Bone className="mt-5 h-10 w-full rounded-lg" /><Bone className="mt-3 h-10 w-4/5 rounded-lg" /></div>
          <div className="rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-32" /><Bone className="mt-5 h-28 w-full rounded-lg" /></div>
          <div className="rounded-xl border border-stone-200 bg-card p-5"><Bone className="h-5 w-44" /><Bone className="mt-5 h-28 w-full rounded-lg" /></div>
        </div>
        <div className="mx-auto w-full max-w-sm rounded-[2rem] border-[8px] border-stone-800 bg-card p-3 shadow-xl"><Bone className="aspect-[9/17] w-full rounded-[1.25rem]" /></div>
      </div>
    </LoadingScreen>
  );
}
