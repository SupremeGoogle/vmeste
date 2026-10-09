"use client";

/**
 * Рассадка списком — всегда на странице, под планом.
 *
 * На телефоне это часто самый удобный способ рассаживать, а в день
 * свадьбы — запасной путь, если на планшете координатора не выполнится
 * JS. Поэтому у каждой формы два пути:
 *   — с JS список рисуется из того же состояния, что и план, и действие
 *     уходит через редактор: план и список меняются одновременно;
 *   — без JS форма отправляется серверному действию страницы, как раньше.
 * React не вызывает серверное действие, если отправку отменили в
 * `onSubmit`, — на этом и держится развилка.
 *
 * Раньше список рисовался сервером один раз, и после перестановки на
 * плане показывал рассадку до перезагрузки страницы.
 */
import { SHAPES, SHAPE_LABEL, SHAPE_LABEL_EN } from "@/lib/seating-geometry";
import { COUPLE_TABLE } from "@/lib/couple-table-style";
import { ROLE_LABEL, ROLE_LABEL_EN } from "@/lib/couple-marks";
import { useT } from "@/components/i18n-provider";
import { baseName } from "./guest-search";
import { RingsIcon } from "./rings-icon";
import type { Seating } from "./use-seating";

export type ListActions = {
  addTable: (formData: FormData) => Promise<void>;
  addCoupleTable: (formData: FormData) => Promise<void>;
  removeTable: (formData: FormData) => Promise<void>;
  changeShape: (formData: FormData) => Promise<void>;
  seatByName: (formData: FormData) => Promise<void>;
  unseat: (formData: FormData) => Promise<void>;
};

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е").trim();

