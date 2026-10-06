/**
 * PDF плана рассадки — план Б на день свадьбы.
 *
 * Смысл документа: если сервис недоступен, координатор работает по бумаге.
 * Поэтому в PDF три раздела, и каждый самодостаточен:
 *   1. схема зала — куда идти;
 *   2. список по столам — кто где сидит;
 *   3. алфавитный указатель — «как меня зовут → мой стол», это то,
 *      чем координатор пользуется в дверях.
 *
 * Почему @react-pdf/renderer, а не headless Chrome: план зала — это
 * прямоугольники, круги и подписи, для них хватает примитивов, а puppeteer
 * тащит в образ 400 МБ браузера (PLAN.md §4.6).
 *
 * Шрифт регистрируется явно. Без этого кириллица превращается в пустые
 * прямоугольники — стандартные шрифты PDF её не содержат.
 */
import React from "react";
import path from "node:path";
import {
  DEFAULT_HALL, isRound, MARK_LABEL_SHIFT, fitSeatLabels, labelLines, placeSeatLabel, seatPosition, svgLineOffsets, type Hall,
} from "@/lib/seating-geometry";
import { COUPLE_TABLE } from "@/lib/couple-table-style";
import { COLORS } from "@/server/guest-html/theme";
import {
  Document, Font, G, Page, Path, Polygon, StyleSheet, Svg, Circle, Ellipse, Rect,
  Text as SvgText, Text, View,
} from "@react-pdf/renderer";
import { MARK_RADIUS, ROLE_LABEL, markFor } from "@/lib/couple-marks";
import type { GuestRole } from "@/generated/prisma/enums";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(FONT_DIR, "Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Roboto-Bold.ttf"), fontWeight: 700 },
  ],
});

// Переносы слов react-pdf делает по своему словарю, для русского он лишний:
// имена не переносятся, а рвутся в неожиданных местах.
Font.registerHyphenationCallback((word) => [word]);

export type PdfTable = {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  isCouple?: boolean;
  seats: {
    id: string;
    index: number;
    guest: { id: string; displayName: string; role?: GuestRole } | null;
  }[];
};

export type PdfInput = {
  eventTitle: string;
  eventDate: Date;
  venueName: string | null;
  tables: PdfTable[];
  /** Размер зала; без него — прежние 1000×700. */
  hall?: Hall;
  generatedAt: Date;
};

/**
 * Цвета берутся из общей палитры (`guest-html/theme.ts`), чтобы распечатка
 * и экран были одной свадьбой. Шрифт — намеренно гротеск: PDF это рабочий
 * документ координатора, его читают в полутьме и по диагонали, а тащить
 * ради стиля ещё один шрифтовой файл с кириллицей незачем.
 */
const styles = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 10, padding: 32, color: COLORS.ink },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 2, color: COLORS.ink },
  meta: { fontSize: 9, color: COLORS.muted, marginBottom: 16 },
  h2: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: COLORS.accentDeep },

  tablesGrid: { flexDirection: "row", flexWrap: "wrap" },
  tableCard: {
    width: "33.33%", paddingRight: 12, marginBottom: 14,
  },
  tableName: { fontSize: 11, fontWeight: 700, marginBottom: 3 },
  seatRow: { flexDirection: "row", marginBottom: 1.5 },
  seatNum: { width: 14, color: "#a09488" },
  seatName: { flex: 1 },
  empty: { color: "#a09488" },

  indexGrid: { flexDirection: "row" },
  indexColumn: { width: "50%", paddingRight: 16 },
  indexRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 2.5,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.line, paddingBottom: 1.5,
  },
  indexTable: { color: COLORS.accentDeep, fontWeight: 700 },

  legend: { fontSize: 9, color: COLORS.muted, marginTop: 6 },

  footer: {
    position: "absolute", bottom: 18, left: 32, right: 32,
    fontSize: 8, color: "#a09488",
    flexDirection: "row", justifyContent: "space-between",
  },
});

/**
 * Значок молодожёнов в PDF — те же фигуры, что на экране
 * (`lib/couple-marks.ts`). Распечатку кладут на стол у входа, и «где
 * сидят молодые» там спрашивают ровно так же, как в зале.
 */
