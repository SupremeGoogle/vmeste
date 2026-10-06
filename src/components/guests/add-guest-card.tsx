"use client";

/**
 * Добавить гостя вручную.
 *
 * После добавления поля очищаются, а курсор остаётся в имени: список
 * обычно вбивают подряд, по одному человеку с листочка. Без JS это та
 * же форма, просто страница перерисуется целиком.
 */
import { useActionState, useEffect, useRef } from "react";
import { addGuestAction, type AddGuestState } from "@/app/(app)/app/e/[eventId]/guests/actions";

export function AddGuestCard({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<AddGuestState, FormData>(addGuestAction, null);
  const form = useRef<HTMLFormElement>(null);
  const name = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    form.current?.reset();
    name.current?.focus();
  }, [state]);

  return (
    <form ref={form} action={action} className="flex flex-col rounded-2xl border border-stone-200 bg-card p-5">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <h2 className="text-base font-medium text-stone-900">Добавить гостя</h2>
        <p className="mt-1 text-sm text-stone-500">По одному — Enter добавляет и сразу готов к следующему.</p>
      </div>

      <div className="mt-4 space-y-2">
        <input
          ref={name}
          name="displayName"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          placeholder="Имя и фамилия"
          className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base sm:text-sm"
        />
        <input
          name="phone"
          inputMode="tel"
          autoComplete="off"
          maxLength={40}
          placeholder="Телефон — необязательно"
          className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base sm:text-sm"
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="plusOneAllowed" className="peer sr-only" />
          <span aria-hidden className="relative h-5 w-9 rounded-full bg-stone-300 transition-colors peer-checked:bg-stone-900 peer-focus-visible:outline peer-focus-visible:outline-2 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-card after:shadow after:transition-transform peer-checked:after:translate-x-4" />
          Может прийти с парой
        </label>
        <button disabled={pending} className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Добавляем…" : "Добавить"}
        </button>
      </div>

      <p aria-live="polite" className={`mt-2 min-h-5 text-sm ${state?.ok ? "text-emerald-700" : "text-rose-700"}`}>
        {state ? <span key={state.at} className="rise inline-block">{state.ok ? `✓ ${state.message}` : state.message}</span> : null}
      </p>
    </form>
  );
}
