/**
 * Очевидные оскорбления и угрозы. Такое пожелание не публикуется само,
 * а уходит на решение организатору; остальные выходят на экран сразу.
 */
const BLOCKED = [
  /(?<!\p{L})(?:сука|суки|сучка|мразь|твар(?:ь|и)|ублюдок|мудак|мудаки|долбо[её]б|идиот(?:ы|ка)?|дурак(?:и|ов)?|тупиц[аы]?|дебил(?:ы|ка)?|урод(?:ы|ина)?)(?!\p{L})/u,
  /(?<!\p{L})(?:бля(?:д[ьи]|ть)?|пизд\p{L}*|ху[йеяию]\p{L}*|[её]б(?:ан|ат|л|ут|ись)\p{L}*)(?!\p{L})/u,
  /(?:чтоб|чтобы|пусть|желаю|хочу).{0,35}(?:сдох\p{L}*|умер\p{L}*|развод\p{L}*|разв(?:ед|ел|ест)\p{L}*|несчаст\p{L}*|свадьба сорв\p{L}*)/u,
  /(?<!\p{L})(?:сдохни(?:те)?|умри(?:те)?|проклят(?:ы|а|о)?|тупые|тупой|пошли\s+вы)(?!\p{L})/u,
  /горите\s+в\s+аду/u,
  /(?<!\p{L})ненавижу\s+(?:вас|тебя|их)(?!\p{L})/u,
];

const LATIN_LOOKALIKES: Record<string, string> = {
  a: "а", b: "в", c: "с", e: "е", h: "н", k: "к", m: "м", o: "о",
  p: "р", t: "т", x: "х", y: "у",
};

function normalize(value: string): string {
  const lower = value.normalize("NFKC").toLowerCase();
  return lower.replace(/[a-z]/g, (letter) => LATIN_LOOKALIKES[letter] ?? letter);
}

export function isBlockedWish(authorName: string, text: string): boolean {
  const content = normalize(`${authorName} ${text}`);
  return BLOCKED.some((pattern) => pattern.test(content));
}