function CoupleMark({ role, x, y }: { role: GuestRole; x: number; y: number }) {
  const mark = markFor(role);
  if (!mark) return null;

  return (
    <G transform={`translate(${x} ${y})`}>
      <Circle cx={0} cy={0} r={MARK_RADIUS} fill={COLORS.accent} stroke="#ffffff" strokeWidth={1.5} />
      {mark.shapes.map((shape, index) => {
        // На бумаге полупрозрачность печатается непредсказуемо, поэтому
        // фата — не прозрачная, а заранее осветлённая заливка.
        const fill = shape.tone === "hole" ? COLORS.accent : shape.tone === "veil" ? "#e8dcc9" : "#ffffff";

        if (shape.kind === "circle") {
          return <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} />;
        }
        if (shape.kind === "polygon") {
          return <Polygon key={index} points={shape.points} fill={fill} />;
        }
        return <Path key={index} d={shape.d} fill={fill} />;
      })}
    </G>
  );
}

/**
 * Типы @react-pdf не описывают fontFamily/fontSize у Text внутри Svg, хотя
 * рантайм их учитывает. Без явного шрифта текст на плане падает в Helvetica,
 * где кириллицы нет, и «Стол 1» превращается в «!B>; 1» — это видно только
 * на выгруженном PDF, компилятор молчит. Каст в одном месте вместо
 * подавления ошибки в каждой подписи.
 */
const PlanText = SvgText as unknown as React.ComponentType<
  React.PropsWithChildren<{
    x: number;
    y: number;
    textAnchor?: "start" | "middle" | "end";
    fill?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
  }>
>;

