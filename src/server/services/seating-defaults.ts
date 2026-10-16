/**
 * Рассадка новой свадьбы: стол молодожёнов, квадратный и круглый на 8 мест.
 *
 * Пустой план пугает — непонятно, с чего начать. Три стола показывают,
 * какие формы бывают, и их легко подвинуть, переименовать или удалить.
 * Ставятся теми же операциями, что и из редактора (seating-ops.ts): место
 * на плане выбирает сервер, версия рассадки растёт как обычно.
 */
import type { EventContext } from "@/server/context";
import { applyOp } from "@/server/services/seating-ops";

export async function seedDefaultSeating(ctx: EventContext, lang: "ru" | "en"): Promise<void> {
  const word = lang === "en" ? "Table" : "Стол";
  await applyOp(ctx, { kind: "createCoupleTable", capacity: 2 }, null);
  await applyOp(ctx, { kind: "createTable", label: `${word} 1`, shape: "RECT", capacity: 8 }, null);
  await applyOp(ctx, { kind: "createTable", label: `${word} 2`, shape: "ROUND", capacity: 8 }, null);
}
