-- Новые типы блоков приглашения: галерея фотографий (полароиды) и
-- календарь месяца с большой датой — под шаблон, скопированный со
-- присланного образца.
ALTER TYPE "BlockType" ADD VALUE 'PHOTOS';
ALTER TYPE "BlockType" ADD VALUE 'CALENDAR';
