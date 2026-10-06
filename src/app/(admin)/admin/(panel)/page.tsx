/** Сводка платформы: люди, свадьбы, гости, посещаемость, здоровье сервера. */
import Link from "next/link";
import { requireAdmin } from "@/server/admin/access";
import { dailySeries, listEvents, listUsers, platformStats, systemHealth, templateUsage } from "@/server/admin/stats";
import { rybbitEnabled, rybbitOverview } from "@/server/analytics/rybbit";
import { storageReachable } from "@/server/storage/s3";
import { telegramConfigured } from "@/server/notify/telegram";
import { findTemplate } from "@/lib/invite-templates";

export const dynamic = "force-dynamic";

const num = (value: number) => value.toLocaleString("ru-RU");
const bytes = (value: number) => (value > 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} ГБ` : `${Math.round(value / 1024 ** 2)} МБ`);
const date = (value: Date) => value.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });

export default async function AdminOverview() {
  await requireAdmin();
  const [stats, series, health, storage, templates, recentUsers, recentEvents, rybbit] = await Promise.all([
    platformStats(),
    dailySeries(30),
    systemHealth(),
    storageReachable(),
    templateUsage(),
    listUsers("", 6),
    listEvents("", 6),
    rybbitOverview(30),
  ]);
  const sentry = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  const answered = stats.guests.accepted + stats.guests.declined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">Сводка</h1>
        <p className="mt-1 text-sm text-stone-500">Вся платформа целиком. Цифры — на этот момент.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Пользователи" value={num(stats.users.total)} hint={`+${stats.users.new7} за неделю · активны ${stats.users.active7}`} />
        <Kpi label="Мероприятия" value={num(stats.events.total)} hint={`${stats.events.published} опубл. · ${stats.events.upcoming30} в ближайший месяц`} />
        <Kpi label="Гости" value={num(stats.guests.total)} hint={`ответили ${stats.guests.total ? Math.round((answered / stats.guests.total) * 100) : 0}% · сами ${stats.guests.selfRegistered}`} />
        <Kpi label="Фото" value={num(stats.content.photos)} hint={`${bytes(stats.content.photoBytes + stats.content.assetBytes)} в хранилище`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Последние 30 дней">
          <Bars series={series} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-500">
            <Legend color="bg-stone-800" label={`Регистрации: ${series.reduce((sum, day) => sum + day.users, 0)}`} />
            <Legend color="bg-amber-500" label={`Мероприятия: ${series.reduce((sum, day) => sum + day.events, 0)}`} />
            <Legend color="bg-emerald-500" label={`Ответы гостей: ${series.reduce((sum, day) => sum + day.rsvps, 0)}`} />
          </div>
        </Card>

        <Card title="Посещаемость (Rybbit)">
          {!rybbitEnabled() ? (
            <Empty>Rybbit не подключён. Задайте NEXT_PUBLIC_RYBBIT_HOST и NEXT_PUBLIC_RYBBIT_SITE_ID.</Empty>
          ) : !rybbit ? (
            <Empty>Скрипт работает. Для цифр здесь добавьте RYBBIT_API_KEY.</Empty>
          ) : "error" in rybbit ? (
            <Empty>Rybbit не ответил: {rybbit.error}</Empty>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Посетители" value={num(rybbit.users)} />
                <Metric label="Просмотры" value={num(rybbit.pageviews)} />
                <Metric label="Сеансы" value={num(rybbit.sessions)} />
                <Metric label="Отказы" value={`${Math.round(rybbit.bounceRate)}%`} />
              </dl>
              <a href={rybbit.dashboardUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm underline underline-offset-2">Открыть Rybbit →</a>
            </>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Здоровье">
          <ul className="space-y-2 text-sm">
            <Status ok={health.dbMs !== null} label="База данных" detail={health.dbMs !== null ? `${health.dbMs} мс` : "не отвечает"} />
            <Status ok={storage} label="Хранилище файлов" detail={storage ? "отвечает" : "не отвечает"} />
            <Status ok={sentry} label="Sentry (ошибки)" detail={sentry ? "подключён" : "не настроен"} />
            <Status ok={rybbitEnabled()} label="Rybbit (аналитика)" detail={rybbitEnabled() ? "подключён" : "не настроен"} />
            <Status ok={telegramConfigured()} label="Уведомления в Telegram" detail={telegramConfigured() ? "подключены" : "ждут токен бота"} />
          </ul>
          <p className="mt-3 text-xs text-stone-500">Память {health.memoryMb} МБ · работает {health.uptimeHours} ч · Node {health.node}</p>
        </Card>

        <Card title="Гости">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Придут" value={num(stats.guests.accepted)} />
            <Metric label="Не придут" value={num(stats.guests.declined)} />
            <Metric label="Ждём ответа" value={num(stats.guests.pending)} />
            <Metric label="Открыли ссылку" value={num(stats.guests.opened)} />
            <Metric label="Пожелания" value={num(stats.content.wishes)} />
            <Metric label="Подарков забронировано" value={`${stats.content.giftsReserved} из ${stats.content.gifts}`} />
          </dl>
        </Card>

        <Card title="Шаблоны приглашений">
          <ul className="space-y-1.5 text-sm">
            {templates.slice(0, 8).map((row) => (
              <li key={row.template} className="flex items-center justify-between gap-3">
                <span className="truncate">{findTemplate(row.template)?.name ?? row.template}</span>
                <span className="text-stone-500">{row.events}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Новые пользователи" action={<Link href="/admin/users" className="text-xs underline underline-offset-2">Все</Link>}>
          <ul className="divide-y divide-stone-100 text-sm">
            {recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/users/${user.id}`} className="min-w-0 truncate hover:underline">{user.name} <span className="text-stone-500">· {user.email}</span></Link>
                <span className="shrink-0 text-xs text-stone-500">{date(user.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Новые мероприятия" action={<Link href="/admin/events" className="text-xs underline underline-offset-2">Все</Link>}>
          <ul className="divide-y divide-stone-100 text-sm">
            {recentEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{event.title} <span className="text-stone-500">· {event.guests} гостей</span></span>
                <span className="shrink-0 text-xs text-stone-500">{date(event.eventDate)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-lg">{value}</dd>
    </div>
  );
}

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />{label}</span>
      <span className="text-xs text-stone-500">{detail}</span>
    </li>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`size-2 rounded-sm ${color}`} />{label}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-stone-500">{children}</p>;
}

/** Столбики по дням: три ряда рядом, своя шкала у каждого ряда не нужна — одна общая. */
function Bars({ series }: { series: { day: string; users: number; events: number; rsvps: number }[] }) {
  const max = Math.max(1, ...series.flatMap((day) => [day.users, day.events, day.rsvps]));
  const width = 100 / series.length;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Регистрации, мероприятия и ответы гостей по дням">
      {series.map((day, index) => {
        const x = index * width;
        const bar = (value: number, offset: number, fill: string) => {
          const height = (value / max) * 38;
          return <rect key={fill} x={x + offset * (width / 3.4) + 0.1} y={40 - height} width={width / 3.6} height={height} className={fill}><title>{`${day.day}: ${value}`}</title></rect>;
        };
        return <g key={day.day}>{bar(day.users, 0, "fill-stone-800")}{bar(day.events, 1, "fill-amber-500")}{bar(day.rsvps, 2, "fill-emerald-500")}</g>;
      })}
    </svg>
  );
}
