-- Раздел «Виш-лист» у всех уже собранных приглашений.
--
-- Раньше виш-лист приклеивался к низу любого приглашения отдельной
-- вставкой; теперь это обычный раздел шаблона. Ставим его перед анкетой
-- (или в конец, если анкеты нет) и показываем, только если виш-лист был
-- включён: выключенный остаётся скрытым разделом, его можно вернуть.
CREATE TEMP TABLE wishlist_targets AS
SELECT e.id AS event_id,
       e."orgId" AS org_id,
       e."giftsEnabled" AS enabled,
       COALESCE(
         (SELECT min(b."order") FROM invite_blocks b WHERE b."eventId" = e.id AND b.type = 'RSVP_FORM'),
         (SELECT max(b."order") + 1 FROM invite_blocks b WHERE b."eventId" = e.id)
       ) AS pos
FROM events e
WHERE EXISTS (SELECT 1 FROM invite_blocks b WHERE b."eventId" = e.id)
  AND NOT EXISTS (SELECT 1 FROM invite_blocks b WHERE b."eventId" = e.id AND b.type = 'WISHLIST');

-- Сдвиг в два шага: уникальный индекс (eventId, order) проверяется на
-- каждой строке, и прямое «order + 1» столкнулось бы с соседом.
UPDATE invite_blocks b SET "order" = b."order" + 100000
FROM wishlist_targets t WHERE b."eventId" = t.event_id AND b."order" >= t.pos;
UPDATE invite_blocks b SET "order" = b."order" - 99999
FROM wishlist_targets t WHERE b."eventId" = t.event_id AND b."order" >= 100000;

INSERT INTO invite_blocks (id, "orgId", "eventId", type, "order", visible, content)
SELECT 'wl' || substr(md5(random()::text || t.event_id), 1, 23), t.org_id, t.event_id, 'WISHLIST', t.pos, t.enabled,
       '{"v":1,"tag":"Подарки","title":"Наш виш-лист","text":"Если захотите порадовать нас подарком — вот что нам пригодится. Отметьте подарок, чтобы его не выбрал кто-то ещё.","buttonLabel":"Я подарю это","envelopeTitle":""}'::jsonb
FROM wishlist_targets t;

DROP TABLE wishlist_targets;
