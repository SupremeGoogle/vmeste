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
  Document, Font, Page, StyleSheet, Svg, Circle, Ellipse, Rect, Text as SvgText,
  Text, View,
} from "@react-pdf/renderer";

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
  seats: { id: string; index: number; guest: { id: string; displayName: string } | null }[];
};

export type PdfInput = {
  eventTitle: string;
  eventDate: Date;
  venueName: string | null;
  tables: PdfTable[];
  generatedAt: Date;
};

const PLAN_W = 1000;
const PLAN_H = 700;

const styles = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 10, padding: 32, color: "#2b2622" },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  meta: { fontSize: 9, color: "#7a7068", marginBottom: 16 },
  h2: { fontSize: 13, fontWeight: 700, marginBottom: 8 },

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
    borderBottomWidth: 0.5, borderBottomColor: "#eee7dc", paddingBottom: 1.5,
  },
  indexTable: { color: "#57504a", fontWeight: 700 },

  footer: {
    position: "absolute", bottom: 18, left: 32, right: 32,
    fontSize: 8, color: "#a09488",
    flexDirection: "row", justifyContent: "space-between",
  },
});

/** Подпись у места: «Анастасия Петрова» → «А. Петрова». Полное имя
 *  не влезает между двумя соседними местами круглого стола. */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0]}. ${parts[1]}`;
}

function seatPosition(table: PdfTable, index: number) {
  const count = Math.max(table.capacity, 1);
  if (table.shape === "ROUND" || table.shape === "OVAL") {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: table.x + Math.cos(angle) * (table.width / 2 + 26),
      y: table.y + Math.sin(angle) * (table.height / 2 + 26),
    };
  }
  const perSide = Math.ceil(count / 2);
  const side = index < perSide ? -1 : 1;
  const pos = index % perSide;
  const step = table.width / (perSide + 1);
  return {
    x: table.x - table.width / 2 + step * (pos + 1),
    y: table.y + side * (table.height / 2 + 22),
  };
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

/** Куда отнести подпись места: по направлению «от центра стола наружу». */
function labelPosition(table: PdfTable, seat: { x: number; y: number }) {
  const dx = seat.x - table.x;
  const dy = seat.y - table.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: seat.x + (dx / len) * 6,
    y: seat.y + (dy / len) * 22 + 5,
  };
}

function FloorPlanPdf({ tables }: { tables: PdfTable[] }) {
  return (
    <Svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} style={{ width: "100%", height: 440 }}>
      {tables.map((table) => {
        const round = table.shape === "ROUND" || table.shape === "OVAL";
        return (
          <React.Fragment key={table.id}>
            {round ? (
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
              x={table.x} y={table.y + 6} textAnchor="middle"
              fontFamily="Roboto" fontWeight={700} fontSize={20} fill="#3a332c"
            >
              {table.label}
            </PlanText>
            {table.seats.map((seat) => {
              const { x, y } = seatPosition(table, seat.index);
              const label = labelPosition(table, { x, y });
              return (
                <React.Fragment key={seat.id}>
                  <Circle
                    cx={x} cy={y} r={11}
                    fill={seat.guest ? "#cfc4b2" : "#ffffff"}
                    stroke="#c9bfb0" strokeWidth={1.5}
                  />
                  {seat.guest && (
                    <PlanText
                      x={label.x} y={label.y} textAnchor="middle"
                      fontFamily="Roboto" fontSize={13} fill="#57504a"
                    >
                      {shortName(seat.guest.displayName)}
                    </PlanText>
                  )}
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

export function SeatingDocument({ eventTitle, eventDate, venueName, tables, generatedAt }: PdfInput) {
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
        <FloorPlanPdf tables={tables} />
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
