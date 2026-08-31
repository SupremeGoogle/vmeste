/**
 * Ботаника для приглашения: пионы, эвкалипт, гипсофила.
 *
 * Рисуется геометрией, а не приходит картинкой, по трём причинам, и
 * первая из них не про вес:
 *
 * 1. **Цвет.** Нарисованный пион берёт цвета из темы мероприятия — в
 *    «Пудре» он кремовый, в «Изумруде» золотой на тёмном. Картинка,
 *    подобранная под один шаблон, во втором выглядит наклейкой.
 * 2. **Размер.** Одна и та же композиция стоит углом на телефоне в 320
 *    пикселей и на ноутбуке в 1400 — без второго файла и без мыла.
 * 3. **Вес.** Акварельный пион в PNG с прозрачностью — это 300–600 КБ на
 *    угол. Здесь вся композиция укладывается в пару килобайт разметки,
 *    которая приходит вместе со страницей и не требует второго запроса.
 *
 * Свои PNG при этом не запрещены: тема принимает загруженные картинки
 * (`decorTop`/`decorBottom`), и тогда рисованное отступает. Это нужно
 * тем, у кого есть лицензионная акварель от дизайнера, — заменить
 * нарисованное своим можно, не трогая код.
 *
 * Формы намеренно не ботанически точные. Задача — узнаваемость в углу
 * экрана на 120 пикселей, а не определитель растений: пион читается по
 * многослойным округлым лепесткам, эвкалипт — по парным овалам на дуге.
 */

export type BotanicalColors = {
  /** Лепестки — светлые, почти цвет бумаги. */
  petal: string;
  /** Тень лепестка: та же гамма, на тон глубже. */
  petalShade: string;
  /** Зелень. */
  leaf: string;
  /** Тонкие акценты: тычинки, ягоды, стебли. */
  accent: string;
};

const n = (value: number) => Math.round(value * 10) / 10;

/**
 * Пион: четыре слоя лепестков от внешнего к сердцевине.
 *
 * Лепесток — не эллипс, а капля с острым основанием у центра цветка:
 * первая версия рисовала кольца эллипсов, и на маленьком размере они
 * сливались в мишень. Форму держит тонкая обводка тоном темнее заливки —
 * без неё соседние лепестки одного цвета склеиваются в пятно.
 *
 * Слои повёрнуты на полшага друг относительно друга и слегка отличаются
 * размером — иначе цветок выглядит начерченным циркулем, а не выросшим.
 */
export function peony(cx: number, cy: number, r: number, c: BotanicalColors, seed = 0): string {
  const layers = [
    { count: 7, length: 1, width: 0.5, fill: c.petal, opacity: 1 },
    { count: 7, length: 0.72, width: 0.42, fill: c.petal, opacity: 0.97 },
    { count: 6, length: 0.48, width: 0.34, fill: c.petal, opacity: 0.94 },
    { count: 5, length: 0.28, width: 0.24, fill: c.petalShade, opacity: 0.75 },
  ];

  const petals = layers
    .map((layer, layerIndex) =>
      Array.from({ length: layer.count }, (_, index) => {
        // Разброс размера: детерминированный, чтобы разметка совпадала
        // на сервере и в браузере до символа.
        const jitter = 1 + (((index * 37 + layerIndex * 13 + seed * 7) % 11) - 5) / 60;
        const length = r * layer.length * jitter;
        const width = r * layer.width * jitter;
        const angle =
          ((index + (layerIndex % 2) * 0.5) / layer.count) * 360 + seed * 11 + layerIndex * 4;

        // Капля: от центра цветка наружу, с округлым концом.
        const d =
          `M0 0 C${n(-width)} ${n(-length * 0.34)} ${n(-width * 0.86)} ${n(-length * 0.86)} 0 ${n(-length)}` +
          ` C${n(width * 0.86)} ${n(-length * 0.86)} ${n(width)} ${n(-length * 0.34)} 0 0Z`;

        return `<path d="${d}" fill="${layer.fill}" opacity="${layer.opacity}" transform="translate(${n(cx)} ${n(cy)}) rotate(${n(angle)})"/>`;
      }).join(""),
    )
    .join("");

  // Сердцевина: тычинки точками по кругу.
  const heart = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2 + seed;
    const distance = r * 0.11;
    return `<circle cx="${n(cx + Math.cos(angle) * distance)}" cy="${n(cy + Math.sin(angle) * distance)}" r="${n(r * 0.045)}" fill="${c.accent}" opacity="0.7"/>`;
  }).join("");

  // Обводка лепестков задана на группе: повторять её на каждом из
  // двадцати пяти путей — это лишние полтора килобайта на цветок.
  return `<g stroke="${c.petalShade}" stroke-width="0.8">${petals}</g>` +
    `<g stroke="none"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.1)}" fill="${c.accent}" opacity="0.25"/>${heart}</g>`;
}

