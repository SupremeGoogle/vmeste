/**
 * Точка на карте по адресу площадки — чтобы карта в приглашении стояла
 * на месте, даже если организатор не вставил свою ссылку.
 *
 * Встроенная Яндекс Карта умеет искать по тексту, но ищет плохо: по
 * «Усадьбе Гребнево» находит три места и показывает всю Россию. Поэтому
 * адрес переводим в координаты один раз, при сохранении, и кладём в
 * приглашение готовую ссылку с меткой.
 *
 * Геокодер — Яндекса, если задан YANDEX_GEOCODER_KEY, иначе бесплатный
 * Nominatim (OpenStreetMap). Любая ошибка — просто «не нашли»: без точки
 * приглашение всё равно сохраняется.
 */

/** Ссылки, которые поставили мы, а не организатор: их можно пересчитать. */
export const AUTO_MAP_MARK = "vmeste=auto";

export function isAutoMapUrl(url: string): boolean {
  return url.includes(AUTO_MAP_MARK);
}

export function yandexPointUrl(lat: number, lon: number): string {
  const point = `${lon.toFixed(6)}%2C${lat.toFixed(6)}`;
  return `https://yandex.ru/maps/?ll=${point}&z=16&pt=${point}%2Cpm2rdm&${AUTO_MAP_MARK}`;
}

type Point = { lat: number; lon: number };

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(`geocoder ${response.status}`);
  return response.json();
}

async function viaYandex(query: string, key: string): Promise<Point | null> {
  const data = (await fetchJson(
    `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(key)}&format=json&results=1&lang=ru_RU&geocode=${encodeURIComponent(query)}`,
  )) as { response?: { GeoObjectCollection?: { featureMember?: { GeoObject?: { Point?: { pos?: string } } }[] } } };
  const pos = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
  if (!pos) return null;
  const [lon, lat] = pos.split(" ").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

async function viaNominatim(query: string): Promise<Point | null> {
  const data = (await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&q=${encodeURIComponent(query)}`,
    // Правила Nominatim: без внятного User-Agent запросы отклоняют.
    { "user-agent": "vmeste-invitations/1.0 (venue map)" },
  )) as { lat?: string; lon?: string }[];
  const hit = data[0];
  if (!hit?.lat || !hit.lon) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon) };
}

/**
 * Ссылка на точку площадки или "" — если ничего не нашлось.
 *
 * Сначала полный адрес (он точнее), потом название вместе с адресом,
 * потом одно название: «Усадьба Гребнево» без адреса тоже находится.
 */
export async function geocodeVenue(name: string, address: string): Promise<string> {
  const queries = [address, [name, address].filter(Boolean).join(", "), name]
    .map((query) => query.trim())
    .filter((query, index, all) => query && all.indexOf(query) === index);
  const key = process.env.YANDEX_GEOCODER_KEY;
  for (const query of queries) {
    try {
      const point = key ? await viaYandex(query, key) : await viaNominatim(query);
      if (point) return yandexPointUrl(point.lat, point.lon);
    } catch {
      // Сеть или лимит геокодера — пробуем следующий вариант, потом сдаёмся.
    }
  }
  return "";
}

/**
 * Какую ссылку на карту сохранить: свою ссылку организатора не трогаем;
 * пустую или поставленную нами раньше — пересчитываем, когда поменялось
 * место (или когда точки ещё нет).
 */
export async function resolveVenueMapUrl(
  next: { mapUrl: string; name: string; address: string },
  previous?: { name: string; address: string },
): Promise<string> {
  const own = next.mapUrl.trim();
  if (own && !isAutoMapUrl(own)) return own;
  const moved = !previous || previous.name !== next.name || previous.address !== next.address;
  if (own && !moved) return own;
  if (!next.name.trim() && !next.address.trim()) return "";
  return (await geocodeVenue(next.name, next.address)) || (moved ? "" : own);
}
