"use client";

/** Кнопка отправки, которая на время запроса гаснет и говорит, что идёт работа. */
import { useFormStatus } from "react-dom";
import { useT } from "@/components/i18n-provider";

export function SubmitButton({
  children,
  className,
  pendingText,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? (pendingText ?? t("Сохраняем…", "Saving…")) : children}
    </button>
  );
}
