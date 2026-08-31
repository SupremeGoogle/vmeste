/**
 * План зала в SVG — просмотр и печать. Серверный компонент, клиентского JS нет.
 * Редактор с перетаскиванием живёт отдельно (components/seating/editor.tsx),
 * но геометрию оба берут из одного модуля.
 */
import {
  PLAN_HEIGHT, PLAN_WIDTH, isRound, MARK_LABEL_SHIFT, labelPosition, seatPosition, shortName,
} from "@/lib/seating-geometry";
import { MARK_RADIUS, markFor } from "@/lib/couple-marks";
import type { GuestRole } from "@/generated/prisma/enums";

/**
 * Значок молодожёнов у места. Фигуры описаны в `lib/couple-marks.ts`,
 * чтобы план в панели, план для гостя и PDF рисовали их одинаково.
 */
function CoupleMark({ role, x, y }: { role: GuestRole; x: number; y: number }) {
  const mark = markFor(role);
  if (!mark) return null;

  return (
    <g transform={`translate(${x} ${y})`} aria-label={mark.label}>
      <circle r={MARK_RADIUS} fill="#8b6f47" stroke="#fffdf9" strokeWidth={1.5} />
      {mark.shapes.map((shape, index) => {
        const fill = shape.tone === "hole" ? "#8b6f47" : "#fffdf9";
        const opacity = shape.tone === "veil" ? 0.45 : 1;

        if (shape.kind === "circle") {
          return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} opacity={opacity} />;
        }
        if (shape.kind === "polygon") {
          return <polygon key={index} points={shape.points} fill={fill} opacity={opacity} />;
        }
        return <path key={index} d={shape.d} fill={fill} opacity={opacity} />;
      })}
    </g>
  );
}

export type PlanTable = {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  seats: {
    id: string;
    index: number;
    guest: { id: string; displayName: string; role?: GuestRole } | null;
  }[];
};

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
        const round = isRound(table.shape);
        return (
          <g key={table.id}>
            {round ? (
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
              const role = seat.guest?.role ?? "GUEST";
              const label = labelPosition(
                table,
                { x, y },
                role === "GUEST" ? 0 : MARK_LABEL_SHIFT,
              );
              const taken = Boolean(seat.guest);
              const highlighted = seat.guest?.id === highlightGuestId;
              return (
                <g key={seat.id}>
                  {role === "GUEST" ? (
                    <circle
                      cx={x} cy={y} r={9}
                      fill={highlighted ? "#8b6f47" : taken ? "#cfc4b2" : "#ffffff"}
                      stroke={highlighted ? "#6d5637" : "#d6cec2"}
                      strokeWidth={highlighted ? 2 : 1}
                    />
                  ) : (
                    // Место молодожёнов рисуется значком вместо кружка:
                    // «где сидят молодые» — второй вопрос гостя после
                    // «где сижу я», и искать его глазами не должно быть нужно.
                    <CoupleMark role={role} x={x} y={y} />
                  )}
                  {seat.guest && (
                    <text
                      x={label.x} y={label.y}
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