/**
 * Веточка эвкалипта: парные округлые листья вдоль дуги.
 *
 * Дуга задаётся тремя точками — начало, тяга, конец, — и по ней же
 * рисуется стебель. Листья мельчают к кончику: у настоящей ветки
 * молодые листья на конце всегда меньше. Их немного и они с зазором:
 * плотный ряд читается гусеницей, а не веткой.
 */
export function eucalyptus(
  from: [number, number],
  control: [number, number],
  to: [number, number],
  c: BotanicalColors,
  count = 7,
  size = 13,
): string {
  const at = (t: number): [number, number] => [
    (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * control[0] + t ** 2 * to[0],
    (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * control[1] + t ** 2 * to[1],
  ];

  const stem = `<path d="M${n(from[0])} ${n(from[1])} Q${n(control[0])} ${n(control[1])} ${n(to[0])} ${n(to[1])}" fill="none" stroke="${c.leaf}" stroke-width="1.2" opacity="0.7"/>`;

  const leaves = Array.from({ length: count }, (_, index) => {
    const t = (index + 0.7) / (count + 0.7);
    const [x, y] = at(t);
    // Касательная: листья растут поперёк ветки, а не вдоль неё.
    const [x2, y2] = at(Math.min(1, t + 0.06));
    const tangent = Math.atan2(y2 - y, x2 - x);
    const degrees = (tangent * 180) / Math.PI;

    const rx = size * (1 - t * 0.42);
    const ry = rx * 0.66;
    const shift = rx * 0.95;

    // Нормаль к ветке — на неё и сдвигаются листья пары.
    const nx = -Math.sin(tangent);
    const ny = Math.cos(tangent);

    return [1, -1]
      .map((side, pairIndex) => {
        const lx = x + nx * shift * side;
        const ly = y + ny * shift * side;
        return `<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="${n(rx)}" ry="${n(ry)}" opacity="${n(0.6 - t * 0.14 - pairIndex * 0.1)}" transform="rotate(${n(degrees + 24 * side)} ${n(lx)} ${n(ly)})"/>`;
      })
      .join("");
  }).join("");

  return `${stem}<g fill="${c.leaf}">${leaves}</g>`;
}

/** Гипсофила: мелкие белые точки на тонких стеблях — «дымка» между цветами. */
export function gypsophila(
  cx: number,
  cy: number,
  spread: number,
  c: BotanicalColors,
  count = 12,
  seed = 0,
): string {
  const dots = Array.from({ length: count }, (_, index) => {
    // Псевдослучайно, но одинаково на сервере и в браузере: разметка
    // обязана совпасть до пикселя, иначе React ругается на расхождение.
    const angle = (index * 2.399 + seed) % (Math.PI * 2);
    const distance = spread * (0.35 + ((index * 7919) % 100) / 155);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance * 0.8;
    const r = 2.2 + ((index * 31) % 7) / 4;

    return (
      `<path d="M${n(cx)} ${n(cy)} Q${n((cx + x) / 2)} ${n((cy + y) / 2 - 6)} ${n(x)} ${n(y)}"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${c.petal}" opacity="0.9" stroke="none"/>`
    );
  }).join("");

  // Стебли одной группой: тонкие линии одного цвета и прозрачности.
  return `<g fill="none" stroke="${c.leaf}" stroke-width="0.7" opacity="0.4">${dots}</g>`;
}

/**
 * Угловая композиция: два пиона, три ветки эвкалипта и дымка гипсофилы.
 *
 * Рисуется в квадрате 200×200 от левого верхнего угла; остальные три
 * угла получаются зеркальным преобразованием — так композиция гарантированно
 * согласована сама с собой, и её не надо рисовать четыре раза.
 */
export function floralCorner(c: BotanicalColors): string {
  return [
    // Зелень первой: цветы должны лежать поверх неё.
    eucalyptus([6, 84], [76, 44], [186, 26], c, 7, 13),
    eucalyptus([26, 4], [58, 82], [88, 186], c, 6, 11),
    eucalyptus([4, 34], [92, 104], [162, 128], c, 5, 9),
    gypsophila(138, 62, 40, c, 9, 1.2),
    gypsophila(52, 148, 32, c, 7, 2.7),
    // Цветы: один крупный в самом углу и два помельче рядом — так
    // композиция читается как букет, а не как ряд одинаковых кружков.
    peony(44, 42, 42, c, 0),
    peony(112, 100, 28, c, 3),
    peony(24, 112, 21, c, 6),
  ].join("");
}
