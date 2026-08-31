-- AlterTable
ALTER TABLE "events" ADD COLUMN     "inviteTheme" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- CreateTable
CREATE TABLE "event_assets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_assets_eventId_idx" ON "event_assets"("eventId");

-- AddForeignKey
ALTER TABLE "event_assets" ADD CONSTRAINT "event_assets_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
