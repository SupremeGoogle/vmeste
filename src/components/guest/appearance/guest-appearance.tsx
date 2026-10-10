import type { CSSProperties, ReactNode } from "react";
import { guestAppearanceVariables, type GuestAppearance } from "@/lib/guest-appearance";
import styles from "./guest-appearance.module.css";

export function GuestAppearanceFrame({ theme, children }: { theme: GuestAppearance; children: ReactNode }) {
  return <div className={styles.appearance} data-guest-appearance={theme.id} data-mood={theme.mood} style={guestAppearanceVariables(theme) as CSSProperties}>{children}</div>;
}
