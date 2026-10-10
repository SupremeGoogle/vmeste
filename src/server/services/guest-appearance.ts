import type { EventContext } from "@/server/context";
import { findGuestAppearance } from "@/lib/guest-appearance";
import { mergePrintDesignJson } from "@/server/repositories/print-design";

export async function saveGuestAppearance(ctx: EventContext, id: unknown): Promise<boolean> {
  if (id !== "original" && !findGuestAppearance(id)) return false;
  await mergePrintDesignJson(ctx, { guestSite: id === "original" ? null : String(id) });
  return true;
}
