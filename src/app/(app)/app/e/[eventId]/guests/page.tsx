/**
 * Раздел «Гости»: сводка, добавление, загрузка списка и сам список.
 *
 * Импорт в два шага (PLAN.md §5.9): сначала предпросмотр, потом запись.
 * Файл заливался молча — и при неверно понятых столбцах в списке
 * оказывалась сотня строк «Иванов;+7999…», которые уже нельзя просто
 * удалить: у гостей есть ссылки. Теперь файл разбирается в черновик
 * (маршрут api/…/guests/import), организатор его проверяет и правит,
 * и только потом гости записываются. Добавленное по ошибке можно
 * отменить в первые пятнадцать минут.
 */
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { countGuests, importBatchInfo, listGuests } from "@/server/repositories/guests";
import { peekImportDraft } from "@/server/services/import-draft";
import { aiConfigured } from "@/server/import/deepseek";
import { COLUMN_ROLES, ROLE_LABEL, ROLE_LABEL_EN, cell } from "@/server/import/structure";
import { AddGuestCard } from "@/components/guests/add-guest-card";
import { ImportCard } from "@/components/guests/import-card";
import { ImportPreview, type PreviewData } from "@/components/guests/import-preview";
import { countWord, makeT } from "@/lib/i18n";
import { getUiLang } from "@/server/i18n";
import { GuestList, type ListGuest } from "@/components/guests/guest-list";
import { CountUp } from "@/components/motion/motion";
import { InviteShare } from "@/components/guests/invite-share";
import { inviteByNameAction, undoImportAction } from "./actions";
import { RsvpAnswers } from "./answers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ draft?: string; view?: string; tab?: string; imported?: string; importError?: string; notice?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const ctx = await requireEventContext(eventId);
  const [event, guests, counts, batch] = await Promise.all([
    getEvent(ctx, eventId),
    listGuests(ctx),
    countGuests(ctx),
    query.imported ? importBatchInfo(ctx, query.imported) : null,
  ]);
  if (!event) notFound();
  const lang = await getUiLang();
  const t = makeT(lang);

  const workspace = query.draft ? peekImportDraft(ctx, query.draft) : null;

  let preview: PreviewData | null = null;
  if (workspace) {
    const sheet = workspace.workbookSheets[workspace.plan.sheetIndex];
    const dataRows = sheet.rows.slice(workspace.plan.firstDataRow);
    preview = {
      fileName: workspace.fileName,
      sheets: workspace.sheets,
      sheetIndex: workspace.plan.sheetIndex,
      columns: workspace.plan.columns.map((col) => ({
        index: col.index,
        header: col.header,
        role: col.role,
        samples: dataRows.map((row) => cell(row, col.index)).filter(Boolean).slice(0, 3).map((v) => v.slice(0, 40)),
      })),
      roleOptions: COLUMN_ROLES.map((value) => ({ value, label: t(ROLE_LABEL[value], ROLE_LABEL_EN[value]) })),
      planNote: workspace.plan.note,
      planSource: workspace.plan.source,
      guests: workspace.guests,
      warnings: workspace.warnings,
      skippedRows: workspace.skippedRows,
      ai: workspace.ai,
    };
  }

  // Гость, вписавший себя сам, мог просто потерять именную ссылку: если в
  // списке уже есть человек с тем же именем, подсказываем организатору.
  const invitedByKey = new Map<string, string>();
  for (const guest of guests) {
    if (!guest.selfRegistered && guest.parentGuestId === null && !invitedByKey.has(guest.searchKey)) invitedByKey.set(guest.searchKey, guest.displayName);
  }

  const listData: ListGuest[] = guests.map((guest) => ({
    id: guest.id,
    displayName: guest.displayName,
    role: guest.role,
    phone: guest.phone,
    note: guest.note,
    rsvpStatus: guest.rsvpStatus,
    plusOneAllowed: guest.plusOneAllowed,
    plusOneName: guest.plusOneName,
    isPlusOne: guest.parentGuestId !== null,
    linkToken: guest.linkToken,
    linkOpened: guest.linkOpenedAt !== null,
    selfRegistered: guest.selfRegistered,
    maybeDuplicateOf: guest.selfRegistered ? invitedByKey.get(guest.searchKey) ?? null : null,
    table: guest.seat?.table.label ?? null,
    seatIndex: guest.seat?.index ?? null,
  }));

  const pending = counts.total - counts.accepted - counts.declined;
  const answered = counts.total ? Math.round(((counts.accepted + counts.declined) / counts.total) * 100) : 0;
  const seatedShare = counts.accepted ? Math.min(100, Math.round((counts.seated / counts.accepted) * 100)) : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="rise-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("Всего гостей", "Total guests"), value: counts.total, hint: t(`ответили ${answered}%`, `${answered}% responded`), bar: answered },
          { label: t("Придут", "Attending"), value: counts.accepted, tone: "text-emerald-700" },
          { label: t("Ждём ответа", "Awaiting reply"), value: pending, hint: counts.declined ? t(`не придут: ${counts.declined}`, `declined: ${counts.declined}`) : undefined },
          { label: t("Рассажено", "Seated"), value: counts.seated, hint: counts.accepted ? t(`${seatedShare}% пришедших`, `${seatedShare}% of attending`) : undefined, bar: seatedShare },
        ].map((tile, i) => (
          <div key={tile.label} style={{ "--i": i } as React.CSSProperties} className="rounded-2xl border border-stone-200 bg-card p-4 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-back)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/5">
            <p className={`tile-value text-2xl tabular-nums ${tile.tone ?? "text-stone-900"}`}><CountUp value={tile.value} /></p>
            <p className="text-sm text-stone-500">{tile.label}</p>
            {tile.bar !== undefined && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                <div className="h-full rounded-full bg-stone-900 transition-[width] duration-500" style={{ width: `${tile.bar}%` }} />
              </div>
            )}
            {tile.hint && <p className="mt-1 text-xs text-stone-400">{tile.hint}</p>}
          </div>
        ))}
      </div>

      {/* Список и ответы анкеты — одни и те же гости, два взгляда на них. */}
      <nav className="mt-6 inline-flex rounded-xl border border-stone-200 bg-card p-1 text-sm" aria-label={t("Вид", "View")}>
        {[
          { key: "list", label: t("Список гостей", "Guest list"), href: `/app/e/${eventId}/guests` },
          { key: "answers", label: t("Ответы анкеты", "RSVP answers"), href: `/app/e/${eventId}/guests?tab=answers` },
        ].map((item) => {
          const active = (query.tab === "answers" ? "answers" : "list") === item.key;
          return (
            <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-1.5 transition-colors ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {query.tab === "answers" ? <RsvpAnswers eventId={eventId} event={event} /> : <>
      {query.importError && (
        <p role="alert" className="rise mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {query.importError}
        </p>
      )}
      {query.notice && (
        <p role="status" className="rise mt-6 rounded-xl border border-stone-200 bg-card px-4 py-3 text-sm text-stone-700">
          {query.notice}
        </p>
      )}
      {query.draft && !workspace && (
        <p role="alert" className="rise mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("Предпросмотр устарел (он хранится полчаса) — загрузите файл снова.", "This preview has expired (previews are kept for 30 minutes) — please upload the file again.")}
        </p>
      )}
      {batch && (
        <div role="status" className="rise mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>{t(
            `✓ Добавили ${countWord(lang, batch.count, ["гостя", "гостя", "гостей"], ["guest", "guests"])} из файла.`,
            `✓ Added ${countWord(lang, batch.count, ["гостя", "гостя", "гостей"], ["guest", "guests"])} from the file.`,
          )}</span>
          {batch.undoable && (
            <form action={undoImportAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="batchId" value={query.imported} />
              <button className="rounded-lg border border-emerald-300 bg-card px-3 py-1.5 text-emerald-900 hover:bg-emerald-100">
                {t("Отменить импорт", "Undo import")}
              </button>
            </form>
          )}
        </div>
      )}

      {preview && query.draft ? (
        <ImportPreview key={`${query.draft}-${preview.sheetIndex}-${preview.columns.map((c) => c.role).join()}`} eventId={eventId} draftId={query.draft} data={preview} />
      ) : (
        // Добавление по одному — то, чем пользуются каждый день; загрузка
        // файла свёрнута в строку под ним и разворачивается по нажатию.
        <div className="mt-6 space-y-3">
          <AddGuestCard eventId={eventId} />
          <ImportCard eventId={eventId} aiAvailable={aiConfigured()} />
          <InviteShare
            publicPath={`/i/${event.slug}`}
            published={event.status === "PUBLISHED"}
            editorHref={`/app/e/${eventId}/invite?edit=1`}
            inviteByName={inviteByNameAction.bind(null, eventId)}
          />
        </div>
      )}

      <GuestList eventId={eventId} eventSlug={event.slug} guests={listData} byTable={query.view === "bytable"} />
      </>}
    </main>
  );
}
