"use client";

/**
 * Кнопка формы с подтверждением через `confirm()` браузера.
 *
 * Не полноценный клиентский экран, а одна проверка на клик — для действий,
 * которые стирают данные без возможности отмены: удаление раздела,
 * пересборка приглашения по шаблону заново. Отдельное состояние «точно?»
 * прямо в разметке добавило бы кнопке второй шаг там, где рядом и так
 * тесно соседствуют «Выше»/«Ниже»/«Скрыть».
 */
import { useFormStatus } from "react-dom";

export function ConfirmButton({
  confirmText, className, children, disabled = false,
}: {
  confirmText: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={disabled || pending}
      onClick={(event) => {
        if (!confirm(confirmText)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
