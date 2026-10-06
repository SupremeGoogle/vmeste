"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VerifyResult } from "@/server/admin/access";

/** Ввод кода 2FA. После настройки — один раз показывает резервные коды. */
export function VerifyForm({ action, setup = false }: { action: (code: string) => Promise<VerifyResult>; setup?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [backup, setBackup] = useState<string[] | null>(null);
  const [pending, start] = useTransition();

  if (backup) {
    return (
      <div className="mt-6">
        <p className="text-sm font-medium text-stone-900">Резервные коды — сохраните их сейчас</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Каждый срабатывает один раз, если телефон потерян. Больше мы их не покажем — только выпустим новые.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-stone-50 p-3 font-mono text-sm select-all">
          {backup.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => void navigator.clipboard?.writeText(backup.join("\n"))} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Скопировать</button>
          <button type="button" onClick={() => router.replace("/admin")} className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">Я сохранил коды — в панель</button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        start(async () => {
          const result = await action(code);
          if (!result.ok) {
            setError(result.message);
            setCode("");
            return;
          }
          if (result.backupCodes?.length) setBackup(result.backupCodes);
          else router.replace("/admin");
        });
      }}
    >
      <label className="block text-sm text-stone-700">
        {setup ? "Код из приложения" : "Код или резервный код"}
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode={setup ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoFocus
          maxLength={16}
          required
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em]"
          placeholder="123456"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={pending || code.trim().length < 6} className="mt-4 w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Проверяю…" : setup ? "Включить и войти" : "Войти в панель"}
      </button>
    </form>
  );
}
