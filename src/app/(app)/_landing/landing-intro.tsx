"use client";

/**
 * Заставка главной. Показывается один раз за визит (sessionStorage) и не
 * держит экран дольше нужного: уходит, как только готовы шрифты и картинка
 * маскота, но не раньше 0,5 с (иначе мигнёт) и не позже 1,5 с. Раньше она
 * стояла минимум 1,6 с и ещё 1,2 с уходила — почти 3 секунды на каждом заходе.
 */
import { useEffect, useState } from "react";

const SEEN = "vm-intro-seen";

export function LandingIntro() {
  const [phase, setPhase] = useState<"loading" | "leaving" | "hidden">("loading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let ready = false;
    let lastProgress = -1;
    const started = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch { /* приватный режим */ }
    if (seen) {
      frame = requestAnimationFrame(() => setPhase("hidden"));
      return () => cancelAnimationFrame(frame);
    }

    const poster = document.querySelector<HTMLImageElement>(".clay-mascot-media img");
    void Promise.allSettled([
      document.fonts.ready,
      poster?.decode() ?? Promise.resolve(),
    ]).then(() => { ready = true; });

    const dismiss = () => {
      if (disposed) return;
      try { sessionStorage.setItem(SEEN, "1"); } catch { /* приватный режим */ }
      setProgress(100);
      exitTimer = setTimeout(() => {
        setPhase("leaving");
        finishTimer = setTimeout(() => setPhase("hidden"), 700);
      }, 80);
    };

    const tick = (now: number) => {
      if (disposed) return;
      if (reducedMotion.matches) {
        setPhase("hidden");
        return;
      }
      const elapsed = now - started;
      if ((ready && elapsed >= 500) || elapsed >= 1500) {
        dismiss();
        return;
      }
      const fraction = Math.min(elapsed / 900, 1);
      const eased = fraction < .5 ? 2 * fraction ** 2 : 1 - (-2 * fraction + 2) ** 2 / 2;
      const next = Math.round(eased * 94);
      if (next !== lastProgress) {
        setProgress(next);
        lastProgress = next;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <>
      <div className={`home home--clay clay-loader${phase === "leaving" ? " clay-loader--leaving" : ""}`} aria-hidden={phase === "leaving" || undefined}>
        <div className="clay-loader-curtain clay-loader-curtain--rose" />
        <div className="clay-loader-curtain clay-loader-curtain--sage" />
        <div className="clay-loader-curtain clay-loader-curtain--ivory" />
        <div className="clay-loader-inner" role="status" aria-label="Загружаем Вместе">
          <span className="clay-loader-logo-wrap"><span className="clay-loader-logo" role="img" aria-label="Вместе" /></span>
          <div className="clay-loader-bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <span className="clay-loader-percent" aria-hidden="true">{progress}%</span>
        </div>
      </div>
      <noscript><style>{".clay-loader{display:none}"}</style></noscript>
      {/* Повторный заход за визит: прячем заставку до гидрации, без мигания. */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("${SEEN}")==="1")document.documentElement.classList.add("vm-intro-seen")}catch(e){}` }} />
    </>
  );
}
