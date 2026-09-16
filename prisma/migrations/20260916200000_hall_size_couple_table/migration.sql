-- Размер зала, который организатор растягивает мышью, и стол молодожёнов.

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "hallHeight" DOUBLE PRECISION NOT NULL DEFAULT 700,
ADD COLUMN     "hallWidth" DOUBLE PRECISION NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "seat_tables" ADD COLUMN     "isCouple" BOOLEAN NOT NULL DEFAULT false;

-- Стол молодожёнов один на мероприятие. Частичный индекс Prisma описать
-- не умеет, поэтому он живёт только здесь: вторую вкладку, создающую
-- такой же стол одновременно, остановит база, а не проверка в коде.
CREATE UNIQUE INDEX "seat_tables_one_couple_per_event" ON "seat_tables"("eventId") WHERE "isCouple";
