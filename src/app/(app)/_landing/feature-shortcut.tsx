"use client";

import type { ReactNode } from "react";

export function FeatureShortcut({ kind, className, label, children }: {
  kind: "invite" | "rsvp" | "seating" | "raffle";
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <a href="#vozmozhnosti" className={className} aria-label={label} onClick={() => {
      window.dispatchEvent(new CustomEvent("vmeste:show-feature", { detail: kind }));
    }}>
      {children}
    </a>
  );
}
