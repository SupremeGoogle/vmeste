"use client";

/** Кнопка отправки, которая на время запроса гаснет и говорит, что идёт работа. */
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className,
  pendingText = "Сохраняем…",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
