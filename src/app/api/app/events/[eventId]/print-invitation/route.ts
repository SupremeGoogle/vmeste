import { requireEventContext } from "@/server/context";
import { printInvitationSchema } from "@/lib/print-invitation";
import { savePrintInvitation } from "@/server/services/print-invitation";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const parsed = printInvitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте макет приглашения" }, { status: 400 });
  await savePrintInvitation(ctx, parsed.data);
  return Response.json({ ok: true });
}