function FloorPlanPdf({ tables, hall }: { tables: PdfTable[]; hall: Hall }) {
  return (
    <Svg viewBox={`0 0 ${hall.width} ${hall.height}`} style={{ width: "100%", height: 440 }}>
      {tables.map((table) => {
        const round = isRound(table.shape);
        const inset = COUPLE_TABLE.innerInset;
        return (
          <React.Fragment key={table.id}>
            {table.isCouple ? (
              <>
                <Rect
                  x={table.x - table.width / 2} y={table.y - table.height / 2}
                  width={table.width} height={table.height} rx={14}
                  fill={COUPLE_TABLE.fill} stroke={COUPLE_TABLE.stroke} strokeWidth={3}
                />
                <Rect
                  x={table.x - table.width / 2 + inset} y={table.y - table.height / 2 + inset}
                  width={table.width - inset * 2} height={table.height - inset * 2} rx={9}
                  fill="none" stroke={COUPLE_TABLE.innerStroke} strokeWidth={1.5}
                />
                {COUPLE_TABLE.rings.map((ring, index) => (
                  <Circle
                    key={index} cx={table.x + ring.cx} cy={table.y + ring.cy} r={ring.r}
                    fill="none" stroke={COUPLE_TABLE.ringStroke} strokeWidth={2}
                  />
                ))}
              </>
            ) : round ? (
              <Ellipse
                cx={table.x} cy={table.y} rx={table.width / 2} ry={table.height / 2}
                fill="#f5f1ea" stroke="#c9bfb0" strokeWidth={2}
              />
            ) : (
              <Rect
                x={table.x - table.width / 2} y={table.y - table.height / 2}
                width={table.width} height={table.height}
                fill="#f5f1ea" stroke="#c9bfb0" strokeWidth={2}
              />
            )}
            <PlanText
              x={table.x}
              y={table.isCouple ? table.y + COUPLE_TABLE.labelOffset : table.y + 6}
              textAnchor="middle"
              fontFamily="Roboto" fontWeight={700} fontSize={20}
              fill={table.isCouple ? COUPLE_TABLE.text : "#3a332c"}
            >
              {table.label}
            </PlanText>
            {table.seats.map((seat) => {
              const { x, y } = seatPosition(table, seat.index);
              const role = seat.guest?.role ?? "GUEST";
              const fit = fitSeatLabels(table, table.seats.flatMap((s) => (s.guest ? [s.guest.displayName] : [])), { base: 13, min: 8 });
              const label = placeSeatLabel(table, seat.index, fit, 15 + (role === "GUEST" ? 0 : MARK_LABEL_SHIFT));
              return (
                <React.Fragment key={seat.id}>
                  {role === "GUEST" ? (
                    <Circle
                      cx={x} cy={y} r={11}
                      fill={seat.guest ? "#cfc4b2" : "#ffffff"}
                      stroke="#c9bfb0" strokeWidth={1.5}
                    />
                  ) : (
                    <CoupleMark role={role} x={x} y={y} />
                  )}
                  {seat.guest && (() => {
                    const lines = labelLines(seat.guest.displayName, fit);
                    const dys = svgLineOffsets(lines.length, fit.fontSize, label.baseline);
                    return (
                      <G transform={`translate(${label.x}, ${label.y})${label.angle ? ` rotate(${label.angle})` : ""}`}>
                        {lines.map((line, i) => (
                          <PlanText key={i} x={0} y={dys[i]} textAnchor={label.align} fontFamily="Roboto" fontSize={fit.fontSize} fill="#57504a">
                            {line}
                          </PlanText>
                        ))}
                      </G>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}


function Footer({ generatedAt, title }: { generatedAt: Date; title: string }) {
  const stamp = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short", timeStyle: "short",
  }).format(generatedAt);
  return (
    <View style={styles.footer} fixed>
      <Text>{title}</Text>
      {/* Отметка времени обязательна: рассадка меняется до последнего дня,
          и на руках у координатора не должно быть версии недельной давности. */}
      <Text render={({ pageNumber, totalPages }) =>
        `Выгружено ${stamp} · стр. ${pageNumber} из ${totalPages}`} />
    </View>
  );
}

/** Две колонки, читаемые сверху вниз: левая — первая половина алфавита.
 *  Порядок «поперёк строки» заставляет глаз прыгать через всю страницу. */
function splitColumns<T>(rows: T[]): [T[], T[]] {
  const half = Math.ceil(rows.length / 2);
  return [rows.slice(0, half), rows.slice(half)];
}

export function SeatingDocument({
  eventTitle, eventDate, venueName, tables, hall = DEFAULT_HALL, generatedAt,
}: PdfInput) {
  const seated = tables.flatMap((table) =>
    table.seats
      .filter((seat) => seat.guest)
      .map((seat) => ({ name: seat.guest!.displayName, table: table.label })),
  );
  const alphabetical = [...seated].sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const dateLabel = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(eventDate);
  const subtitle = [dateLabel, venueName].filter(Boolean).join(" · ");

  return (
    <Document title={`${eventTitle} — рассадка`} author="Вместе">
      {/* 1. Схема зала */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.h1}>{eventTitle}</Text>
        <Text style={styles.meta}>
          {subtitle} · {seated.length} гостей за {tables.length} столами
        </Text>
        <FloorPlanPdf tables={tables} hall={hall} />
        {tables.some((table) =>
          table.seats.some((seat) => seat.guest?.role && seat.guest.role !== "GUEST"),
        ) ? (
          <Text style={styles.legend}>
            Значками на схеме отмечены места невесты и жениха.
          </Text>
        ) : null}
        <Footer generatedAt={generatedAt} title={`${eventTitle} — схема зала`} />
      </Page>

      {/* 2. Кто за каким столом */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Кто за каким столом</Text>
        <Text style={styles.meta}>{subtitle}</Text>

        <View style={styles.tablesGrid}>
          {tables.map((table) => (
            <View key={table.id} style={styles.tableCard} wrap={false}>
              <Text style={styles.tableName}>{table.label}</Text>
              {table.seats.map((seat) => (
                <View key={seat.id} style={styles.seatRow}>
                  <Text style={styles.seatNum}>{seat.index + 1}</Text>
                  <Text style={seat.guest ? styles.seatName : styles.empty}>
                    {seat.guest ? seat.guest.displayName : "—"}
                    {seat.guest?.role && seat.guest.role !== "GUEST"
                      ? ` — ${ROLE_LABEL[seat.guest.role]}`
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <Footer generatedAt={generatedAt} title={`${eventTitle} — по столам`} />
      </Page>

      {/* 3. Алфавитный указатель — рабочий инструмент координатора на входе */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Гости по алфавиту</Text>
        <Text style={styles.meta}>
          Список для встречи гостей: имя и его стол. {alphabetical.length} человек.
        </Text>

        <View style={styles.indexGrid}>
          {splitColumns(alphabetical).map((column, ci) => (
            <View key={ci} style={styles.indexColumn}>
              {column.map((row, i) => (
                <View key={`${row.name}-${i}`} style={styles.indexRow} wrap={false}>
                  <Text>{row.name}</Text>
                  <Text style={styles.indexTable}>{row.table}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {alphabetical.length === 0 && (
          <Text style={styles.empty}>Пока никто не рассажен.</Text>
        )}
        <Footer generatedAt={generatedAt} title={`${eventTitle} — по алфавиту`} />
      </Page>
    </Document>
  );
}
