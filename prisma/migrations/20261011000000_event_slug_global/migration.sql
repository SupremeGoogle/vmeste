-- Адрес /i/{slug} общий на весь сайт: уникальность внутри организации
-- пускала две свадьбы с одним адресом. Совпадения, если они есть, получают
-- хвост из id — старшая по созданию свадьба сохраняет адрес.
UPDATE "events" e
SET "slug" = e."slug" || '-' || right(e."id", 6)
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS n
  FROM "events"
) d
WHERE d."id" = e."id" AND d.n > 1;

DROP INDEX "events_orgId_slug_key";
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
