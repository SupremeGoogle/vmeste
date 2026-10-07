-- Черновик приглашения: гости видят снимок, сделанный при публикации или
-- «Сохранить изменения», а не живые правки редактора.
ALTER TABLE "events" ADD COLUMN "publishedInvite" JSONB;

-- Уже опубликованные приглашения: снимок = то, что гости видят сейчас.
UPDATE "events" e
   SET "publishedInvite" = jsonb_build_object(
     'theme', e."inviteTheme",
     'blocks', (
       SELECT coalesce(jsonb_agg(jsonb_build_object(
         'id', b.id, 'type', b.type, 'order', b."order", 'visible', b.visible, 'content', b.content
       ) ORDER BY b."order"), '[]'::jsonb)
       FROM "invite_blocks" b WHERE b."eventId" = e.id
     )
   )
 WHERE e.status = 'PUBLISHED';
