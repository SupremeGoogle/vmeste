-- Дополнение существующих мероприятий без удаления данных.
CREATE TYPE "DayStepAction" AS ENUM ('NONE', 'SCREEN_PHOTOS', 'SCREEN_WISHES', 'SCREEN_MIXED', 'RAFFLE');
CREATE TYPE "DayStepStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE');

ALTER TABLE "events"
  ADD COLUMN "giftsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "giftTransferLabel" TEXT NOT NULL DEFAULT 'Подарок в конверте',
  ADD COLUMN "giftTransferDetails" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "giftTransferUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "albumEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "teamPlanToken" TEXT,
  ADD COLUMN "activeRaffleId" TEXT;

ALTER TABLE "feedback_forms" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'GENERAL';
CREATE UNIQUE INDEX "events_teamPlanToken_key" ON "events"("teamPlanToken");

CREATE TABLE "gifts" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gifts_eventId_id_key" ON "gifts"("eventId", "id");
CREATE INDEX "gifts_eventId_createdAt_idx" ON "gifts"("eventId", "createdAt");
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gift_reservations" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gift_reservations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gift_reservations_giftId_key" ON "gift_reservations"("giftId");
CREATE UNIQUE INDEX "gift_reservations_eventId_giftId_key" ON "gift_reservations"("eventId", "giftId");
CREATE INDEX "gift_reservations_eventId_guestId_idx" ON "gift_reservations"("eventId", "guestId");
ALTER TABLE "gift_reservations" ADD CONSTRAINT "gift_reservations_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gift_reservations" ADD CONSTRAINT "gift_reservations_eventId_giftId_fkey" FOREIGN KEY ("eventId", "giftId") REFERENCES "gifts"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gift_reservations" ADD CONSTRAINT "gift_reservations_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "day_steps" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "responsible" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "reminderMinutes" INTEGER NOT NULL DEFAULT 10,
  "action" "DayStepAction" NOT NULL DEFAULT 'NONE',
  "raffleId" TEXT,
  "status" "DayStepStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "runStartedAt" TIMESTAMP(3),
  CONSTRAINT "day_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "day_steps_eventId_startsAt_idx" ON "day_steps"("eventId", "startsAt");
ALTER TABLE "day_steps" ADD CONSTRAINT "day_steps_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
