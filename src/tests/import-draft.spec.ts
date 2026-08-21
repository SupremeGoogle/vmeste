/**
 * Черновик импорта: предпросмотр перед записью (PLAN.md §5.9).
 *
 * Проверяется главное свойство — черновик принадлежит мероприятию,
 * и подсмотренный идентификатор ничего не открывает у соседей.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { peekImportDraft, saveImportDraft, takeImportDraft } from "@/server/services/import-draft";
import { parseGuestCsv } from "@/server/services/csv-import";
import type { EventContext } from "@/server/context";

const ctxA: EventContext = {
  kind: "org", userId: "u1", orgId: "org-a", role: "OWNER", eventId: "event-a",
};
const ctxB: EventContext = {
  kind: "org", userId: "u2", orgId: "org-b", role: "OWNER", eventId: "event-b",
};

const parsed = () =>
  parseGuestCsv(
    new TextEncoder().encode("Имя;Телефон\nАнна Петрова;+79990000000\nБорис Смирнов;\n")
      .buffer as ArrayBuffer,
  );

let draftId: string;

beforeEach(async () => {
  draftId = await saveImportDraft(ctxA, parsed());
});

describe("черновик импорта", () => {
  it("сохраняет разобранные строки для предпросмотра", () => {
    const draft = peekImportDraft(ctxA, draftId);
    expect(draft?.rows.map((row) => row.displayName)).toEqual(["Анна Петрова", "Борис Смирнов"]);
  });

  it("подсмотр не расходует черновик — страница перерисовывается", () => {
    expect(peekImportDraft(ctxA, draftId)).not.toBeNull();
    expect(peekImportDraft(ctxA, draftId)).not.toBeNull();
  });

  it("чужое мероприятие черновик не видит", () => {
    expect(peekImportDraft(ctxB, draftId)).toBeNull();
    expect(takeImportDraft(ctxB, draftId)).toBeNull();
    // И не расходует его заодно.
    expect(peekImportDraft(ctxA, draftId)).not.toBeNull();
  });

  it("импорт закрывает черновик — второй раз тот же файл не зальётся", () => {
    expect(takeImportDraft(ctxA, draftId)).not.toBeNull();
    expect(takeImportDraft(ctxA, draftId)).toBeNull();
  });

  it("несуществующий идентификатор ничего не возвращает", () => {
    expect(peekImportDraft(ctxA, "нет-такого")).toBeNull();
  });
});
