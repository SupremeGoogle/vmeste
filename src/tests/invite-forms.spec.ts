import { describe, expect, it } from "vitest";
import { blockContentFromForm } from "@/server/services/invite-forms";
import { TILI_TIMELINE_ICONS } from "@/lib/invite-templates/tili-assets";

function form(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("обычный редактор приглашения", () => {
  it("не стирает фотографию и карту расширенного блока места", () => {
    const result = blockContentFromForm("VENUE", form({
      title: "Новая площадка",
      name: "Усадьба",
      address: "Москва",
      note: "Вход со двора",
    }), {
      v: 1,
      tag: "Локация",
      title: "Старое место",
      name: "Старая площадка",
      address: "",
      note: "",
      imageUrl: "/media/invite-silk/venue.webp",
      mapUrl: "https://maps.example.com/place",
      mapLabel: "Открыть карту",
    });

    expect(result).toEqual({
      ok: true,
      content: {
        v: 1,
        tag: "Локация",
        title: "Новая площадка",
        name: "Усадьба",
        address: "Москва",
        note: "Вход со двора",
        imageUrl: "/media/invite-silk/venue.webp",
        mapUrl: "https://maps.example.com/place",
        mapLabel: "Открыть карту",
      },
    });
  });

  it("сохраняет иконки существующих пунктов тайминга", () => {
    const result = blockContentFromForm("TIMELINE", form({
      title: "Новая программа",
      items: "16:00 | Сбор гостей | На террасе\n18:00 | Ужин",
    }), {
      v: 1,
      tag: "Программа",
      title: "Программа дня",
      items: [
        { time: "", title: "", note: "", icon: TILI_TIMELINE_ICONS[0] },
        { time: "", title: "", note: "", icon: TILI_TIMELINE_ICONS[1] },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.content && "items" in result.content) {
      expect(result.content.items.map((item) => item.icon)).toEqual([
        TILI_TIMELINE_ICONS[0],
        TILI_TIMELINE_ICONS[1],
      ]);
    }
  });
});
