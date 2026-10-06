/**
 * Этапы дня по времени — общий список для организатора и для команды
 * по ссылке. Кнопка на этапе отмечает его выполненным и, если к этапу
 * привязано действие, переключает экран в зале или проводит розыгрыш.
 *
 * Розыгрыш спрашивает подтверждение: победителя выбирают один раз,
 * случайное нажатие в кармане ведущего не должно его определить.
 */
import type { DayStep } from "@/generated/prisma/client";
import { STEP_ACTIONS } from "@/lib/wedding-day";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmButton } from "@/components/invite/confirm-button";

/** Этап «запускается» дольше двух минут — запуск, скорее всего, оборвался. */
const STALL_MS = 120_000;

type Props = {
  steps: DayStep[];
  timezone: string;
  now: number;
  run: (data: FormData) => Promise<void>;
  /** Что показать под этапом — у организатора это правка и удаление. */
  children?: (step: DayStep) => React.ReactNode;
};

export function DayPlanList({ steps, timezone, now, run, children }: Props) {
  const time = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const day = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, day: "numeric", month: "long" });
  const days = new Set(steps.map((step) => day.format(step.startsAt)));

  if (steps.length === 0) {
    return <p className="mt-4 text-sm text-stone-600">Этапов пока нет.</p>;
  }

  return (
    <ol className="day-plan-list mt-4 space-y-3">
      {steps.map((step) => {
        const stalled = step.status === "RUNNING" && step.runStartedAt !== null && now - step.runStartedAt.getTime() > STALL_MS;
        const runnable = step.status === "PENDING" || stalled;
        const done = step.status === "DONE";
        const label =
          stalled ? "Запустить ещё раз"
          : step.status === "RUNNING" ? "Запускается…"
          : done ? "Выполнено"
          : step.action === "NONE" ? "Готово"
          : step.action === "RAFFLE" ? "Провести розыгрыш"
          : "Показать на экране";

        return (
          <li key={step.id} className={`day-plan-step rounded-xl border bg-card p-4 ${done ? "border-stone-200 opacity-70" : "border-stone-200"}`}>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
              <div className="w-14 shrink-0">
                <time dateTime={step.startsAt.toISOString()} className={`day-plan-time text-xl tabular-nums ${done ? "text-stone-400 line-through" : "text-stone-900"}`}>
                  {time.format(step.startsAt)}
                </time>
                {/* Дату показываем, только если план растянут на несколько дней. */}
                {days.size > 1 ? <p className="text-xs text-stone-500">{day.format(step.startsAt)}</p> : null}
              </div>

              <div className="min-w-0 flex-1 basis-48">
                <p className="font-medium text-stone-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {[
                    step.responsible,
                    step.action !== "NONE" ? STEP_ACTIONS[step.action].toLowerCase() : "",
                    step.reminderMinutes ? `напомнить за ${step.reminderMinutes} мин` : "",
                  ].filter(Boolean).join(" · ")}
                </p>
                {step.notes ? <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{step.notes}</p> : null}
              </div>

              {/* На телефоне кнопка уходит под текст этапа, иначе название сжимается в столбик. */}
              <form action={run} className="ml-[4.5rem] shrink-0 sm:ml-0">
                <input type="hidden" name="stepId" value={step.id} />
                {step.action === "RAFFLE" && runnable ? (
                  <ConfirmButton
                    confirmText="Зафиксировать участников, выбрать победителя и показать розыгрыш на экране?"
                    className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white"
                  >
                    {label}
                  </ConfirmButton>
                ) : (
                  <SubmitButton
                    disabled={!runnable}
                    pendingText="Минуту…"
                    className={`rounded-lg px-3 py-2 text-sm ${runnable ? "bg-stone-900 text-white" : "text-stone-500"}`}
                  >
                    {label}
                  </SubmitButton>
                )}
              </form>
            </div>
            {children?.(step)}
          </li>
        );
      })}
    </ol>
  );
}
