import React from "react";
/* eslint-disable jsx-a11y/alt-text -- react-pdf Image does not support HTML alt. */
import path from "node:path";
import { readFileSync } from "node:fs";
import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer";
import { mmToPt, PRINT_INVITE_DECOR, printInviteSize, printInviteTemplate, type PrintInvitation, type PrintInviteLayer } from "@/lib/print-invitation";
import type { PrintInvitationPhoto } from "@/server/services/print-invitation";

const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({ family: "InvitePrintSerif", src: path.join(fontDir, "CormorantGaramond-Regular.ttf") });
Font.register({ family: "InvitePrintScript", src: path.join(fontDir, "GreatVibes-Regular.ttf") });
Font.register({ family: "InvitePrintSans", src: path.join(fontDir, "Roboto-Regular.ttf") });
Font.registerHyphenationCallback((word) => [word]);

const assetCache = new Map<string, { data: Buffer; format: "png" | "jpg" }>();
const asset = (name: string) => {
  let item = assetCache.get(name);
  if (!item) {
    item = { data: readFileSync(path.join(process.cwd(), "public", "media", "invite-print", name)), format: name.endsWith(".png") ? "png" : "jpg" };
    assetCache.set(name, item);
  }
  return item;
};
const fontFamily = (font: PrintInviteLayer["font"]) => font === "script" ? "InvitePrintScript" : font === "sans" ? "InvitePrintSans" : "InvitePrintSerif";

function Layer({ layer, design, recipient, photos }: { layer: PrintInviteLayer; design: PrintInvitation; recipient?: string; photos: Record<string, PrintInvitationPhoto> }) {
  if (layer.hidden) return null;
  const { mmW, mmH } = printInviteSize(design.size);
  const bleed = design.bleed ? mmToPt(3) : 0;
  const w = mmToPt(mmW);
  const h = mmToPt(mmH);
  const box = {
    position: "absolute" as const,
    left: bleed + w * layer.x / 100,
    top: bleed + h * layer.y / 100,
    width: w * layer.w / 100,
    height: h * layer.h / 100,
    transform: `rotate(${layer.rotation}deg)`,
  };
  if (layer.kind === "decor") {
    const item = PRINT_INVITE_DECOR.find((d) => d.id === layer.decor);
    return item ? <Image src={asset(item.file)} style={{ ...box, objectFit: "contain" }} /> : null;
  }
  if (layer.kind === "photo") {
    const photo = layer.assetId ? photos[layer.assetId] : null;
    if (!photo) return null;
    const fullPage = design.bleed && layer.x === 0 && layer.y === 0 && layer.w === 100 && layer.h === 100;
    const photoBox = fullPage ? { ...box, left: 0, top: 0, width: w + bleed * 2, height: h + bleed * 2 } : box;
    return <Image src={photo} style={{ ...photoBox, objectFit: layer.fit ?? "cover", borderRadius: layer.shape === "circle" ? Math.min(photoBox.width, photoBox.height) / 2 : layer.shape === "rounded" ? 9 : 0 }} />;
  }
  const sizeScale = w / mmToPt(105);
  const text = recipient && layer.id === "recipient" ? recipient : layer.text;
  return <View style={box} wrap={false}><Text style={{ fontFamily: fontFamily(layer.font), fontSize: layer.fontSize * sizeScale, lineHeight: layer.font === "script" ? 1.18 : 1.17, color: layer.color, textAlign: layer.align, letterSpacing: layer.font === "sans" ? 1.2 * sizeScale : 0 }}>{text}</Text></View>;
}

function Side({ design, page, recipient, photos }: { design: PrintInvitation; page: 0 | 1; recipient?: string; photos: Record<string, PrintInvitationPhoto> }) {
  const template = printInviteTemplate(design.template);
  const { mmW, mmH } = printInviteSize(design.size);
  const bleed = design.bleed ? 3 : 0;
  const pageW = mmToPt(mmW + bleed * 2);
  const pageH = mmToPt(mmH + bleed * 2);
  const background = asset(template.art);
  return <Page size={[pageW, pageH]} style={{ position: "relative", backgroundColor: template.paper }}>
    {design.showArt !== false ? <Image src={background} style={{ position: "absolute", left: 0, top: 0, width: pageW, height: pageH, opacity: page === 1 ? 0.28 : 1 }} /> : null}
    {page === 1 ? <View style={{ position: "absolute", left: "9%", top: "12%", width: "82%", height: "76%", borderWidth: 0.6, borderColor: template.accent, opacity: 0.45 }} /> : null}
    {design.layers.filter((layer) => layer.page === page).map((layer) => <Layer key={layer.id} layer={layer} design={design} recipient={recipient} photos={photos} />)}
  </Page>;
}

export function PrintInvitationDocument({ design, guests = [], photos = {} }: { design: PrintInvitation; guests?: string[]; photos?: Record<string, PrintInvitationPhoto> }) {
  const recipients = design.recipients === "all" && guests.length ? guests : [undefined];
  return <Document title="Печатное приглашение на свадьбу" author="Вместе" subject="Приглашение для печати и отправки гостям">
    {recipients.flatMap((recipient, index) => [
      <Side key={`${index}-front`} design={design} page={0} recipient={recipient} photos={photos} />,
      ...(design.doubleSided ? [<Side key={`${index}-back`} design={design} page={1} recipient={recipient} photos={photos} />] : []),
    ])}
  </Document>;
}
