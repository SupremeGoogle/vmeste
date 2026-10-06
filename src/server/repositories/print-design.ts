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
