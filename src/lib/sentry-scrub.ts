/**
 * Чистка отчётов Sentry от личного: токены именных ссылок гостей
 * (`/i/{slug}/{token}`), токены экранов и одноразовые ссылки не должны
 * уходить во внешний сервис вместе с ошибкой.
 */
const TOKEN_PATHS: [RegExp, string][] = [
  [/(\/i\/[^/?#]+\/)[^/?#]{8,}/g, "$1[token]"],
  [/(\/screen\/)[^/?#]{8,}/g, "$1[token]"],
  [/(\/g\/)[^/?#]{4,}/g, "$1[code]"],
  [/([?&](?:token|sig|gsig|code|state)=)[^&#]+/g, "$1[filtered]"],
];

export function scrubUrl(value: string): string {
  return TOKEN_PATHS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

type Scrubbable = {
  request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: Record<string, string> };
  breadcrumbs?: { data?: Record<string, unknown>; message?: string }[];
  transaction?: string;
};

export function scrubEvent<T extends Scrubbable>(event: T): T {
  if (event.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    if (event.request.headers) {
      for (const name of Object.keys(event.request.headers)) {
        if (/cookie|authorization/i.test(name)) delete event.request.headers[name];
      }
    }
  }
  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubUrl(crumb.message);
    for (const key of ["url", "from", "to"]) {
      const value = crumb.data?.[key];
      if (typeof value === "string") crumb.data![key] = scrubUrl(value);
    }
  }
  return event;
}
