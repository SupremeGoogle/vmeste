-- Бар: напитки мероприятия и выбор гостей (можно несколько).

-- CreateTable
CREATE TABLE "drink_options" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "drink_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_drinks" (
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "drinkOptionId" TEXT NOT NULL,

    CONSTRAINT "guest_drinks_pkey" PRIMARY KEY ("guestId","drinkOptionId")
);

-- CreateIndex
CREATE INDEX "drink_options_eventId_idx" ON "drink_options"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "drink_options_eventId_id_key" ON "drink_options"("eventId", "id");

-- CreateIndex
CREATE INDEX "guest_drinks_eventId_drinkOptionId_idx" ON "guest_drinks"("eventId", "drinkOptionId");

-- AddForeignKey
ALTER TABLE "drink_options" ADD CONSTRAINT "drink_options_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_drinks" ADD CONSTRAINT "guest_drinks_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_drinks" ADD CONSTRAINT "guest_drinks_eventId_drinkOptionId_fkey" FOREIGN KEY ("eventId", "drinkOptionId") REFERENCES "drink_options"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
