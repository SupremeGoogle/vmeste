import React from "react";
/* eslint-disable jsx-a11y/alt-text -- react-pdf Image does not support the HTML alt prop. */
import path from "node:path";
import { readFileSync } from "node:fs";
import { Document, Font, Image, Line, Page, Svg, Text, View } from "@react-pdf/renderer";
import {
  guestFontSize, isSoloPrintTable, pageScale, paperSize, PRINT_TEMPLATES, type PrintDesign, type PrintElement, type PrintTable,
} from "@/lib/print-design";
import type { Lang } from "@/lib/i18n";

const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({ family: "PrintSerif", src: path.join(fontDir, "CormorantGaramond-Regular.ttf") });
Font.register({ family: "PrintScript", src: path.join(fontDir, "GreatVibes-Regular.ttf") });
Font.register({ family: "PrintSans", src: path.join(fontDir, "Roboto-Regular.ttf") });
Font.registerHyphenationCallback((word) => [word]);

const artFile = (name: string) => path.join(process.cwd(), "public", "media", "print-design", `${name}.png`);
const artData = (name: string) => ({ data: readFileSync(artFile(name)), format: "png" as const });
const percent = (value: number) => `${value}%`;

function Decorations({ design, page, lang }: { design: PrintDesign; page: number; lang: Lang }) {
  const theme = PRINT_TEMPLATES.find((item) => item.id === design.template) ?? PRINT_TEMPLATES[0];
  const k = pageScale(design.paper) * design.textScale;
  return <>
    {design.mode === "qr" ? <Image src={artData(theme.qrArt)} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "99%" }} /> : theme.art !== "none" ? <>
      <Image src={artData(theme.art)} style={{ position: "absolute", left: 0, top: 0, width: "45%", height: "32%" }} />
      <Image src={artData(theme.art)} style={{ position: "absolute", right: 0, bottom: 0, width: "45%", height: "32%", transform: "rotate(180deg)" }} />
    </> : null}
    {theme.frame !== "none" ? <View style={{ position: "absolute", left: "4%", top: "3%", width: "92%", height: "94%", borderWidth: theme.frame === "double" ? 2 : 0.8, borderColor: design.accent }} /> : null}
    {theme.frame === "double" ? <View style={{ position: "absolute", left: "5%", top: "3.7%", width: "90%", height: "92.6%", borderWidth: 0.5, borderColor: design.accent }} /> : null}
    {theme.frame === "deco" ? <>
      <View style={{ position: "absolute", left: "5%", top: "3%", width: "90%", borderTopWidth: 2, borderColor: design.accent }} />
      <View style={{ position: "absolute", left: "5%", bottom: "3%", width: "90%", borderTopWidth: 2, borderColor: design.accent }} />
      <View style={{ position: "absolute", left: "7%", top: "4%", width: "86%", borderTopWidth: 0.7, borderColor: design.accent }} />
      <View style={{ position: "absolute", left: "7%", bottom: "4%", width: "86%", borderTopWidth: 0.7, borderColor: design.accent }} />
    </> : null}
    {/* Центр «схемы зала» совпадает с центром колец в `layoutTables` (50%, 60%). */}
    {design.mode === "seating" && theme.layout === "orbit" && !design.elements.some((item) => item.page === page && item.kind === "table" && isSoloPrintTable(design, item)) ? <View style={{ position: "absolute", left: "43%", top: "52.5%", width: "14%", height: "15%", borderWidth: 1.5, borderColor: design.accent, borderRadius: 100, justifyContent: "center", alignItems: "center" }}><Text style={{ fontFamily: "PrintSerif", fontSize: 19 * k, color: design.accent, textAlign: "center" }}>{lang === "en" ? "FLOOR\nPLAN" : "СХЕМА\nЗАЛА"}</Text></View> : null}
  </>;
}

function TableFrames({ design, page }: { design: PrintDesign; page: number }) {
  const theme = PRINT_TEMPLATES.find((item) => item.id === design.template) ?? PRINT_TEMPLATES[0];
  if (!["cards", "orbit", "single"].includes(theme.layout) && !design.elements.some((element) => element.kind === "table" && element.page === page && isSoloPrintTable(design, element))) return null;
  const { w, h } = paperSize(design.paper, design.orientation);
  return <>{design.elements.filter((element) => element.kind === "table" && element.page === page && !element.hidden).map((element) => {
    const boxW = w * element.w / 100;
    const solo = isSoloPrintTable(design, element);
    const boxH = h * (element.h ?? (solo ? 43 : 19)) / 100;
    const stroke = solo ? 1.5 : 0.8;
    return <Svg key={element.id} width={boxW} height={boxH} style={{ position: "absolute", left: percent(element.x), top: percent(element.y) }}>{theme.layout === "orbit" && !solo ? null : <>
      <Line x1={2} y1={2} x2={boxW - 4} y2={2} stroke={design.accent} strokeWidth={stroke} />
      <Line x1={boxW - 4} y1={2} x2={boxW - 4} y2={boxH - 4} stroke={design.accent} strokeWidth={stroke} />
      <Line x1={boxW - 4} y1={boxH - 4} x2={2} y2={boxH - 4} stroke={design.accent} strokeWidth={stroke} />
      <Line x1={2} y1={boxH - 4} x2={2} y2={2} stroke={design.accent} strokeWidth={stroke} />
    </>}</Svg>;
  })}</>;
}

