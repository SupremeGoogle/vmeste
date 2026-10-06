"use client";

import { useState, useTransition } from "react";

/** Выпустить новые резервные коды — показываются один раз. */
export function BackupCodes({ regenerate }: { regenerate: () => Promise<string[]> }) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  if (codes) {
    return (
      <div className="mt-3">
        <p className="text-xs text-stone-500">Старые коды больше не действуют. Сохраните новые — мы покажем их только сейчас.</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-stone-50 p-3 font-mono text-sm select-all sm:grid-cols-5">
          {codes.map((code) => <li key={code}>{code}</li>)}
        </ul>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Выпустить новые коды? Старые перестанут работать.")) return;
        start(async () => setCodes(await regenerate()));
      }}
      className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-50"
    >
      Выпустить новые коды
    </button>
  );
}
