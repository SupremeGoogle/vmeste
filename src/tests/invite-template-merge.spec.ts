import { expect, it } from "vitest";
import { refreshBlocksFromTemplate } from "@/lib/invite-template-merge";
import { findTemplate } from "@/lib/invite-templates";

const prism = findTemplate("prism")!;
const prismCover = prism.blocks.find((b) => b.type === "COVER")!.content;

it("пустые фото и тексты-примеры получают пример выбранного шаблона", () => {
  const blocks = [
    { id: "c", type: "COVER" as const, content: { v: 1, names: "Имя и Имя", title: "тили ~ тили тесто", dateText: "", imageUrl: "", subtitle: "" } },
  ];
  const [change] = refreshBlocksFromTemplate(blocks, prism);
  expect(change.id).toBe("c");
  expect(change.content).toMatchObject({ title: prismCover.title, imageUrl: prismCover.imageUrl, names: prismCover.names });
});

it("своё организатора остаётся: имена, фото и тексты", () => {
  const own = "https://cdn.example.com/couple.jpg";
  const blocks = [
    { id: "c", type: "COVER" as const, content: { v: 1, names: "Аня и Миша", title: "Мы женимся этим летом!", subtitle: "Ждём вас в нашем саду", imageUrl: own } },
  ];
  const [change] = refreshBlocksFromTemplate(blocks, prism);
  // «Мы женимся» — значение по умолчанию (а «Мы женимся!» — образец «Хромового
  // вечера»), но дописанный заголовок — это уже своё.
  expect(change?.content ?? blocks[0].content).toMatchObject({ names: "Аня и Миша", title: "Мы женимся этим летом!", subtitle: "Ждём вас в нашем саду", imageUrl: own });
});

it("свой снимок в списке не разбавляется примерами", () => {
  const own = "https://cdn.example.com/kid.jpg";
  const blocks = [
    { id: "p", type: "PHOTOS" as const, content: { v: 1, title: "", items: [{ imageUrl: own, caption: "Это я" }] } },
  ];
  const changes = refreshBlocksFromTemplate(blocks, prism);
  const items = (changes[0]?.content ?? blocks[0].content) as { items: unknown[] };
  expect(items.items).toHaveLength(1);
  expect(items.items[0]).toMatchObject({ imageUrl: own, caption: "Это я" });
});

it("блок без пары в образце не меняется", () => {
  const blocks = [{ id: "m", type: "MAP" as const, content: { v: 1, title: "Как добраться", yandexUrl: "", googleUrl: "", note: "" } }];
  const withoutMap = { ...prism, blocks: prism.blocks.filter((b) => b.type !== "MAP") };
  expect(refreshBlocksFromTemplate(blocks, withoutMap)).toEqual([]);
});

it("у английской свадьбы пустые места получают английский образец, а русский образец считается примером", () => {
  const roseraie = findTemplate("roseraie")!;
  const enCover = roseraie.blocksEn!.find((b) => b.type === "COVER")!.content;
  const ruCover = roseraie.blocks.find((b) => b.type === "COVER")!.content;
  const blocks = [{ id: "c", type: "COVER" as const, content: { ...ruCover, imageUrl: "" } }];
  const [change] = refreshBlocksFromTemplate(blocks, roseraie, "en");
  expect(change.content).toMatchObject({ title: enCover.title, names: enCover.names, imageUrl: enCover.imageUrl });
});
