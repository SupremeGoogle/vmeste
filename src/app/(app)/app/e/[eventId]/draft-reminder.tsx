"use client";

/**
 * Напоминание на всех страницах свадьбы: в приглашении есть правки,
 * которых гости ещё не видят. В самом редакторе своя плашка
 * (components/invite/publish-controls.tsx) — там это напоминание лишнее.
 *
 * Шапка мероприятия при переходах между вкладками не перерисовывается
 * сервером, поэтому о свежих правках и сохранении сюда сообщает сам
 * редактор событием DRAFT_STATE.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DRAFT_STATE } from "@/components/invite/publish-controls";

export function DraftReminder({ eventId, dirty: serverDirty }: { eventId: string; dirty: boolean }) {
  const path = usePathname();
  const [dirty, setDirty] = useState(serverDirty);
  const [server, setServer] = useState(serverDirty);
  if (server !== serverDirty) {
    setServer(serverDirty);
    setDirty(serverDirty);
  }
  useEffect(() => {
    const onState = (event: Event) => setDirty(Boolean((event as CustomEvent<{ unsaved: boolean }>).detail?.unsaved));
    window.addEventListener(DRAFT_STATE, onState);
    return () => window.removeEventListener(DRAFT_STATE, onState);
  }, []);

  if (!dirty || path.startsWith(`/app/e/${eventId}/invite`)) return null;
  return (
    <div className="no-print border-t border-amber-200 bg-amber-50 text-sm text-amber-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" aria-hidden />
        <span className="min-w-0 flex-1">В приглашении есть несохранённые изменения — гости видят прошлую версию.</span>
        <Link href={`/app/e/${eventId}/invite?edit=1`} className="font-medium underline underline-offset-2">Открыть и сохранить →</Link>
      </div>
    </div>
  );
}
