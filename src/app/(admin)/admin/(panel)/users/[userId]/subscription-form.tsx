"use client";
/**
 * Подписка от владельца. Каждое действие — со свежим кодом 2FA
 * (server/admin/subscription.ts): поле кода очищается после попытки.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: true; message: string } | { ok: false; message: string };
type Act = (input: { action: "grant" | "revoke"; months?: number; code: string; reason?: string }) => Promise<Result>;

export function SubscriptionForm({ act, until, email }: { act: Act; until: string | null; email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [months, setMonths] = useState(1);
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (input: Parameters<Act>[0], ask: string) => {
    if (!window.confirm(ask)) return;
    setNotice(null);
    start(async () => {
      const result = await act(input);
      setCode("");
      setNotice({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  };

  const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
      <h2 className="text-sm font-medium">Подписка</h2>
      <p className="text-sm text-stone-700">
        {until ? <>Действует до <b>{until}</b>. Свадьбы пользователя открываются без оплаты.</> : "Нет. Свадьбы открываются оплатой."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
          <option value={1}>1 месяц</option>
          <option value={3}>3 месяца</option>
          <option value={6}>6 месяцев</option>
          <option value={12}>12 месяцев</option>
        </select>
        <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="За что (видно в журнале)" className="min-w-48 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={20}
          placeholder="Код 2FA" className="w-32 rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm tracking-widest"
        />
        <button type="button" disabled={pending || !code} className={`${button} border-stone-900 bg-stone-900 text-white`} onClick={() => run({ action: "grant", months, code, reason }, `Выдать ${email} подписку на ${months} мес.? Его свадьбы откроются без оплаты.`)}>
          {until ? "Продлить" : "Выдать"}
        </button>
        {until && (
          <button type="button" disabled={pending || !code} className={`${button} border-rose-300 text-rose-800`} onClick={() => run({ action: "revoke", code }, `Снять подписку у ${email}? Уже открытые свадьбы продолжат работать.`)}>
            Снять
          </button>
        )}
      </div>
      <p className="text-xs text-stone-500">Только владелец, на каждое действие — свежий код из приложения. О каждой выдаче придёт сообщение в Telegram.</p>
      {notice && <p className={`text-sm ${notice.ok ? "text-emerald-800" : "text-rose-800"}`}>{notice.text}</p>}
    </section>
  );
}
