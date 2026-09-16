import { COUPLE_TABLE } from "@/lib/couple-table-style";

/** Кольца стола молодожёнов — те же, что над названием стола на плане и в PDF. */
export function RingsIcon({ size = 18, color = COUPLE_TABLE.ringStroke }: { size?: number; color?: string }) {
  return (
    <svg viewBox="-13 -8 26 16" width={size} height={(size * 16) / 26} aria-hidden className="inline-block shrink-0">
      {COUPLE_TABLE.rings.map((ring, index) => (
        <circle
          key={index} cx={ring.cx} cy={0} r={ring.r - 1}
          fill="none" stroke={color} strokeWidth={1.8}
        />
      ))}
    </svg>
  );
}
