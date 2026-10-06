"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: true; message?: string } | { ok: false; message: string };
type Act = (input: { action: string; reason?: string; role?: string; confirm?: string }) => Promise<Result>;

export function UserActions({
  act, email, blocked, role, isOwnerViewer, hasSecondFactor,
}: {
  act: Act;
  email: string;
  blocked: boolean;
  role: "ADMIN" | "SUPPORT" | null;
  isOwnerViewer: boolean;
  hasSecondFactor: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [danger, setDanger] = useState(false);

  const run = (input: Parameters<Act>[0], ask?: string) => {
    if (ask && !window.confirm(ask)) return;
    setNotice(null);
    start(async () => {
      const result = await act(input);
      setNotice({ ok: result.ok, text: result.message ?? "Готово" });
      if (result.ok) router.refresh();
    });
  };

  const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-medium">Действия</h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || blocked} className={`${button} border-stone-300`} onClick={() => run({ action: "impersonate" }, `Войти в кабинет ${email}? Сессия на час, действие запишется в журнал.`)}>
          Войти как пользователь
        </button>
        <button type="button" disabled={pending} className={`${button} border-stone-300`} onClick={() => run({ action: "revoke" }, "Закрыть все сессии пользователя? Ему придётся войти заново.")}>
          Выкинуть из всех сессий
        </button>
        {blocked ? (
          <button type="button" disabled={pending} className={`${button} border-emerald-300 text-emerald-800`} onClick={() => run({ action: "unblock" })}>Разблокировать</button>
        ) : null}
      </div>

      {!blocked && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Причина блокировки" className="min-w-56 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <button type="button" disabled={pending} className={`${button} border-rose-300 text-rose-800`} onClick={() => run({ action: "block", reason }, `Заблокировать ${email}? Все его сессии закроются, войти он не сможет.`)}>
            Заблокировать
          </button>
        </div>
      )}

      {isOwnerViewer && (
        <div className="space-y-3 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Только владелец</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600">Права на платформе:</span>
            {(["ADMIN", "SUPPORT", null] as const).map((value) => (
              <button
                key={value ?? "none"}
                type="button"
                disabled={pending || role === value}
                className={`${button} ${role === value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}
                onClick={() => run({ action: "role", role: value ?? "" }, value ? `Выдать ${email} права ${value === "ADMIN" ? "администратора" : "поддержки"}?` : `Снять с ${email} права на платформе?`)}
              >
                {value === "ADMIN" ? "Администратор" : value === "SUPPORT" ? "Поддержка (просмотр)" : "Нет прав"}
              </button>
            ))}
          </div>
          {hasSecondFactor && (
            <button type="button" disabled={pending} className={`${button} border-stone-300`} onClick={() => run({ action: "reset2fa" }, "Сбросить 2FA? При следующем входе её придётся настроить заново.")}>
              Сбросить 2FA
            </button>
          )}
          <div>
            {!danger ? (
              <button type="button" className="text-sm text-rose-700 underline underline-offset-2" onClick={() => setDanger(true)}>Удалить пользователя…</button>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-900">Удаление необратимо: пропадут его организации, где он единственный участник, со всеми мероприятиями, гостями и фото. Введите почту <b>{email}</b>, чтобы подтвердить.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={email} className="min-w-56 flex-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm" />
                  <button type="button" disabled={pending || confirm.trim().toLowerCase() !== email.toLowerCase()} className={`${button} border-rose-400 bg-rose-700 text-white`} onClick={() => run({ action: "delete", confirm })}>
                    Удалить навсегда
                  </button>
                  <button type="button" className={`${button} border-stone-300`} onClick={() => { setDanger(false); setConfirm(""); }}>Отмена</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {notice && <p className={`text-sm ${notice.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{notice.text}</p>}
    </section>
  );
}
