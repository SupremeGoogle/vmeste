/**
 * Словарь уменьшительных имён (data/diminutives.ru.yaml) — второй слой поиска.
 *
 * Зачем: триграммное сходство «настя» ↔ «анастасия» ≈ 0.23, что ниже рабочего
 * порога 0.3. Без словаря гость по имени «Настя» себя не найдёт, а это
 * половина гостей на входе.
 *
 * YAML читается вручную мини-парсером: формат плоский («ключ: [a, b]»),
 * тащить зависимость ради него нет смысла.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeName } from "@/lib/name-normalize";

export type DiminutiveMap = {
  /** полное имя → его формы: анастасия → [настя, ася, ...] */
  forms: Map<string, string[]>;
  /** форма → возможные полные имена: настя → [анастасия] */
  fullNames: Map<string, string[]>;
};

let cache: DiminutiveMap | null = null;

function parse(raw: string): DiminutiveMap {
  const forms = new Map<string, string[]>();
  const fullNames = new Map<string, string[]>();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const m = /^([^:]+):\s*\[(.*)\]\s*$/.exec(trimmed);
    if (!m) continue;

    const full = normalizeName(m[1]);
    const list = m[2]
      .split(",")
      .map((s) => normalizeName(s))
      .filter((s) => s.length > 1 && s !== full);
    if (!full || list.length === 0) continue;

    forms.set(full, Array.from(new Set(list)));
    for (const short of list) {
      const owners = fullNames.get(short) ?? [];
      if (!owners.includes(full)) owners.push(full);
      fullNames.set(short, owners);
    }
  }

  return { forms, fullNames };
}

export function loadDiminutives(): DiminutiveMap {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "diminutives.ru.yaml");
  cache = parse(readFileSync(file, "utf8"));
  return cache;
}

/**
 * Все написания, под которыми гостя стоит искать.
 * «Анастасия Петрова» → [настя петрова, ася петрова, ...]
 *
 * Разворачивается только первое слово (имя): фамилии уменьшительных не имеют,
 * а раскрывать каждое слово — значит породить мусор вида «петрова саша».
 */
export function expandGuestName(displayName: string): string[] {
  const { forms, fullNames } = loadDiminutives();
  const tokens = normalizeName(displayName).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const [first, ...rest] = tokens;
  const variants = new Set<string>();

  // полное имя → уменьшительные
  for (const short of forms.get(first) ?? []) variants.add([short, ...rest].join(" "));
  // уменьшительное в списке → полное имя (гостя записали как «Настя Петрова»)
  for (const full of fullNames.get(first) ?? []) variants.add([full, ...rest].join(" "));

  // отдельно голое имя и голая фамилия: гость часто вводит одно слово
  if (rest.length > 0) {
    variants.add(first);
    variants.add(rest.join(" "));
    for (const short of forms.get(first) ?? []) variants.add(short);
  }

  variants.delete(normalizeName(displayName));
  return Array.from(variants).filter((v) => v.length > 1);
}

/** Варианты того, что ввёл гость: «настя» → [настя, анастасия]. */
export function expandQuery(query: string): string[] {
  const { forms, fullNames } = loadDiminutives();
  const tokens = normalizeName(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const out = new Set<string>([tokens.join(" ")]);
  const [first, ...rest] = tokens;
  for (const full of fullNames.get(first) ?? []) out.add([full, ...rest].join(" "));
  for (const short of forms.get(first) ?? []) out.add([short, ...rest].join(" "));

  return Array.from(out);
}
