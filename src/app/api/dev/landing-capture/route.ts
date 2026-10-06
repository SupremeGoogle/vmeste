/** Local capture canvas: renders the real page at twice its CSS resolution. */
const SCREENS = {
  guest: { path: "/g/487SRP", width: 390, height: 844 },
  seating: { path: "/app/e/cmuv6e3rc0000moww7i7uxq4x/seating", width: 1280, height: 1100 },
  raffle: { path: "/app/e/cmuv6e3rc0000moww7i7uxq4x/raffle", width: 1280, height: 780 },
  rsvp: { path: "/app/e/cmtp3g66s0006fweshwyr0n74/rsvp", width: 1280, height: 1100 },
} as const;

export function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "development" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    return new Response(null, { status: 404 });
  }
  const key = url.searchParams.get("screen") as keyof typeof SCREENS;
  const screen = SCREENS[key];
  if (!screen) return new Response(null, { status: 404 });
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Снимок настоящего интерфейса · ${key}</title><style>html,body{margin:0;padding:0;overflow:hidden;background:#fffdf9}iframe{display:block;border:0;zoom:2}</style></head><body><iframe title="Настоящий интерфейс" src="${screen.path}" width="${screen.width}" height="${screen.height}"></iframe></body></html>`, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
