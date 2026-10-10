/** Print an isolated DOM clone: no user text is interpolated into HTML. */
export async function printTimingSheet(sheet: HTMLElement, title: string, lang: string) {
  const frame = document.createElement("iframe");
  frame.title = lang === "en" ? "Print wedding programme" : "Печать программы свадьбы";
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0";
  document.body.append(frame);
  const cleanup = () => frame.remove();
  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) throw new Error("Print document unavailable");
    doc.documentElement.lang = lang;
    doc.title = title;
    const base = doc.createElement("base");
    base.href = document.baseURI;
    doc.head.append(base);
    const loads: Promise<void>[] = [];
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      if (clone.tagName === "LINK") {
        loads.push(new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Stylesheet timed out")), 15000);
          clone.onload = () => { window.clearTimeout(timeout); resolve(); };
          clone.onerror = () => { window.clearTimeout(timeout); reject(new Error("Stylesheet failed")); };
        }));
      }
      doc.head.append(clone);
    });
    const printStyle = doc.createElement("style");
    printStyle.textContent = '@page{size:A4;margin:12mm}html,body{margin:0;background:white!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}[data-timing-sheet]{width:100%!important;max-width:none!important;box-shadow:none!important;margin:0!important}li{break-inside:avoid}';
    doc.head.append(printStyle);
    doc.body.append(sheet.cloneNode(true));
    // Background ornaments are not <img> elements. Load the selected assets too.
    const urls = new Set<string>();
    [sheet, ...Array.from(sheet.querySelectorAll<HTMLElement>("*"))].forEach((element) => {
      const value = getComputedStyle(element).backgroundImage;
      for (const match of value.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(match[1]);
    });
    await Promise.all([...loads, ...Array.from(urls, (url) => new Promise<void>((resolve) => {
      const asset = new Image();
      const timer = window.setTimeout(resolve, 8000);
      asset.onload = asset.onerror = () => { window.clearTimeout(timer); resolve(); };
      asset.src = url;
    }))]);
    await Promise.race([doc.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 8000))]);
    if (!frame.isConnected) return cleanup;
    win.addEventListener("afterprint", cleanup, { once: true });
    // An off-screen iframe may never receive animation frames in some browsers.
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 150);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        window.clearTimeout(timer);
        resolve();
      }));
    });
    win.focus();
    win.print();
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
