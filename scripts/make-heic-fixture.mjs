/**
 * Собирает настоящий HEIC (HEVC внутри контейнера HEIF) для тестов.
 *
 * sharp и libvips HEIC не пишут — патенты, — а тесты загрузки обязаны
 * проверять ровно тот формат, который шлют айфоны. Поэтому кадр кодирует
 * ffmpeg (libx265), а контейнер ISO BMFF собирается здесь вручную: ftyp,
 * meta (hdlr, pitm, iloc, iinf, iprp с hvcC/ispe/irot) и mdat.
 *
 *   node scripts/make-heic-fixture.mjs <кадр.hevc> <ширина> <высота> <поворот 0|90|180|270> <выход.heic>
 *
 * Кадр: ffmpeg -i src.png -frames:v 1 -c:v libx265 -pix_fmt yuv420p -f hevc frame.hevc
 */
import { readFileSync, writeFileSync } from "node:fs";

const [input, width, height, rotation, output] = process.argv.slice(2);
if (!output) {
  console.error("node scripts/make-heic-fixture.mjs <кадр.hevc> <ширина> <высота> <поворот> <выход.heic>");
  process.exit(1);
}

const u8 = (v) => Buffer.from([v]);
const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };
const str = (s) => Buffer.from(s, "latin1");
const box = (type, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([u32(body.length + 8), str(type), body]);
};
const fullBox = (type, version, flags, ...parts) =>
  box(type, u8(version), u8(flags >> 16), u8((flags >> 8) & 255), u8(flags & 255), ...parts);

/** NAL-блоки из потока Annex B (разделители 00 00 01 / 00 00 00 01). */
function nalUnits(stream) {
  const starts = [];
  for (let i = 0; i + 3 <= stream.length; i++) {
    if (stream[i] === 0 && stream[i + 1] === 0 && stream[i + 2] === 1) {
      starts.push(i + 3);
      i += 2;
    }
  }
  return starts.map((start, n) => {
    let end = n + 1 < starts.length ? starts[n + 1] - 3 : stream.length;
    while (end > start && stream[end - 1] === 0) end--;
    return stream.subarray(start, end);
  });
}

const nals = nalUnits(readFileSync(input));
const typeOf = (nal) => (nal[0] >> 1) & 0x3f;
const vps = nals.find((n) => typeOf(n) === 32);
const sps = nals.find((n) => typeOf(n) === 33);
const pps = nals.find((n) => typeOf(n) === 34);
const slices = nals.filter((n) => typeOf(n) < 32);
if (!vps || !sps || !pps || slices.length === 0) throw new Error("В потоке нет VPS/SPS/PPS или кадра");

// profile_tier_level из SPS: 2 байта заголовка NAL, 1 байт id/слоёв, затем
// 12 байт PTL. Байты-«предохранители» 00 00 03 убираем перед разбором.
const rbsp = [];
for (let i = 2; i < sps.length && rbsp.length < 16; i++) {
  if (i >= 4 && sps[i] === 3 && sps[i - 1] === 0 && sps[i - 2] === 0) continue;
  rbsp.push(sps[i]);
}
const ptl = Buffer.from(rbsp.slice(1, 13));

const array = (nal) => Buffer.concat([u8(0x80 | typeOf(nal)), u16(1), u16(nal.length), nal]);
const hvcC = box("hvcC",
  u8(1), ptl.subarray(0, 1), ptl.subarray(1, 5), ptl.subarray(5, 11), ptl.subarray(11, 12),
  u16(0xf000), u8(0xfc), u8(0xfd), u8(0xf8), u8(0xf8), u16(0), u8(0x0f),
  u8(3), array(vps), array(sps), array(pps),
);
const ispe = fullBox("ispe", 0, 0, u32(Number(width)), u32(Number(height)));
const angle = (Number(rotation) / 90) & 3;
const properties = [hvcC, ispe, ...(angle ? [box("irot", u8(angle))] : [])];
const ipco = box("ipco", ...properties);
const ipma = fullBox("ipma", 0, 0, u32(1), u16(1), u8(properties.length),
  ...properties.map((_, i) => u8((i === 0 ? 0x80 : 0) | (i + 1))));

const data = Buffer.concat(slices.flatMap((nal) => [u32(nal.length), nal]));
const ftyp = box("ftyp", str("heic"), u32(0), str("mif1"), str("heic"));

const meta = (offset) => fullBox("meta", 0, 0,
  fullBox("hdlr", 0, 0, u32(0), str("pict"), u32(0), u32(0), u32(0), u8(0)),
  fullBox("pitm", 0, 0, u16(1)),
  fullBox("iloc", 0, 0, u8(0x44), u8(0x00), u16(1), u16(1), u16(0), u16(1), u32(offset), u32(data.length)),
  fullBox("iinf", 0, 0, u16(1), fullBox("infe", 2, 0, u16(1), u16(0), str("hvc1"), u8(0))),
  box("iprp", ipco, ipma),
);

// Смещение данных известно, только когда известна длина meta, а она от
// смещения не зависит (поле фиксированной ширины) — считаем в два прохода.
const offset = ftyp.length + meta(0).length + 8;
writeFileSync(output, Buffer.concat([ftyp, meta(offset), box("mdat", data)]));
console.log(`${output}: ${width}×${height}, поворот ${rotation}°, ${data.length} байт кадра`);
