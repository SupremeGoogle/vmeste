import { db } from "@/server/db";
import type { EventContext } from "@/server/context";
import type { Prisma } from "@/generated/prisma/client";

export async function readPrintDesignJson(ctx: EventContext) {
  const event = await db.event.findFirst({ where: { id: ctx.eventId, orgId: ctx.orgId }, select: { printDesign: true } });
  return event?.printDesign ?? null;
}

export async function writePrintDesignJson(ctx: EventContext, value: Prisma.InputJsonValue) {
  await db.event.update({ where: { orgId_id: { orgId: ctx.orgId, id: ctx.eventId } }, data: { printDesign: value } });
}

/** Atomic merge keeps QR, seating and guest-site changes from overwriting each other. */
export async function mergePrintDesignJson(ctx: EventContext, value: Prisma.InputJsonObject) {
  const updated = await db.$executeRaw`
    UPDATE "events"
    SET "printDesign" = (CASE WHEN jsonb_typeof("printDesign") = 'object' THEN "printDesign" ELSE '{}'::jsonb END) || ${JSON.stringify(value)}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${ctx.eventId} AND "orgId" = ${ctx.orgId}
  `;
  if (updated !== 1) throw new Error("Event not found");
}
