-- AlterTable
ALTER TABLE "events" ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- CreateIndex
CREATE INDEX "guest_aliases_alias_idx" ON "guest_aliases" USING GIN ("alias" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "guests_searchKey_idx" ON "guests" USING GIN ("searchKey" gin_trgm_ops);
