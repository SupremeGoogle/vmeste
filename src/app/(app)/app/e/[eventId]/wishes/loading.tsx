"use client";

import { LoadingHeading, LoadingScreen, Rows, TileRow } from "@/components/loading/skeleton";
import { useT } from "@/components/i18n-provider";

export default function WishesLoading() {
  const t = useT();
  return (
    <LoadingScreen label={t("Загружаем пожелания", "Loading wishes")}>
      <LoadingHeading title={t("Пожелания", "Wishes")} detail={t("Подготавливаем очередь модерации…", "Preparing the moderation queue…")} />
      <TileRow count={3} />
      <Rows count={5} />
    </LoadingScreen>
  );
}
