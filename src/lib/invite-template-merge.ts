/**
 * Смена шаблона у заполненного приглашения.
 *
 * Блоки при смене дизайна не пересоздаются: в них тексты и фотографии
 * организатора. Но если блок так и остался с примером из прежнего шаблона
 * (пустые фото, «Имя и Имя», «Название площадки»), новый дизайн выглядит
 * пустым и непохожим на образец, который человек только что выбрал. Здесь
 * такие места заполняются примером нового шаблона, а всё, что организатор
 * вписал или загрузил сам, остаётся как было.
 *
 * «Своё» отличается от «примера» просто: пример — это значение, которое
 * встречается в образце какого-нибудь шаблона для блока того же типа, или
 * значение по умолчанию. Сравнение не привязано к прежнему шаблону, потому
 * что старые приглашения могли сменить дизайн, не обновив тексты.
 */
import type { BlockType } from "@/generated/prisma/enums";
import { defaultContent, parseBlockContent, type AnyBlockContent } from "@/lib/invite-blocks";
import { INVITE_TEMPLATES, type InviteTemplate } from "@/lib/invite-templates";
import { REMOVED_TEMPLATE_SAMPLES } from "@/lib/invite-templates/removed-samples";

type Json = unknown;
type Samples = Map<BlockType, Set<string>>;

let cached: Samples | null = null;

/** Все строки-примеры по типу блока: из всех образцов и из значений по умолчанию. */
function sampleStrings(): Samples {
  if (cached) return cached;
  const map: Samples = new Map();
  const collect = (type: BlockType, value: Json) => {
    if (typeof value === "string") {
      if (value.trim()) {
        if (!map.has(type)) map.set(type, new Set());
        map.get(type)!.add(value.trim());
      }
    } else if (Array.isArray(value)) value.forEach((v) => collect(type, v));
    else if (value && typeof value === "object") Object.values(value).forEach((v) => collect(type, v));
  };
  for (const template of INVITE_TEMPLATES) {
    for (const block of template.blocks) {
      collect(block.type, block.content);
      collect(block.type, defaultContent(block.type));
    }
  }
  // Образцы удалённых шаблонов — у старых приглашений они ещё стоят в разделах.
  for (const [type, values] of Object.entries(REMOVED_TEMPLATE_SAMPLES)) collect(type as BlockType, values);
  cached = map;
  return map;
}

function isPlaceholder(type: BlockType, value: Json, samples: Samples): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return !value.trim() || (samples.get(type)?.has(value.trim()) ?? false);
  if (Array.isArray(value)) return value.every((v) => isPlaceholder(type, v, samples));
  if (typeof value === "object") {
    // Настройки кадра относятся к самой фотографии, а не к тексту: судим по ней.
    return Object.entries(value as Record<string, Json>).every(([key, v]) => key === "photoSettings" || key === "v" || typeof v === "number" || typeof v === "boolean" || isPlaceholder(type, v, samples));
  }
  // Числа и флаги сами по себе ничего не говорят о том, заполнен ли блок.
  return true;
}

function merge(type: BlockType, current: Json, sample: Json, samples: Samples): Json {
  if (sample === undefined) return current;
  if (isPlaceholder(type, current, samples) && !(typeof current === "number" || typeof current === "boolean")) return sample;
  if (Array.isArray(current) && Array.isArray(sample)) {
    // Есть хоть одно своё значение — длину списка не трогаем: свои снимки
    // не разбавляются чужими примерами.
    return current.map((item, index) => merge(type, item, sample[index], samples));
  }
  if (current && sample && typeof current === "object" && typeof sample === "object" && !Array.isArray(current)) {
    const cur = current as Record<string, Json>;
    const smp = sample as Record<string, Json>;
    const out: Record<string, Json> = { ...cur };
    for (const key of Object.keys(smp)) {
      if (key === "photoSettings" || key === "v") continue;
      out[key] = key in cur ? merge(type, cur[key], smp[key], samples) : smp[key];
    }
    // Кадрирование прежней фотографии к примеру нового шаблона не подходит.
    if ("imageUrl" in out && out.imageUrl !== cur.imageUrl) {
      if (smp.photoSettings !== undefined) out.photoSettings = smp.photoSettings;
      else delete out.photoSettings;
    }
    return out;
  }
  return current;
}

/**
 * Новое содержимое блоков при смене шаблона. Блок сопоставляется с блоком
 * того же типа в образце по порядку появления (первый «Фото» — с первым и
 * т. д.). Возвращает только те блоки, содержимое которых изменилось.
 */
export function refreshBlocksFromTemplate<T extends { id: string; type: BlockType; content: Json }>(
  blocks: T[],
  template: InviteTemplate,
): { id: string; content: AnyBlockContent }[] {
  const samples = sampleStrings();
  const seen = new Map<BlockType, number>();
  const changes: { id: string; content: AnyBlockContent }[] = [];
  for (const block of blocks) {
    const nth = seen.get(block.type) ?? 0;
    seen.set(block.type, nth + 1);
    const sample = template.blocks.filter((b) => b.type === block.type)[nth];
    if (!sample) continue;
    const merged = merge(block.type, block.content ?? {}, sample.content, samples);
    if (JSON.stringify(merged) === JSON.stringify(block.content)) continue;
    const parsed = parseBlockContent(block.type, merged);
    if (parsed.ok) changes.push({ id: block.id, content: parsed.content });
  }
  return changes;
}
