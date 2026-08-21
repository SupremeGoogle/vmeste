/**
 * Адрес приглашения из названия.
 *
 * Транслитерация нужна, потому что название всегда русское («Аня и Миша»),
 * а ссылку гость получает в смс и иногда набирает руками. Кириллица в URL
 * выживает, но в переписке превращается в `%D0%B0%D0%BD%D1%8F` — и на этом
 * доверие к ссылке заканчивается.
 */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
  const transliterated = input
    .toLowerCase()
    .split("")
    .map((char) => MAP[char] ?? char)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
