/**
 * Выбор шаблона приглашения.
 *
 * Каждый шаблон показан не названием, а миниатюрой, собранной из его же
 * темы: тот же фон, тот же цвет листа, тот же шрифт заголовка и тот же
 * разделитель. Список названий («Пудра», «Изумруд», «Бумага») не говорит
 * ничего — выбирают глазами.
 *
 * Применение шаблона стирает нынешние блоки, и об этом написано прямо на
 * кнопке, а не мелким шрифтом внизу: человек, потерявший вечер работы,
 * второй раз в конструктор не вернётся.
 */
import { INVITE_TEMPLATES } from "@/lib/invite-templates";
import { FONT_STACKS } from "@/lib/invite-theme";

export function TemplatePicker({
  action, currentId, slug, hasBlocks,
}: {
  action: (formData: FormData) => Promise<void>;
  currentId: string;
  slug: string;
  hasBlocks: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {INVITE_TEMPLATES.map((template) => {
        const theme = template.theme;
        const current = template.id === currentId;

        return (
          <form key={template.id} action={action} className="flex flex-col">
            <input type="hidden" name="template" value={template.id} />
            <input type="hidden" name="slug" value={slug} />

            <div
              className={`overflow-hidden rounded-xl border-2 transition-colors ${
                current ? "border-stone-900" : "border-stone-200"
              }`}
            >
              {/* Миниатюра: не картинка, а тот же приём, что и в самом
                  приглашении, — иначе она разъедется с шаблоном при первой
                  же правке темы. */}
              <div className="space-y-1.5 p-3" style={{ background: theme.bg }}>
                <div
                  className="px-4 py-4 text-center"
                  style={{
                    background: theme.card,
                    color: theme.ink,
                    borderRadius: theme.corner === "sharp" ? 0 : theme.corner === "round" ? 14 : 6,
                    border: theme.frame ? `1px solid ${theme.line}` : "none",
                  }}
                >
                  <p
                    style={{
                      fontFamily: FONT_STACKS[theme.headingFont],
                      fontSize: 15,
                      letterSpacing: theme.capsHeadings ? "0.14em" : "0.01em",
                      textTransform: theme.capsHeadings ? "uppercase" : "none",
                      margin: 0,
                    }}
                  >
                    Аня и Миша
                  </p>

                  {/* Дата — одна из самых заметных осей: строкой она
                      подпись, крупными цифрами — почти вывеска. */}
                  {theme.dateStyle === "display" ? (
                    <p
                      style={{
                        fontFamily: FONT_STACKS[theme.headingFont],
                        fontStyle: "italic",
                        fontSize: 22,
                        margin: "8px 0 0",
                        letterSpacing: "0.04em",
                      }}
                    >
                      15 / 08 / 26
                    </p>
                  ) : (
                    <>
                      <span
                        style={{ display: "block", width: 26, height: 1, background: theme.line, margin: "9px auto" }}
                      />
                      <p style={{ fontFamily: FONT_STACKS[theme.bodyFont], fontSize: 10, color: theme.muted, margin: 0 }}>
                        15 августа 2026
                      </p>
                    </>
                  )}
                </div>

                {/* Второй блок показывает, разделы идут карточками или
                    сплошным полотном, и как выглядит расписание. */}
                <div
                  className="px-4 py-3 text-center"
                  style={{
                    background: theme.sections === "card" ? theme.card : "transparent",
                    color: theme.ink,
                    borderRadius: theme.corner === "sharp" ? 0 : theme.corner === "round" ? 14 : 6,
                  }}
                >
                  {theme.timeline === "stack" ? (
                    <>
                      <p style={{ fontFamily: FONT_STACKS[theme.headingFont], fontStyle: "italic", fontSize: 12, color: theme.accent, margin: 0 }}>
                        16:00
                      </p>
                      <p style={{ fontFamily: FONT_STACKS[theme.bodyFont], fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", margin: "3px 0 0", color: theme.ink }}>
                        Церемония
                      </p>
                    </>
                  ) : (
                    <p style={{ fontFamily: FONT_STACKS[theme.bodyFont], fontSize: 10, color: theme.muted, margin: 0 }}>
                      16:00 · Церемония
                    </p>
                  )}

                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      padding: "4px 12px",
                      fontSize: 9,
                      color: theme.card,
                      background: theme.accent,
                      borderRadius: theme.corner === "sharp" ? 0 : 999,
                      fontFamily: FONT_STACKS[theme.bodyFont],
                    }}
                  >
                    Ответить
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-stone-900">
              {template.name}
              {current && <span className="ml-2 text-xs text-stone-500">— выбран</span>}
            </p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-stone-600">{template.mood}</p>

            <button
              type="submit"
              className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:border-stone-500"
            >
              {hasBlocks ? "Применить — блоки заменятся" : "Применить"}
            </button>
          </form>
        );
      })}
    </div>
  );
}
