import { isSearchable, normalizeName } from "@/lib/name-normalize";

// Только демонстрационные данные: никакого доступа к гостям реальных свадеб.
export const DEMO_ENTRY_EVENT = { title: "Валерия и Давид", dateLabel: "15 августа 2027", venue: "Усадьба «Рябинка»" };
export const DEMO_ENTRY_GUESTS = [
  { guestId: "demo-1", displayName: "Анастасия Орлова", tableLabel: "Стол 3", seatNumber: 5, aliases: ["Настя", "Ася"] },
  { guestId: "demo-2", displayName: "Александр Крылов", tableLabel: "Стол 1", seatNumber: 2, aliases: ["Саша", "Шура"] },
  { guestId: "demo-3", displayName: "Ирина Соколова", tableLabel: "Стол 2", seatNumber: 4, aliases: ["Ира"] },
  { guestId: "demo-4", displayName: "Михаил Зайцев", tableLabel: "Стол 4", seatNumber: 1, aliases: ["Миша"] },
  { guestId: "demo-5", displayName: "Екатерина Белова", tableLabel: "Стол 5", seatNumber: 7, aliases: ["Катя"] },
  { guestId: "demo-6", displayName: "Дмитрий Морозов", tableLabel: "Стол 2", seatNumber: 6, aliases: ["Дима"] },
  { guestId: "demo-7", displayName: "Мария Гринёва", tableLabel: "Стол 1", seatNumber: 8, aliases: ["Маша"] },
  { guestId: "demo-8", displayName: "Тимур Асланов", tableLabel: "Стол 3", seatNumber: 3, aliases: [] },
  { guestId: "demo-9", displayName: "Александра Белова", tableLabel: "Стол 5", seatNumber: 2, aliases: ["Саша", "Шура"] },
];

export function lookupDemoGuest(query: string) {
  if (!isSearchable(query)) return { status: "too_short" as const };
  const words = normalizeName(query).split(" ");
  const matches = DEMO_ENTRY_GUESTS.filter(guest => {
    const parts = normalizeName(guest.displayName).split(" ").concat(guest.aliases.map(normalizeName));
    return words.every(word => parts.some(part => part.startsWith(word)));
  });
  if (!matches.length) return { status: "not_found" as const };
  if (matches.length > 5) return { status: "too_many" as const };
  return { status: "ok" as const, matches: matches.map(({ guestId, displayName, tableLabel }) => ({ guestId, displayName, tableLabel })) };
}
