/**
 * Теги кеша.
 *
 * Тест выглядит формальным, но держит правило из PLAN.md §5.7: теги
 * строятся здесь и только здесь. Если кто-то напишет тег строкой в
 * компоненте, а потом поменяет формат в этом файле, сброс перестанет
 * попадать в цель — и это будет видно только жалобой «гость видит
 * вчерашнюю рассадку».
 */
import { describe, expect, it } from "vitest";
import { allEventTags, eventTag, inviteSlugTag, seatingTag } from "@/lib/cache-tags";

describe("теги кеша", () => {
  it("у каждого свой префикс — теги не пересекаются", () => {
    const tags = [eventTag("e1"), inviteSlugTag("e1"), seatingTag("e1")];
    expect(new Set(tags).size).toBe(3);
  });

  it("кнопка «сбросить кеш» накрывает все теги мероприятия", () => {
    const all = allEventTags("e1", "anya-misha");
    expect(all).toContain(eventTag("e1"));
    expect(all).toContain(inviteSlugTag("anya-misha"));
    expect(all).toContain(seatingTag("e1"));
  });

  it("тег приглашения строится по слагу: id на момент чтения неизвестен", () => {
    expect(inviteSlugTag("anya-misha")).toBe("invite:anya-misha");
  });
});
