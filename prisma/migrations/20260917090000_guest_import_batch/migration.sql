-- Отметка импорта: по ней можно отменить загрузку списка гостей.
ALTER TABLE "guests" ADD COLUMN "importBatchId" TEXT;
CREATE INDEX "guests_eventId_importBatchId_idx" ON "guests"("eventId", "importBatchId");
