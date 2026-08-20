/**
 * План зала в SVG. Серверный компонент — никакого клиентского JS.
 *
 * Координаты столов хранятся в условных единицах 1000×700, а не в пикселях
 * (PLAN.md §4.7): один и тот же план должен одинаково выглядеть на мониторе
 * организатора, на телефоне гостя и в PDF.
 */
export type PlanTable = {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  seats: { id: string; index: number; guest: { id: string; displayName: string } | null }[];
};

export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 700;

/** Короткое имя для подписи у места: «Анастасия Петрова» → «А. Петрова». */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0]}. ${parts[1]}`;
}

function seatPosition(table: PlanTable, index: number) {
  const count = Math.max(table.capacity, 1);

  if (table.shape === "ROUND" || table.shape === "OVAL") {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const rx = table.width / 2 + 26;
    const ry = table.height / 2 + 26;
    return { x: table.x + Math.cos(angle) * rx, y: table.y + Math.sin(angle) * ry };
  }

  // Прямоугольный стол и президиум: места по длинным сторонам.
  const perSide = Math.ceil(count / 2);
  const side = index < perSide ? -1 : 1;
  const pos = index % perSide;
  const step = table.width / (perSide + 1);
  return {
    x: table.x - table.width / 2 + step * (pos + 1),
    y: table.y + side * (table.height / 2 + 22),
  };
}

export function FloorPlan({
  tables,
  highlightGuestId,
}: {
  tables: PlanTable[];
  highlightGuestId?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}
      className="w-full rounded-xl border border-stone-200 bg-white"
      role="img"
      aria-label="План зала"
    >
      {tables.map((table) => {
        const isRound = table.shape === "ROUND" || table.shape === "OVAL";
        return (
          <g key={table.id}>
            {isRound ? (
              <ellipse
                cx={table.x} cy={table.y} rx={table.width / 2} ry={table.height / 2}
                fill="#f5f1ea" stroke="#d6cec2"
              />
            ) : (
              <rect
                x={table.x - table.width / 2} y={table.y - table.height / 2}
                width={table.width} height={table.height} rx={8}
                fill="#f5f1ea" stroke="#d6cec2"
              />
            )}

            <text
              x={table.x} y={table.y + 5}
              textAnchor="middle" fontSize={15} fontWeight={600} fill="#57504a"
            >
              {table.label}
            </text>

            {table.seats.map((seat) => {
              const { x, y } = seatPosition(table, seat.index);
              const taken = Boolean(seat.guest);
              const highlighted = seat.guest?.id === highlightGuestId;
              return (
                <g key={seat.id}>
                  <circle
                    cx={x} cy={y} r={9}
                    fill={highlighted ? "#8b6f47" : taken ? "#cfc4b2" : "#ffffff"}
                    stroke={highlighted ? "#6d5637" : "#d6cec2"}
                    strokeWidth={highlighted ? 2 : 1}
                  />
                  {seat.guest && (
                    <text
                      x={x} y={y + 22}
                      textAnchor="middle" fontSize={10}
                      fill={highlighted ? "#3a2f22" : "#7a7068"}
                      fontWeight={highlighted ? 700 : 400}
                    >
                      {shortName(seat.guest.displayName)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
