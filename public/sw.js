/**
 * Service Worker гостевых страниц входа.
 *
 * Это не «офлайн-приложение», а один кеш на один сценарий: гость, который
 * хоть раз открыл свою страницу, должен видеть свой стол и без сети.
 * На площадках связь пропадает не «медленно», а полностью (PLAN.md §5.1).
 *
 * Стратегия — network-first с коротким таймаутом: пока сеть есть, показываем
 * свежую рассадку (организатор мог пересадить гостя пять минут назад);
 * когда сети нет — отдаём последнюю сохранённую копию.
 */
const CACHE = "vmeste-guest-v1";
const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener("install", (event) => {
  // Новый воркер начинает работать сразу: ждать закрытия всех вкладок
  // в день свадьбы никто не будет.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isGuestEntry(url) {
  return url.origin === self.location.origin && /^\/e\/[^/]+(\/me)?$/.test(url.pathname);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Ни сети, ни копии этой конкретной страницы — но, возможно, гость
    // раньше открывал другую страницу этого же мероприятия.
    const url = new URL(request.url);
    const fallback = await cache.match(`/e/${url.pathname.split("/")[2]}`);
    if (fallback) return fallback;

    return new Response(
      `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Нет связи</title>
<style>body{margin:0;background:#f8f5f0;color:#2b2622;font:17px/1.5 -apple-system,sans-serif}
.w{max-width:30rem;margin:0 auto;padding:3rem 1.25rem}h1{font-size:1.5rem;margin:0 0 .5rem}
p{color:#7a7068}</style></head><body><div class="w"><h1>Нет связи</h1>
<p>Страница откроется, когда появится интернет. Если вы уже находили свой стол,
вернитесь на предыдущую страницу — она сохранена.</p>
<p>Или подойдите к координатору — у него есть список на бумаге.</p></div></body></html>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isGuestEntry(url)) return;

  event.respondWith(networkFirst(request));
});
