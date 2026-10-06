/**
 * Экран загрузки любого раздела мероприятия.
 *
 * Страницы разделов динамические, и без этого файла переход по вкладке
 * ждал ответа сервера на старом экране — казалось, что нажатие не сработало.
 * С ним Next.js заранее подгружает заглушку и показывает её сразу, а шапка
 * с вкладками (layout.tsx) остаётся на месте.
 */
import { Bone, LoadingScreen, Rows, TileRow } from "@/components/loading/skeleton";

export default function EventSectionLoading() {
  return (
    <LoadingScreen label="Загружаем раздел">
      <TileRow />
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-card p-4">
        <Bone className="h-4 w-48" />
        <Bone className="ml-auto h-9 w-32 rounded-lg" />
      </div>
      <Rows />
    </LoadingScreen>
  );
}