function PrintItem({ element, design, tables, qrData, shortCode }: {
  element: PrintElement; design: PrintDesign; tables: PrintTable[]; qrData: string; shortCode: string;
}) {
  if (element.hidden) return null;
  // Кегли в макете заданы «для A3»; общий множитель текста — поверх.
  const k = pageScale(design.paper) * design.textScale;
  const outer = { position: "absolute" as const, left: percent(element.x), top: percent(element.y), width: percent(element.w) };
  if (element.kind === "qr") {
    return <View style={{ ...outer, padding: 7, backgroundColor: "#ffffff" }}><Image src={qrData} style={{ width: "100%", aspectRatio: 1 }} /></View>;
  }
  if (element.kind === "code") {
    return <View style={outer}>
      <Text style={{ fontFamily: "PrintSans", fontSize: 10 * k, color: design.ink, textAlign: element.align, letterSpacing: 2 }}>{element.text}</Text>
      <Text style={{ fontFamily: "PrintSans", fontSize: element.fontSize * k, color: design.ink, textAlign: element.align, letterSpacing: 3, marginTop: 5 }}>{shortCode}</Text>
    </View>;
  }
  if (element.kind === "table") {
    const table = tables.find((item) => item.id === element.tableId);
    if (!table) return null;
    const theme = PRINT_TEMPLATES.find((item) => item.id === design.template) ?? PRINT_TEMPLATES[0];
    const solo = isSoloPrintTable(design, element);
    // Тот же подбор кегля, что и на экране: имена влезают в высоту карточки.
    const longest = Math.max(0, ...table.guests.map((name) => name.length));
    const guestSize = guestFontSize(design, element, table.guests.length, solo, longest) * pageScale(design.paper);
    if (theme.layout === "orbit" && !solo) {
      // Название в кружке сверху, имена двумя колонками — как на экране.
      const halfway = Math.ceil(table.guests.length / 2);
      const title = element.fontSize * k;
      const column = (names: string[]) => <View style={{ width: "47%" }}>{names.map((name, i) => <Text key={`${i}-${name}`} style={{ fontFamily: "PrintSerif", fontSize: guestSize, textAlign: "center", color: design.ink, lineHeight: 1.18 }}>{name}</Text>)}</View>;
      return <View style={{ ...outer, height: percent(element.h ?? 19), alignItems: "center" }}>
        <View style={{ width: title * 3.2, height: title * 1.7, borderWidth: 1, borderColor: design.accent, borderRadius: 100, justifyContent: "center", alignItems: "center", marginBottom: 4 }}><Text style={{ fontFamily: "PrintSerif", fontSize: title, textAlign: "center", color: design.accent }}>{element.text || table.label}</Text></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>{column(table.guests.slice(0, halfway))}{column(table.guests.slice(halfway))}</View>
      </View>;
    }
    const boxed = ["cards", "orbit", "single"].includes(theme.layout) || solo;
    return <View wrap={false} style={{ ...outer, ...(element.h ? { height: percent(element.h) } : {}), overflow: "hidden", ...(boxed ? { padding: solo ? 24 : 10 } : {}) }}>
      <Text style={{ fontFamily: design.template === "minimal" || design.template === "deco" ? "PrintSerif" : "PrintScript", fontSize: element.fontSize * k, lineHeight: 1.1, color: design.accent, textAlign: element.align, marginBottom: 5 }}>{element.text || table.label}</Text>
      {table.guests.map((name, i) => <Text key={`${i}-${name}`} style={{ fontFamily: "PrintSerif", fontSize: guestSize, lineHeight: solo ? 1.35 : 1.18, color: design.ink, textAlign: element.align }}>{name}</Text>)}
    </View>;
  }
  const serif = element.id === "title" || element.fontSize >= 25;
  return <View style={outer}><Text style={{ fontFamily: serif ? design.template === "minimal" || design.template === "deco" ? "PrintSerif" : "PrintScript" : "PrintSerif", fontSize: element.fontSize * k, color: element.id === "title" ? design.accent : design.ink, textAlign: element.align, lineHeight: serif ? 1.2 : 1.1, letterSpacing: serif ? 0 : 1 }}>{element.text}</Text></View>;
}

export function PrintDesignDocument({ design, tables, qrData, shortCode, title, lang = "ru" }: {
  design: PrintDesign; tables: PrintTable[]; qrData: string; shortCode: string; title: string;
  /** Язык мероприятия: лист читают гости. */
  lang?: Lang;
}) {
  const theme = PRINT_TEMPLATES.find((item) => item.id === design.template) ?? PRINT_TEMPLATES[0];
  const pages = [...new Set([0, ...design.elements.filter((item) => !item.hidden).map((item) => item.page)])].sort((a, b) => a - b);
  return <Document title={lang === "en" ? `${title} — ${design.mode === "qr" ? "QR code" : "seating chart"}` : `${title} — ${design.mode === "qr" ? "QR код" : "план рассадки"}`} author={lang === "en" ? "Vmeste" : "Вместе"}>
    {pages.map((page) => <Page key={page} size={design.paper} orientation={design.orientation} style={{ position: "relative", backgroundColor: theme.paper }}>
      <Decorations design={design} page={page} lang={lang} />
      <TableFrames design={design} page={page} />
      {design.elements.filter((item) => item.page === page || page > 0 && item.kind === "text" && item.page === 0 && ["eyebrow", "title", "date"].includes(item.id)).map((element) => <PrintItem key={element.id} element={element} design={design} tables={tables} qrData={qrData} shortCode={shortCode} />)}
    </Page>)}
  </Document>;
}
