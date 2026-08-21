/**
 * Полноэкранный режим для проектора.
 *
 * Страница не перезагружается весь вечер: состояние держит клиентский
 * компонент, а сервер здесь только проверяет токен и отдаёт первый снимок,
 * чтобы на стене не мигнула пустота, пока грузится JavaScript.
 */
import { notFound } from "next/navigation";
import { accessByScreenToken, screenSnapshot } from "@/server/services/screen";
import { ScreenView } from "@/components/screen/screen-view";

export const dynamic = "force-dynamic";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ screenToken: string }>;
}) {
  const { screenToken } = await params;
  const access = await accessByScreenToken(screenToken);
  if (!access) notFound();

  const snapshot = await screenSnapshot(access);

  return <ScreenView token={screenToken} eventId={access.eventId} initial={snapshot} />;
}
