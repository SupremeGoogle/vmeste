/**
 * Управление экраном в зале: что показывать и кто это показывает.
 *
 * Режим переключается обычной формой — задержка в полсекунды здесь ничего
 * не стоит, а вот работать это должно и с планшета, и когда JS не завёлся.
 * Сам экран узнаёт о переключении событием и меняет картинку сам.
 */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import {
  createScreenToken, listScreenTokens, revokeScreenToken, setScreenMode,
} from "@/server/services/screen";
import type { ScreenMode } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const MODES: { value: ScreenMode; label: string; hint: string }[] = [
  { value: "MIXED", label: "Фото и пожелания", hint: "Снимки, поверх — пожелание" },
  { value: "PHOTOS", label: "Только фото", hint: "Лента одобренных снимков" },
  { value: "WISHES", label: "Только пожелания", hint: "Крупный текст без фото" },
  { value: "RAFFLE", label: "Розыгрыш", hint: "Участники и победитель" },
  { value: "IDLE", label: "Заставка", hint: "Только название — на паузу" },
];

function ago(date: Date | null): string {
  if (!date) return "не подключался";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 2) return "на связи";
  if (minutes < 60) return `был ${minutes} мин назад`;
  return `был ${Math.round(minutes / 60)} ч назад`;
}

export default async function ScreenAdminPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();
  const tokens = await listScreenTokens(ctx, eventId);

  async function switchMode(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    const mode = String(formData.get("mode")) as ScreenMode;
    if (!MODES.some((item) => item.value === mode)) return;
    await setScreenMode(ctx, eventId, mode);
    revalidatePath(`/app/e/${eventId}/screen`);
  }

  async function addToken(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await createScreenToken(ctx, eventId, String(formData.get("label") ?? ""));
    revalidatePath(`/app/e/${eventId}/screen`);
  }

  async function revoke(formData: FormData) {
    "use server";
    const ctx = await requireEventContext(eventId);
    await revokeScreenToken(ctx, eventId, String(formData.get("tokenId")));
    revalidatePath(`/app/e/${eventId}/screen`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h2 className="text-sm text-stone-500">Что показывать сейчас</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {MODES.map((mode) => (
          <form key={mode.value} action={switchMode}>
            <input type="hidden" name="mode" value={mode.value} />
            <button
              className={`w-full rounded-xl border p-3 text-left text-sm ${
                event.screenMode === mode.value
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white hover:border-stone-400"
              }`}
            >
              <span className="block font-medium">{mode.label}</span>
              <span
                className={`mt-1 block text-xs ${
                  event.screenMode === mode.value ? "text-white/70" : "text-stone-500"
                }`}
              >
                {mode.hint}
              </span>
            </button>
          </form>
        ))}
      </div>

      <h2 className="mt-10 text-sm text-stone-500">Ссылки для проектора</h2>
      <p className="mt-1 text-xs text-stone-500">
        Открывается один раз на ноутбуке в зале. Ссылку никому не пересылайте:
        она показывает всё одобренное без пароля. Отозвать можно в любой момент:
        открытый экран гаснет сам в течение 20 секунд, новые подключения
        не проходят вовсе.
      </p>

      <ul className="mt-3 space-y-2">
        {tokens.map((token) => (
          <li
            key={token.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block font-medium">{token.label}</span>
              <span className="block truncate font-mono text-xs text-stone-500">
                /screen/{token.token}
              </span>
            </span>
            <span className="text-xs text-stone-500">
              {token.revokedAt ? "отозвана" : ago(token.lastSeenAt)}
            </span>
            {!token.revokedAt ? (
              <div className="flex gap-3">
                <a
                  href={`/screen/${token.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                >
                  открыть
                </a>
                <form action={revoke}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <button className="text-xs text-stone-400 hover:text-red-700">отозвать</button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <form action={addToken} className="mt-4 flex flex-wrap gap-2">
        <input
          name="label"
          placeholder="Название (например, «Проектор в зале»)"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
          Создать ссылку
        </button>
      </form>

      <details className="mt-10 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">Памятка для дня свадьбы</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-600">
          <li>Отключите на ноутбуке сон и автоматические обновления.</li>
          <li>Откройте экран заранее и разверните на весь экран (F11).</li>
          <li>Проверьте индикатор в правом верхнем углу: зелёная точка — связь есть.</li>
          <li>Экран сам переживает обрыв связи: перезагружать страницу не нужно.</li>
          <li>Прогрейте сервер до приезда гостей — первый запрос всегда медленнее.</li>
        </ul>
      </details>
    </main>
  );
}
