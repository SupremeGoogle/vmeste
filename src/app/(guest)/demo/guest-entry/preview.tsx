"use client";

import { useState } from "react";
import { GuestFinder, GuestHeader, GuestSeatCard, type Match } from "@/components/guest/entry";
import { DEMO_ENTRY_EVENT, DEMO_ENTRY_GUESTS } from "@/lib/demo-guest-entry";

export function GuestEntryDemo() {
  const [picked, setPicked] = useState<Match | null>(null);
  const [showPlan, setShowPlan] = useState(true);
  const guest = DEMO_ENTRY_GUESTS.find(item => item.guestId === picked?.guestId);
  const tablemates = guest ? DEMO_ENTRY_GUESTS.filter(item => item.tableLabel === guest.tableLabel && item.guestId !== guest.guestId).map(item => item.displayName) : [];

  return (
    <main className="guest-wedding-page mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-10">
      <GuestHeader event={DEMO_ENTRY_EVENT} />
      {guest ? (
        <div aria-live="polite">
          <p className="mt-6 text-center font-serif text-xl text-muted">Добро пожаловать,</p>
          <h2 className="mt-1 text-center font-serif text-[34px] leading-tight">{guest.displayName}</h2>
          <GuestSeatCard code="demo" seat={{ tableId: guest.tableLabel, tableLabel: guest.tableLabel, seatNumber: guest.seatNumber, tablemates }} planHref="#demo-plan" />
          <button type="button" className="mt-5 min-h-11 w-full text-sm text-muted underline underline-offset-4" onClick={() => setPicked(null)}>Найти себя заново</button>
        </div>
      ) : <GuestFinder code="demo" lookupUrl="/api/demo/guest-entry/lookup" onChoose={setPicked} planHref="#demo-plan" autoFocus={false} />}

      <p className="mt-4 text-center text-xs text-muted">Пример свадьбы · попробуйте «Настя», «Ира» или «Саша»</p>
      <section id="demo-plan" className="guest-card mt-6 scroll-mt-4 p-5">
        <button type="button" aria-expanded={showPlan} className="min-h-11 w-full text-left font-serif text-2xl" onClick={() => setShowPlan(value => !value)}>План зала <span aria-hidden className="float-right">{showPlan ? "−" : "+"}</span></button>
        {showPlan ? (
          <div className="mt-4 grid grid-cols-3 gap-3" aria-label="План демонстрационного зала">
            <p className="col-span-3 mb-3 rounded-xl border border-line py-3 text-center text-sm text-muted">Молодожёны</p>
            {[1, 2, 3, 4, 5].map(table => <div key={table} className={`flex aspect-square items-center justify-center rounded-full border border-line text-sm ${guest?.tableLabel === `Стол ${table}` ? "bg-ink text-card" : "bg-paper text-ink"}`}>Стол {table}</div>)}
          </div>
        ) : null}
      </section>
    </main>
  );
}
