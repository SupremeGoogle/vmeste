import { requireEventContext } from "@/server/context";
import { printDesignSchema } from "@/lib/print-design";
import { savePrintDesign } from "@/server/services/print-design";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const parsed = printDesignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте макет" }, { status: 400 });
  await savePrintDesign(ctx, parsed.data);
  return Response.json({ ok: true });
}