export function SeatingList({
  seating, actions, eventId,
}: {
  seating: Seating;
  actions: ListActions;
  eventId: string;
}) {
  const t = useT();
  const hasCouple = seating.tables.some((table) => table.isCouple);

  return (
    <section className="mt-10 border-t border-stone-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium text-stone-900">{t("Списком", "List view")}</h2>
        <a href={`/app/e/${eventId}/seating/print`} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">{t("Печатные макеты", "Print layouts")}</a>
        <a
          href={`/api/app/events/${eventId}/seating/pdf`}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
        >
          {t("Скачать PDF", "Download PDF")}
        </a>
      </div>

      {/* Подсказки имён для полей «посадить» во всех карточках сразу. */}
      <datalist id="seating-unseated-names">
        {seating.unseated.map((guest) => (
          <option key={guest.id} value={baseName(guest.displayName)} />
        ))}
      </datalist>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {seating.tables.map((table) => (
          <div
            key={table.id}
            className="rounded-xl border bg-card p-4"
            style={
              table.isCouple
                ? { borderColor: `var(--couple-stroke, ${COUPLE_TABLE.stroke})`, background: `var(--couple-fill, ${COUPLE_TABLE.fill})`, borderWidth: 2 }
                : { borderColor: "#e7e5e4" }
            }
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-medium" style={table.isCouple ? { color: `var(--couple-text, ${COUPLE_TABLE.text})` } : undefined}>
                {table.isCouple ? <RingsIcon size={16} /> : null}{" "}
                {table.label}
              </p>

              {!table.isCouple && (
                <form
                  action={actions.changeShape}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input type="hidden" name="tableId" value={table.id} />
                  <select
                    name="shape"
                    value={table.shape}
                    onChange={(e) => seating.setShape(table.id, e.target.value)}
                    aria-label={t(`Форма стола ${table.label}`, `Shape of ${table.label}`)}
                    className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-600"
                  >
                    {SHAPES.map((shape) => (
                      <option key={shape} value={shape}>{t(SHAPE_LABEL[shape], SHAPE_LABEL_EN[shape])}</option>
                    ))}
                  </select>
                  <noscript>
                    <button className="ml-1 text-xs text-stone-500">{t("сменить", "change")}</button>
                  </noscript>
                </form>
              )}

              <form
                action={actions.removeTable}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (window.confirm(t(`Удалить «${table.label}»? Гости вернутся в список нерассаженных.`, `Delete “${table.label}”? Its guests will go back to the unseated list.`))) {
                    seating.deleteTable(table.id);
                  }
                }}
              >
                <input type="hidden" name="tableId" value={table.id} />
                <button className="px-1 py-1 text-xs text-stone-400 hover:text-red-700">{t("Удалить", "Delete")}</button>
              </form>
            </div>

            <ul className="mt-3 space-y-1.5">
              {table.seats.map((seat) => (
                <li key={seat.id} className="flex items-center gap-2 text-sm">
                  <span className="w-6 shrink-0 text-stone-400">{seat.index + 1}</span>
                  {seat.guest ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {seat.guest.displayName}
                        {seat.guest.role && seat.guest.role !== "GUEST" ? (
                          <span className="ml-1 text-xs text-stone-500">{t(ROLE_LABEL[seat.guest.role], ROLE_LABEL_EN[seat.guest.role])}</span>
                        ) : null}
                      </span>
                      <form
                        action={actions.unseat}
                        onSubmit={(e) => {
                          e.preventDefault();
                          seating.clear(seat.id);
                        }}
                      >
                        <input type="hidden" name="seatId" value={seat.id} />
                        <button className="px-1 py-1 text-xs text-stone-400 hover:text-stone-900">{t("снять", "unseat")}</button>
                      </form>
                    </>
                  ) : (
                    <form
                      action={actions.seatByName}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const name = String(new FormData(form).get("guestName") ?? "").trim();
                        if (!name) return;
                        const guest = seating.unseated.find(
                          (g) => fold(baseName(g.displayName)) === fold(name),
                        );
                        if (guest) seating.assign(seat.id, guest);
                        else seating.createGuest(name, seat.id);
                        form.reset();
                      }}
                      className="flex min-w-0 flex-1 gap-2"
                    >
                      <input type="hidden" name="seatId" value={seat.id} />
                      <input
                        name="guestName"
                        list="seating-unseated-names"
                        placeholder={
                          table.isCouple && seat.index < 2
                            ? seat.index === 0 ? t("место невесты", "bride's seat") : t("место жениха", "groom's seat")
                            : t("выбрать или вписать", "pick or type a name")
                        }
                        maxLength={120}
                        autoComplete="off"
                        className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-base text-stone-700 sm:text-sm"
                      />
                      <button className="shrink-0 px-1 text-xs text-stone-500 hover:text-stone-900">{t("посадить", "seat")}</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {seating.tables.length === 0 && (
        <p className="mt-4 text-sm text-stone-600">{t("Столов пока нет — добавьте первый.", "No tables yet — add the first one.")}</p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <form
          action={actions.addTable}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const label = String(data.get("label") ?? "").trim();
            const capacity = Number(data.get("capacity"));
            if (!label || !(capacity >= 1 && capacity <= 20)) return;
            void seating
              .createTable({ label, capacity, shape: String(data.get("shape") ?? "ROUND") })
              .then((outcome) => outcome.ok && form.reset());
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <label>
            <span className="block text-xs text-stone-500">{t("Новый стол", "New table")}</span>
            <input
              name="label" required placeholder={t("Стол 6", "Table 6")} maxLength={40}
              className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-1.5 text-base sm:text-sm"
            />
          </label>
          <label>
            <span className="block text-xs text-stone-500">{t("Форма", "Shape")}</span>
            <select
              name="shape" defaultValue="ROUND"
              className="mt-1 rounded-lg border border-stone-300 px-3 py-1.5 text-base sm:text-sm"
            >
              {SHAPES.map((shape) => (
                <option key={shape} value={shape}>{t(SHAPE_LABEL[shape], SHAPE_LABEL_EN[shape])}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-xs text-stone-500">{t("Мест", "Seats")}</span>
            <input
              name="capacity" inputMode="numeric" pattern="[0-9]*" defaultValue={8} required
              className="mt-1 w-16 rounded-lg border border-stone-300 px-3 py-1.5 text-base sm:text-sm"
            />
          </label>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">{t("Добавить стол", "Add table")}</button>
        </form>

        {!hasCouple && (
          <form
            action={actions.addCoupleTable}
            onSubmit={(e) => {
              e.preventDefault();
              seating.createCoupleTable(2);
            }}
          >
            <button
              className="rounded-lg border-2 px-4 py-1.5 text-sm font-medium"
              style={{ borderColor: `var(--couple-stroke, ${COUPLE_TABLE.stroke})`, color: `var(--couple-text, ${COUPLE_TABLE.text})`, background: `var(--couple-fill, ${COUPLE_TABLE.fill})` }}
            >
              <RingsIcon size={16} /> {t("Стол молодожёнов", "Couple's table")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
