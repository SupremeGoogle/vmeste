import { INVITE_TEMPLATES, templateBlocks, templateTheme } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { renderBlocks, inviteScript } from "@/server/guest-html/invite-html";
import { withGuestLang } from "@/server/guest-html/guest-lang";

const ids = process.argv.slice(2);
const date = new Date("2027-06-12T13:00:00Z");
for (const t of INVITE_TEMPLATES) {
  if (ids.length && !ids.includes(t.id)) continue;
  const blocks = templateBlocks(t, "en").map((b, order) => ({ id: `b${order}`, type: b.type, order, visible: true, ...readBlockContent(b.type, b.content) })) as never[];
  const theme = { ...templateTheme(t, "en"), musicUrl: "/media/x.mp3", wedding: { names: "Emily & James", city: "Asolo", venueName: "Villa", venueAddress: "Asolo", mapUrl: "" } } as never;
  const found = new Map<string, number>();
  for (const editable of [false, true]) {
    let html = withGuestLang("en", () => renderBlocks(blocks, "/r", null, date, theme, "UTC", { editable }) + "<script>" + inviteScript(blocks, theme, "Emily & James") + "</script>");
    if (html.includes("${gl") || html.includes("gl(\"")) console.log("   !!! LITERAL gl IN OUTPUT");
    html = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/data-component-label="[^"]*"/g, "").replace(/<div class="ie-tools"[\s\S]*?<\/div>/g, "").replace(/<button[^>]*data-block-action="insert-after"[^>]*>[^<]*<\/button>/g, "").replace(/var W=\{days[^}]*\}/g, "");
    for (const m of html.matchAll(/.{0,40}[А-Яа-яЁё][А-Яа-яЁё ,.!?«»—\-:]*.{0,20}/g)) {
      const k = (editable ? "[ed] " : "") + m[0].replace(/\s+/g, " ");
      found.set(k, (found.get(k) ?? 0) + 1);
    }
  }
  const classes = (lang: "ru" | "en") => {
    const bl = templateBlocks(t, lang).map((b, order) => ({ id: `b${order}`, type: b.type, order, visible: true, ...readBlockContent(b.type, b.content) })) as never[];
    const th = { ...templateTheme(t, lang), wedding: { names: lang === "en" ? "Emily & James" : "Аня и Миша", city: "", venueName: "Villa", venueAddress: "Asolo", mapUrl: "" } } as never;
    const out = withGuestLang(lang, () => renderBlocks(bl, "/r", null, date, th, "UTC", {}));
    return [...out.matchAll(/<(?:section|article|div)[^>]*data-content-block="[^"]*"[^>]*class="([^"]*)"|<(?:section|article|div)[^>]*class="([^"]*)"[^>]*data-content-block/g)].map((m) => m[1] ?? m[2]).join(" | ");
  };
  const ruC = classes("ru"), enC = classes("en");
  if (process.env.SHOWC) console.log("   C:", ruC.slice(0, 300));
  if (t.blocksEn && ruC !== enC) console.log(`   !!! SECTION CLASSES DIFFER
   ru: ${ruC}
   en: ${enC}`);
  console.log(`== ${t.id} blocksEn=${!!t.blocksEn} hits=${found.size}`);
  for (const k of found.keys()) console.log("   ", k.slice(0, 160));
}
