// Обходит страницы кабинета на английском и печатает видимый русский текст.
const base = "http://localhost:3000";
const ev = process.argv[2];
const cookie = "vmeste_session=claude-i18n-audit; vm_lang=en";
const tabs = ["", "/guests", "/guests/answers", "/invite", "/invite/form", "/invite/wishlist", "/seating", "/timing", "/print", "/screen", "/photos", "/wishes", "/gifts", "/raffle", "/video", "/rsvp", "/settings"];
const pages = ["/app", "/app/settings", "/app/events/new", ...tabs.map((t) => `/app/e/${ev}${t}`), "/forgot?lang=en", "/register/check?email=a%40b.c&lang=en"];
const ignore = /Алина|Олег|Аня|Миша|Свадьба|демонстрация/;
for (const p of pages) {
  const res = await fetch(base + p, { headers: { cookie }, redirect: "manual" });
  if (res.status !== 200) { console.log(`== ${p} → ${res.status} ${res.headers.get("location") ?? ""}`); continue; }
  let html = await res.text();
  html = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
  const attrs = [...html.matchAll(/(?:aria-label|title|placeholder|alt)="([^"]*[А-Яа-яЁё][^"]*)"/g)].map((m) => "@" + m[1]);
  const text = html.replace(/<[^>]+>/g, "\n").split("\n").map((s) => s.trim()).filter((s) => /[А-Яа-яЁё]/.test(s));
  const hits = [...new Set([...text, ...attrs])].filter((s) => !ignore.test(s) || s.replace(ignore, "").match(/[А-Яа-яЁё]{3,}/));
  console.log(`== ${p} (${hits.length})`);
  for (const h of hits.slice(0, 25)) console.log("   " + h.slice(0, 140));
}
