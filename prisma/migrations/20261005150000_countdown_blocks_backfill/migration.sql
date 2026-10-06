-- Таймер во всех приглашениях (docs/template-standard.md, §1 и §11).
--
-- У шаблонов, где таймера в образце не было (Эвергрин, Розарий, wedwed),
-- добавляем раздел после календаря или сразу за обложкой. В уже собранных
-- приглашениях он скрыт (§10, правило 4): пара включит его сама, а её
-- страница без спроса не меняется.
CREATE TEMP TABLE countdown_targets AS
SELECT e.id AS event_id,
       e."orgId" AS org_id,
       COALESCE(
         (SELECT min(b."order") FROM invite_blocks b WHERE b."eventId" = e.id AND b.type = 'CALENDAR'),
         (SELECT min(b."order") FROM invite_blocks b WHERE b."eventId" = e.id AND b.type = 'COVER'),
         -1
       ) + 1 AS pos
FROM events e
WHERE EXISTS (SELECT 1 FROM invite_blocks b WHERE b."eventId" = e.id)
  AND NOT EXISTS (SELECT 1 FROM invite_blocks b WHERE b."eventId" = e.id AND b.type = 'COUNTDOWN');

UPDATE invite_blocks b SET "order" = b."order" + 100000
FROM countdown_targets t WHERE b."eventId" = t.event_id AND b."order" >= t.pos;
UPDATE invite_blocks b SET "order" = b."order" - 99999
FROM countdown_targets t WHERE b."eventId" = t.event_id AND b."order" >= 100000;

INSERT INTO invite_blocks (id, "orgId", "eventId", type, "order", visible, content)
SELECT 'cd' || substr(md5(random()::text || t.event_id), 1, 23), t.org_id, t.event_id, 'COUNTDOWN', t.pos, false,
       '{"v":1,"title":"До свадьбы осталось","doneText":"Сегодня наш праздник!"}'::jsonb
FROM countdown_targets t;

DROP TABLE countdown_targets;
