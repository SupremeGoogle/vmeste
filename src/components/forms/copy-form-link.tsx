"use client";

/** Скопировать полную ссылку: путь в адресе знает сервер, домен — только браузер. */
import { useState } from "react";
import { useT } from "@/components/i18n-provider";

export function CopyFormLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? t("Скопировано", "Copied") : t("Скопировать ссылку", "Copy link")}
    </button>
  );
}
