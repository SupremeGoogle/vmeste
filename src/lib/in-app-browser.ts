/**
 * Встроенный браузер соцсети: Instagram, Facebook, VK, TikTok…
 *
 * Google не пускает входить из встроенных браузеров приложений: человек
 * жмёт «Продолжить с Google» и упирается в «403 disallowed_useragent» без
 * пути назад. А именно так к нам и приходят: ссылка в шапке Instagram
 * открывается внутри Instagram (7 октября — все шесть заходов оттуда,
 * ни одной регистрации). Поэтому на входе и регистрации такому гостю
 * предлагаем почту (код из письма работает и здесь) или открыть страницу
 * в настоящем браузере.
 *
 * Список приложений — по меткам в User-Agent, без догадок по «нет слова
 * Safari»: ошибка в эту сторону спрятала бы Google у обычного браузера.
 * Telegram на iPhone открывает ссылки в SFSafariViewController, Google его
 * пускает; на Android любой WebView помечен «; wv)» — его и ловим.
 */

const APPS: [RegExp, string][] = [
  [/Instagram/, "Instagram"],
  [/Barcelona/, "Threads"],
  [/FBAN\/Messenger|FB_IAB\/MESSENGER/, "Messenger"],
  [/FBAN|FBAV|FB_IAB|FBIOS/, "Facebook"],
  [/VKClient|vkclient|VKAndroidApp/, "VK"],
  [/OKApp/, "OK.ru"],
  [/musical_ly|BytedanceWebview|TikTok/, "TikTok"],
  [/Snapchat/, "Snapchat"],
  [/LinkedInApp/, "LinkedIn"],
  [/ Line\//, "LINE"],
];

/** Одно выражение на все случаи — для встроенного скрипта до гидрации. */
export const IN_APP_UA = new RegExp([...APPS.map(([pattern]) => pattern.source), /Android.*; wv\)/.source].join("|"));

export type InAppBrowser = {
  /** Название приложения или null, если узнали только по «; wv)». */
  app: string | null;
  os: "ios" | "android" | "other";
};

export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  const os = /iPhone|iPad|iPod/.test(userAgent) ? "ios" : /Android/.test(userAgent) ? "android" : "other";
  for (const [pattern, app] of APPS) {
    if (pattern.test(userAgent)) return { app, os };
  }
  if (os === "android" && /; wv\)/.test(userAgent)) return { app: null, os };
  return null;
}

/**
 * Ссылка «открыть в браузере». На Android — intent в Chrome (Instagram и
 * прочие WebView передают его системе). На iPhone — схема x-safari-https,
 * которую понимает iOS 17 и новее; на старых ничего не произойдёт, поэтому
 * рядом всегда есть копирование адреса и вход по почте.
 */
export function openInBrowserHref(url: string, os: InAppBrowser["os"]): string | null {
  const parsed = new URL(url);
  if (os === "android") {
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  if (os === "ios") return `x-safari-${parsed.href}`;
  return null;
}
