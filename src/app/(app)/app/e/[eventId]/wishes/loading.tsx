import { LoadingHeading, LoadingScreen, Rows, TileRow } from "@/components/loading/skeleton";

export default function WishesLoading() {
  return (
    <LoadingScreen label="Загружаем пожелания">
      <LoadingHeading title="Пожелания" detail="Подготавливаем очередь модерации…" />
      <TileRow count={3} />
      <Rows count={5} />
    </LoadingScreen>
  );
}
