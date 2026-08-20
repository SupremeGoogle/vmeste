-- AlterTable
ALTER TABLE "events" ALTER COLUMN "guestLinkSecret" SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "previewOk" BOOLEAN NOT NULL DEFAULT true;
