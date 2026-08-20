-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'PLANNER', 'STAFF');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('COVER', 'TIMELINE', 'VENUE', 'DRESSCODE', 'MAP', 'TEXT', 'RSVP_FORM');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('ROUND', 'RECT', 'OVAL', 'HEAD');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'PLANNER',

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "venueName" TEXT,
    "venueAddr" TEXT,
    "venueLat" DOUBLE PRECISION,
    "venueLng" DOUBLE PRECISION,
    "rsvpDeadline" TIMESTAMP(3),
    "allowPlusOne" BOOLEAN NOT NULL DEFAULT true,
    "photoLimitPerGuest" INTEGER NOT NULL DEFAULT 5,
    "photosEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wishesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "raffleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "guestLinkSecret" TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    "seatingVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_blocks" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "order" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "invite_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_options" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "meal_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "linkToken" TEXT NOT NULL,
    "linkOpenedAt" TIMESTAMP(3),
    "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "rsvpAt" TIMESTAMP(3),
    "mealOptionId" TEXT,
    "allergies" TEXT,
    "plusOneAllowed" BOOLEAN NOT NULL DEFAULT false,
    "plusOneName" TEXT,
    "comment" TEXT,
    "parentGuestId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_aliases" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'auto',

    CONSTRAINT "guest_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_tables" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shape" "TableShape" NOT NULL DEFAULT 'ROUND',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "capacity" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "seat_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "guestId" TEXT,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishes" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Розыгрыш',
    "seed" TEXT,
    "drawnAt" TIMESTAMP(3),
    "winnerGuestId" TEXT,
    "winnerLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_entries" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "raffle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_tokens" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Проектор',
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_action_log" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "ipHash" TEXT,
    "ua" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_orgId_userId_key" ON "memberships"("orgId", "userId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "events_orgId_status_idx" ON "events"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "events_orgId_id_key" ON "events"("orgId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "events_orgId_slug_key" ON "events"("orgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "events_shortCode_key" ON "events"("shortCode");

-- CreateIndex
CREATE INDEX "invite_blocks_eventId_idx" ON "invite_blocks"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_blocks_eventId_order_key" ON "invite_blocks"("eventId", "order");

-- CreateIndex
CREATE INDEX "meal_options_eventId_idx" ON "meal_options"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_options_eventId_id_key" ON "meal_options"("eventId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "guests_linkToken_key" ON "guests"("linkToken");

-- CreateIndex
CREATE INDEX "guests_eventId_rsvpStatus_idx" ON "guests"("eventId", "rsvpStatus");

-- CreateIndex
CREATE INDEX "guests_eventId_searchKey_idx" ON "guests"("eventId", "searchKey");

-- CreateIndex
CREATE UNIQUE INDEX "guests_eventId_id_key" ON "guests"("eventId", "id");

-- CreateIndex
CREATE INDEX "guest_aliases_eventId_alias_idx" ON "guest_aliases"("eventId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "guest_aliases_guestId_alias_key" ON "guest_aliases"("guestId", "alias");

-- CreateIndex
CREATE INDEX "seat_tables_eventId_idx" ON "seat_tables"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "seat_tables_eventId_id_key" ON "seat_tables"("eventId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_tables_eventId_label_key" ON "seat_tables"("eventId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "seats_guestId_key" ON "seats"("guestId");

-- CreateIndex
CREATE INDEX "seats_eventId_idx" ON "seats"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "seats_tableId_index_key" ON "seats"("tableId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "seats_eventId_guestId_key" ON "seats"("eventId", "guestId");

-- CreateIndex
CREATE INDEX "photos_eventId_status_createdAt_idx" ON "photos"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "photos_eventId_guestId_idx" ON "photos"("eventId", "guestId");

-- CreateIndex
CREATE INDEX "wishes_eventId_status_createdAt_idx" ON "wishes"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "raffles_eventId_idx" ON "raffles"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "raffles_eventId_id_key" ON "raffles"("eventId", "id");

-- CreateIndex
CREATE INDEX "raffle_entries_eventId_idx" ON "raffle_entries"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_entries_raffleId_guestId_key" ON "raffle_entries"("raffleId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "screen_tokens_token_key" ON "screen_tokens"("token");

-- CreateIndex
CREATE INDEX "screen_tokens_eventId_idx" ON "screen_tokens"("eventId");

-- CreateIndex
CREATE INDEX "guest_action_log_eventId_createdAt_idx" ON "guest_action_log"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "guest_action_log_eventId_action_createdAt_idx" ON "guest_action_log"("eventId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_blocks" ADD CONSTRAINT "invite_blocks_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_options" ADD CONSTRAINT "meal_options_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_eventId_mealOptionId_fkey" FOREIGN KEY ("eventId", "mealOptionId") REFERENCES "meal_options"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_eventId_parentGuestId_fkey" FOREIGN KEY ("eventId", "parentGuestId") REFERENCES "guests"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_aliases" ADD CONSTRAINT "guest_aliases_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_tables" ADD CONSTRAINT "seat_tables_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_eventId_tableId_fkey" FOREIGN KEY ("eventId", "tableId") REFERENCES "seat_tables"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_eventId_raffleId_fkey" FOREIGN KEY ("eventId", "raffleId") REFERENCES "raffles"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_eventId_guestId_fkey" FOREIGN KEY ("eventId", "guestId") REFERENCES "guests"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_tokens" ADD CONSTRAINT "screen_tokens_orgId_eventId_fkey" FOREIGN KEY ("orgId", "eventId") REFERENCES "events"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
