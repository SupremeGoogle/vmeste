-- Подарок без брони («просто идея») и вход по QR без списка гостей.
ALTER TABLE "gifts" ADD COLUMN "reservable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN "qrEntryOpen" BOOLEAN NOT NULL DEFAULT false;
