/**
 * Кто записан в одной ячейке.
 *
 * «Анна Петрова» — один человек, и тут всё решает код. Но списки пишут
 * по-человечески: «Иван и Мария Петровы с детьми», «Смирновы (4 чел)»,
 * «Олег + 1», «тётя Галя с мужем». Такие ячейки мы называем сложными:
 * при умном разборе их делит DeepSeek, без него — правила ниже.
 *
 * Что бы ни вернул ИИ, каждое имя сверяется с исходной ячейкой
 * (`verifySplit`): человек, которого в тексте нет, в список не попадёт.
 */
import { normalizeName } from "@/lib/name-normalize";

export type SplitResult = {
  people: string[];
  /** Упомянут безымянный спутник: «+1», «с мужем». */
  companionAllowed: boolean;
  companionName: string | null;
  partySize: number | null;
  childrenMentioned: boolean;
  /** Почему стоит проверить; null — уверены. */
  doubt: string | null;
  source: "simple" | "ai" | "rules";
};

const COMPANION_RE = /(?:^|\s)(?:\+\s*1|плюс\s*один|с\s+(?:мужем|женой|супругом|супругой|парой|девушкой|парнем|спутником|спутницей|другом|подругой|молодым\s+человеком|партн[её]ром|партн[её]ршей))(?=\s|$|[,.;)])/i;
const CHILDREN_RE = /(?:^|\s)(?:с\s+(?:детьми|ребенком|ребёнком|сыном|дочкой|дочерью|внуками)|дети|\+\s*дети|\+\s*реб)/i;
const SIZE_RE = /\(?\s*(\d{1,2})\s*(?:чел|человек|перс|шт)?\.?\s*\)?\s*$/i;

/** Простая ячейка: одно имя без союзов, скобок и приписок. */
export function isSimpleCell(text: string): boolean {
  const t = text.trim();
  if (/[,;/&+()\d]|\s(и|с|со|and)\s/i.test(t)) return false;
  if (/^(семья|семейство)\s/i.test(t)) return false;
  // Фамилия во множественном числе без имени: «Петровы», «Ивановы».
  if (/^[А-ЯЁ][а-яё]+(ов|ев|ин|ын)ы$/.test(t)) return false;
  return t.split(/\s+/).length <= 4;
}

const FEMALE_EXCEPTIONS = /^(никита|илья|кузьма|фома|савва|лука|миша|саша|женя|валера|витя|петя|вова|дима|паша|леша|лёша|сережа|серёжа|гоша|костя|толя|коля|слава|ваня|федя|гриша|жора|боря|юра|стёпа|степа)$/i;

function isFemaleName(first: string): boolean {
  const n = first.toLowerCase();
  return /[ая]$/.test(n) && !FEMALE_EXCEPTIONS.test(n);
}

/** «Петровы» → «Петров» или «Петрова» по имени. */
function surnameFor(plural: string, first: string): string {
  const base = plural.replace(/ы$/, "");
  if (!/(ов|ев|ин|ын)$/.test(base)) return plural;
  return isFemaleName(first) ? `${base}а` : base;
}

const titleCase = (text: string) =>
  text.replace(/(^|[\s-])([a-zа-яё])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** Деление сложной ячейки правилами — когда ИИ недоступен или его ответ не прошёл проверку. */
export function splitByRules(raw: string): SplitResult {
  let text = raw.replace(/\s+/g, " ").trim();
  if (isSimpleCell(text)) {
    return { people: [text], companionAllowed: false, companionName: null, partySize: null, childrenMentioned: false, doubt: null, source: "simple" };
  }

  const companionAllowed = COMPANION_RE.test(text);
  const childrenMentioned = CHILDREN_RE.test(text);
  let partySize: number | null = null;
  const size = SIZE_RE.exec(text);
  if (size && /\(|чел|перс/.test(size[0])) {
    partySize = Number(size[1]);
    text = text.slice(0, size.index).trim();
  }

  text = text
    .replace(COMPANION_RE, " ")
    .replace(CHILDREN_RE, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const family = /^(?:семья|семейство)\s+(.+)$/i.exec(text);
  if (family) {
    return { people: [`Семья ${family[1]}`], companionAllowed, companionName: null, partySize, childrenMentioned, doubt: "Семья без имён — уточните, кто придёт", source: "rules" };
  }
  if (/^[А-ЯЁ][а-яё]+(ов|ев|ин|ын)ы$/.test(text)) {
    return { people: [`Семья ${text}`], companionAllowed, companionName: null, partySize, childrenMentioned, doubt: "Семья без имён — уточните, кто придёт", source: "rules" };
  }

  const parts = text
    .split(/\s*(?:,|;|\/|&|\+|\sи\s|\sand\s)\s*/i)
    .map((p) => p.replace(/[()]/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 2 && /[A-Za-zА-Яа-яЁё]/.test(p));

  if (parts.length === 0) {
    return { people: [], companionAllowed, companionName: null, partySize, childrenMentioned, doubt: "Не нашли имени", source: "rules" };
  }

  // «Иван и Мария Петровы»: фамилия последнего относится ко всем однословным.
  const last = parts[parts.length - 1].split(" ");
  const sharedSurname = last.length === 2 && parts.slice(0, -1).every((p) => !p.includes(" ")) ? last[1] : null;
  const people = parts.map((part) => {
    if (!sharedSurname) return part;
    const first = part.split(" ")[0];
    return `${first} ${surnameFor(sharedSurname, first)}`;
  });

  return {
    people: people.map((p) => (p === p.toLowerCase() ? titleCase(p) : p)),
    companionAllowed,
    companionName: null,
    partySize,
    childrenMentioned,
    doubt: parts.length > 1 || partySize || childrenMentioned ? "Разделили автоматически — проверьте" : null,
    source: "rules",
  };
}

const SERVICE_WORDS = new Set(["семья", "семейство", "тетя", "тётя", "дядя", "бабушка", "дедушка", "мама", "папа", "брат", "сестра", "крестная", "крестный", "кума", "кум"]);

/**
 * Каждое слово имени (от трёх букв) должно найтись в исходной ячейке —
 * с поправкой на падеж: первые четыре буквы фамилии («Петровы» → «Петрова»).
 */
export function nameFoundInSource(name: string, source: string): boolean {
  const src = normalizeName(source);
  const srcWords = src.split(" ");
  const words = normalizeName(name).split(" ").filter((w) => w.length >= 3);
  if (words.length === 0) return false;
  return words.every((word) => {
    if (SERVICE_WORDS.has(word)) return true;
    const stem = word.slice(0, Math.min(word.length, word.length > 5 ? 4 : 3));
    return srcWords.some((w) => w.startsWith(stem) || (w.length >= 3 && word.startsWith(w)));
  });
}

/** Проверяем ответ ИИ по исходнику; не прошёл — вернём null, и ячейку поделят правила. */
export function verifySplit(source: string, split: Omit<SplitResult, "source">): SplitResult | null {
  const people = split.people.map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length >= 2 && p.length <= 120);
  if (people.length === 0 || people.length > 12) return null;
  if (!people.every((p) => nameFoundInSource(p, source))) return null;
  const companionName = split.companionName && nameFoundInSource(split.companionName, source) ? split.companionName : null;
  return {
    people,
    companionAllowed: split.companionAllowed || Boolean(companionName),
    companionName,
    partySize: split.partySize && split.partySize > 0 && split.partySize < 50 ? split.partySize : null,
    childrenMentioned: split.childrenMentioned,
    doubt: split.doubt?.slice(0, 140) || null,
    source: "ai",
  };
}
