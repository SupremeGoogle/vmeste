"use client";

/** Скопировать полную ссылку: путь в адресе знает сервер, домен — только браузер. */
import { useState } from "react";
import { useT } from "@/components/i18n-provider";

export function CopyFormLink({ path, className = "rounded-lg border border-stone-300 px-4 py-2 text-sm" }: { path: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          // Буфер обмена закрыт (встроенный браузер, нет разрешения) — отдаём ссылку руками.
          window.prompt(t("Скопируйте ссылку", "Copy the link"), url);
        }
      }}
    >
      {copied ? t("Скопировано ✓", "Copied ✓") : t("Скопировать ссылку", "Copy link")}
    </button>
  );
}
