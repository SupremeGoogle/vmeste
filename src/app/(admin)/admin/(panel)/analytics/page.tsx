/**
 * Аналитика платформы: путь организатора от регистрации до фото гостей,
 * активность по дням, поведение гостей, самые живые свадьбы и шаблоны.
 *
 * Всё — из своей базы (server/admin/analytics.ts). Посещаемость сайта —
 * отдельно, в Rybbit: здесь только ссылка на него, когда он подключён.
 * Графики — по одному на метрику: шесть рядов разного масштаба на одной
 * оси прятали бы маленькие цифры под большими.
 */
import Link from "next/link";
import { requireAdmin } from "@/server/admin/access";
import { dailyMetrics, guestBehaviour, liveliestEvents, organizerFunnel, templateConversion } from "@/server/admin/analytics";
import { rybbitEnabled, rybbitOverview } from "@/server/analytics/rybbit";
import { findTemplate } from "@/lib/invite-templates";

export const dynamic = "force-dynamic";

const num = (value: number) => value.toLocaleString("ru-RU");
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");
const STATUS: Record<string, string> = { DRAFT: "черновик", PUBLISHED: "опубликована", ARCHIVED: "в архиве" };

export default async function AdminAnalytics() {
  await requireAdmin();
  const [funnel, metrics, guests, lively, templates, rybbit] = await Promise.all([
    organizerFunnel(),
    dailyMetrics(30),
    guestBehaviour(),
    liveliestEvents(10),
    templateConversion(),
    rybbitOverview(30),
  ]);
  const top = Math.max(1, ...funnel.map((step) => step.value));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Аналитика</h1>
          <p className="mt-1 text-sm text-stone-500">Как организаторы доходят до свадьбы и что делают гости. Последние 30 дней, время московское.</p>
        </div>
        {rybbitEnabled() && rybbit && !("error" in rybbit) ? (
          <a href={rybbit.dashboardUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Посещаемость в Rybbit ↗</a>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Открыли приглашение" value={pct(guests.opened, guests.guests)} hint={`${num(guests.opened)} из ${num(guests.guests)} гостей`} />
        <Tile label="Ответили" value={pct(guests.answered, guests.guests)} hint={`${num(guests.answered)} · отказались ${num(guests.declined)}`} />
        <Tile label="Пришли по QR" value={num(guests.checkedIn)} hint={`вписались сами: ${num(guests.selfRegistered)}`} />
        <Tile label="Снимали на свадьбе" value={num(guests.photographers)} hint={`фото ${num(guests.photos)} · отклонено ${num(guests.photosRejected)}`} />
      </section>

      <Card title="Путь организатора">
        <ol className="space-y-2.5">
          {funnel.map((step, index) => {
            const previous = index > 0 ? funnel[index - 1].value : null;
            return (
              <li key={step.label} className="grid grid-cols-[minmax(9rem,13rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{step.label}</span>
                  <span className="block text-xs text-stone-500">{step.hint}</span>
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-stone-100" title={`${step.label}: ${step.value}`}>
                  <span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.max(step.value ? 2 : 0, (step.value / top) * 100)}%` }} />
                </span>
                <span className="w-24 text-right tabular-nums">
                  {num(step.value)}
                  {previous !== null && index > 1 ? <span className="ml-1.5 text-xs text-stone-500">{pct(step.value, previous)}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-stone-500">Процент — доля от предыдущего шага. Первые два шага считают людей, остальные — свадьбы.</p>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.key} title={metric.label} action={<span className="text-sm tabular-nums">{num(metric.total)}</span>}>
            <DayBars days={metric.days} label={metric.label} />
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Самые живые свадьбы за 30 дней">
          {lively.length === 0 ? (
            <p className="text-sm text-stone-500">Пока тихо: ни ответов, ни фото, ни пожеланий.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-stone-500">
                <tr><th className="pb-2 font-normal">Свадьба</th><th className="pb-2 text-right font-normal">Ответы</th><th className="pb-2 text-right font-normal">Фото</th><th className="pb-2 text-right font-normal">Пожелания</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lively.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2">
                      {event.title}
                      <span className="block text-xs text-stone-500">{event.eventDate.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })} · {STATUS[event.status] ?? event.status}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{event.rsvps}</td>
                    <td className="py-2 text-right tabular-nums">{event.photos}</td>
                    <td className="py-2 text-right tabular-nums">{event.wishes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link href="/admin/events" className="mt-3 inline-block text-xs underline underline-offset-2">Все мероприятия →</Link>
        </Card>

        <Card title="Шаблоны: выбрали → опубликовали">
          <ul className="space-y-1.5 text-sm">
            {templates.slice(0, 12).map((row) => (
              <li key={row.template} className="flex items-center justify-between gap-3">
                <span className="truncate">{findTemplate(row.template)?.name ?? row.template}</span>
                <span className="shrink-0 tabular-nums text-stone-600">{row.events} → {row.published} <span className="text-xs text-stone-500">({pct(row.published, row.events)})</span></span>
              </li>
            ))}
            {templates.length === 0 && <li className="text-stone-500">Шаблоны ещё не выбирали</li>}
          </ul>
        </Card>
      </section>

      {!rybbitEnabled() ? (
        <p className="text-xs text-stone-500">Посещаемость сайта (визиты, источники, устройства) появится, когда будет подключён Rybbit: NEXT_PUBLIC_RYBBIT_HOST и NEXT_PUBLIC_RYBBIT_SITE_ID.</p>
      ) : null}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-stone-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Столбики по дням для одной метрики; подсказка с датой и числом — при наведении. */
function DayBars({ days, label }: { days: { day: string; value: number }[]; label: string }) {
  const peak = Math.max(0, ...days.map((day) => day.value));
  const max = Math.max(1, peak);
  const width = 100 / days.length;
  const date = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={`${label} по дням`}>
        <line x1="0" y1="31.8" x2="100" y2="31.8" className="stroke-stone-200" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        {days.map((day, index) => {
          const height = (day.value / max) * 30;
          return (
            <g key={day.day}>
              <rect x={index * width} y="0" width={width} height="32" fill="transparent"><title>{`${date(day.day)}: ${day.value}`}</title></rect>
              {day.value > 0 ? <rect x={index * width + width * 0.15} y={32 - height} width={width * 0.7} height={height} rx="0.6" className="pointer-events-none fill-stone-700" /> : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-stone-500">
        <span>{date(days[0].day)}</span>
        <span>{peak ? `максимум ${peak} в день` : "пока ни одного"}</span>
        <span>{date(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}
