"use client";

import { useSyncExternalStore } from "react";

const DESKTOP = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Широкий экран или телефон — решает, открывать панели сбоку или
 * выезжающими снизу. На сервере считаем, что телефон: всплывающие панели
 * открываются только по действию человека, поэтому расхождения при
 * гидрации не бывает.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}
