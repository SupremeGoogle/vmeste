import type { EventContext } from "@/server/context";
import { printDesignSchema, type PrintDesign, type PrintMode } from "@/lib/print-design";
import { readPrintDesignJson, mergePrintDesignJson } from "@/server/repositories/print-design";

type SavedDesigns = Partial<Record<PrintMode, PrintDesign>>;

export async function getSavedPrintDesigns(ctx: EventContext): Promise<SavedDesigns> {
  const value = await readPrintDesignJson(ctx);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const seating = printDesignSchema.safeParse(source.seating);
  const qr = printDesignSchema.safeParse(source.qr);
  return {
    ...(seating.success && seating.data.mode === "seating" ? { seating: seating.data } : {}),
    ...(qr.success && qr.data.mode === "qr" ? { qr: qr.data } : {}),
  };
}

export async function savePrintDesign(ctx: EventContext, design: PrintDesign): Promise<void> {
  await mergePrintDesignJson(ctx, { [design.mode]: design });
}
