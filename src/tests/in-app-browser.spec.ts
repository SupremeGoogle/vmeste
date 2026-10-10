/** Встроенные браузеры соцсетей: Google их не пускает, обычные браузеры трогать нельзя. */
import { describe, expect, it } from "vitest";
import { IN_APP_UA, detectInAppBrowser, openInBrowserHref } from "@/lib/in-app-browser";

// Настоящие User-Agent из журнала nginx: заходы по ссылке в шапке Instagram 7 октября.
const IG_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/23G90 Instagram 448.0.0.39.66 (iPhone18,1; iOS 26_6_2; ru_RU; ru; scale=3.00; 1206x2622; IABMV/1; 1072661960) Safari/604.1";
const IG_ANDROID = "Mozilla/5.0 (Linux; Android 13; 23054RA19C Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/155.0.8059.36 Mobile Safari/537.36 Instagram 451.0.0.0.53 Android (33/13; 440dpi; 1080x2460; Xiaomi/Redmi; 23054RA19C; pearl";
const FB_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.97;FBBV/612345678;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBLC/ru_RU]";
const ANDROID_WEBVIEW = "Mozilla/5.0 (Linux; Android 14; SM-S921B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.0.0 Mobile Safari/537.36";

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 16; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36";
const CHROME_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/154.0.0.0 Mobile/15E148 Safari/604.1";
const YANDEX = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/25.6.1.88 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

describe("встроенный браузер", () => {
  it("узнаёт Instagram, Facebook и Android WebView", () => {
    expect(detectInAppBrowser(IG_IOS)).toEqual({ app: "Instagram", os: "ios" });
    expect(detectInAppBrowser(IG_ANDROID)).toEqual({ app: "Instagram", os: "android" });
    expect(detectInAppBrowser(FB_IOS)).toEqual({ app: "Facebook", os: "ios" });
    expect(detectInAppBrowser(ANDROID_WEBVIEW)).toEqual({ app: null, os: "android" });
  });

  it("не трогает обычные браузеры", () => {
    for (const ua of [SAFARI, CHROME_ANDROID, CHROME_IOS, YANDEX, DESKTOP, "", null, undefined]) {
      expect(detectInAppBrowser(ua)).toBeNull();
    }
  });

  it("общее выражение для скрипта до гидрации согласно с detectInAppBrowser", () => {
    for (const ua of [IG_IOS, IG_ANDROID, FB_IOS, ANDROID_WEBVIEW]) expect(IN_APP_UA.test(ua)).toBe(true);
    for (const ua of [SAFARI, CHROME_ANDROID, CHROME_IOS, YANDEX, DESKTOP]) expect(IN_APP_UA.test(ua)).toBe(false);
    // Встроенный скрипт собирает выражение заново из строки.
    expect(new RegExp(JSON.parse(JSON.stringify(IN_APP_UA.source))).test(IG_ANDROID)).toBe(true);
  });

  it("ссылка «открыть в браузере» ведёт на тот же адрес", () => {
    expect(openInBrowserHref("https://vvvmeste.com/register?lang=en", "android"))
      .toBe("intent://vvvmeste.com/register?lang=en#Intent;scheme=https;package=com.android.chrome;end");
    expect(openInBrowserHref("https://vvvmeste.com/login", "ios")).toBe("x-safari-https://vvvmeste.com/login");
    expect(openInBrowserHref("https://vvvmeste.com/login", "other")).toBeNull();
  });
});
