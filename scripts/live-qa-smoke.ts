import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { INVITE_TEMPLATES } from "../src/lib/invite-templates";

const base = process.env.BASE ?? "http://localhost:3010";
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || new URL(dbUrl).pathname !== "/vmeste_liveqa") {
  throw new Error("QA smoke test requires isolated vmeste_liveqa database");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

async function main() {
  const templates = await Promise.all(INVITE_TEMPLATES.map(async (template) => {
    const response = await fetch(`${base}/templates/${template.id}`);
    const body = await response.text();
    const urls = [...body.matchAll(/(?:src|href)=["'](\/(?:media|fonts)\/[^"']+)["']/g)]
      .map((match) => match[1].replaceAll("&amp;", "&"));
    const assets = await Promise.all([...new Set(urls)].map(async (path) => {
      const asset = await fetch(`${base}${path}`, { method: "HEAD" });
      return { path, status: asset.status };
    }));
    return {
      id: template.id,
      status: response.status,
      html: /<!doctype html>/i.test(body) && body.includes("<html"),
      bytes: body.length,
      assets: assets.length,
      missing: assets.filter((asset) => asset.status !== 200),
    };
  }));

  for (const row of templates) {
    console.log(`template ${row.id}: HTTP ${row.status}, html=${row.html}, bytes=${row.bytes}, assets=${row.assets}, missing=${row.missing.length}`);
    for (const asset of row.missing) console.log(`  missing ${asset.status}: ${asset.path}`);
  }

  const event = await db.event.findFirstOrThrow({ where: { slug: "anya-misha" } });
  const guest = await db.guest.findFirstOrThrow({ where: { eventId: event.id }, select: { id: true, linkToken: true } });
  const path = `/i/${event.slug}/${guest.linkToken}/wish`;
  const before = await db.wish.count({ where: { guestId: guest.id } });
  const negative = ["Вы идиоты", "Ненавижу вас", "Желаю вам развода", "Чтоб вы сдохли", "Вы мрaзь", "Вы уроды", "Пусть вы разведетесь", "Сдохните оба", "Горите в аду"];
  const rejected: boolean[] = [];
  for (const message of negative) {
    const form = new URLSearchParams({ authorName: "Гость", text: message });
    const response = await fetch(`${base}${path}`, { method: "POST", body: form, redirect: "manual" });
    const blocked = response.status === 303 && decodeURIComponent(response.headers.get("location") ?? "").includes("оскорбление");
    rejected.push(blocked);
    console.log(`negative wish ${JSON.stringify(message)}: HTTP ${response.status}, blocked=${blocked}`);
  }
  const after = await db.wish.count({ where: { guestId: guest.id } });
  console.log(`negative wish persistence: before=${before}, after=${after}`);

  const positiveText = `Пусть скука вам не грозит, совет да любовь! ${Date.now()}`;
  const positive = new URLSearchParams({ authorName: "Гость", text: positiveText });
  const positiveResponse = await fetch(`${base}${path}`, { method: "POST", body: positive, redirect: "manual" });
  const pending = await db.wish.findFirst({ where: { guestId: guest.id, text: positiveText }, select: { status: true } });
  console.log(`positive wish: HTTP ${positiveResponse.status}, pending=${pending?.status ?? "missing"}`);
  await db.wish.deleteMany({ where: { guestId: guest.id, text: positiveText } });

  if (templates.some((row) => row.status !== 200 || !row.html || row.missing.length) || rejected.some((value) => !value) || after !== before || positiveResponse.status !== 303 || pending?.status !== "PENDING") {
    process.exitCode = 1;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
