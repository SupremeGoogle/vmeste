"use client";

/**
 * Ссылка, у которой экран загрузки появляется в момент нажатия.
 *
 * `loading.tsx` раздела показывается, только когда сервер уже прислал
 * оболочку маршрута, а на холодном сервере (и в dev, где маршрут ещё
 * компилируется) это секунды тишины: человек смотрит на прежний список
 * и жмёт ещё раз. Здесь заставка рисуется на клиенте сразу по `pending`
 * из `useLinkStatus` — ей не нужно ничего ждать от сервера.
 */
import Link, { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/brand";
import { useT } from "@/components/i18n-provider";

/** Через сколько секунд предложить открыть страницу заново: переход мог
 *  оборваться (сервер перезапустился, пропала сеть), а заставка — остаться. */
const STUCK_AFTER_MS = 8000;

function OpeningOverlay({ title, href }: { title: string; href: string }) {
  const { pending } = useLinkStatus();
  const [stuck, setStuck] = useState(false);
  const t = useT();
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => { clearTimeout(timer); setStuck(false); };
  }, [pending]);
  if (!pending || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      // Портал всплывает по дереву React до самой ссылки: без этого
      // щелчок по заставке запускал бы переход ещё раз.
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
      className="opening-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-stone-50/90 px-6 text-center backdrop-blur-sm"
    >
      <div className="opening-mark">
        <BrandMark size={52} />
      </div>
      <div>
        <p className="font-serif text-2xl text-stone-900">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{t("Открываем мероприятие…", "Opening your event…")}</p>
      </div>
      <div aria-hidden className="h-1 w-48 overflow-hidden rounded-full bg-stone-200">
        <div className="opening-progress h-full w-1/3 rounded-full bg-stone-800" />
      </div>
      {stuck && (
        <div className="flex flex-col items-center gap-2 text-sm text-stone-500">
          <p>{t("Открывается дольше обычного.", "This is taking longer than usual.")}</p>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); window.location.assign(href); }}
            className="min-h-10 rounded-lg bg-stone-900 px-4 font-medium text-white"
          >
            {t("Открыть заново", "Try again")}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

export function OpeningLink({
  href, title, className, children,
}: {
  href: string;
  /** Что открываем — крупно на заставке. */
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      {children}
      <OpeningOverlay title={title} href={href} />
    </Link>
  );
}
