"use client";

/**
 * Поле, которое сохраняется само, без кнопки «Применить».
 *
 * Сохраняет через паузу после ввода, сразу по Enter и при уходе из поля.
 * Раньше число мест нельзя было ввести с клавиатуры: пустое поле тут же
 * подменялось прежним значением, и стереть «8», чтобы написать «10»,
 * было невозможно. Здесь поле хранит текст как есть, а к числу его
 * приводит только проверка перед сохранением.
 *
 * Если поле уходит со страницы с несохранённым вводом (щёлкнули по
 * другому столу), ввод сохраняется, а не пропадает.
 */
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import type { OpOutcome } from "./use-seating";

type Props = {
  value: string;
  /** Текст ошибки или null, если значение можно сохранять. */
  validate: (text: string) => string | null;
  commit: (text: string) => Promise<OpOutcome> | void;
  delay?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export function AutosaveInput({ value, validate, commit, delay = 600, className, ...rest }: Props) {
  const [text, setText] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Значение сменилось снаружи (пришёл план из базы), а человек ничего не
  // вводит — показываем новое. Правка «во время отрисовки», а не в эффекте:
  // так React не рисует кадр со старым числом.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (!dirty) setText(value);
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ text, value, validate, commit, dirty });
  useEffect(() => {
    latest.current = { text, value, validate, commit, dirty };
  });

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    const current = latest.current;
    if (!current.dirty) return;
    const trimmed = current.text.trim();
    if (validate(trimmed) || trimmed === current.value) {
      setDirty(false);
      return;
    }
    setDirty(false);
    const pending = current.commit(trimmed);
    if (pending) {
      void pending.then((outcome) => {
        if (!outcome.ok) {
          setHint(outcome.message);
          setText(latest.current.value);
        }
      });
    }
  }

  // Ушли со страницы или на другой стол — сохранить введённое.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => flushRef.current(), []);

  const error = dirty ? validate(text.trim()) : null;

  return (
    <span className="block">
      <input
        {...rest}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          setDirty(true);
          setHint(null);
          if (timer.current) clearTimeout(timer.current);
          if (!validate(next.trim())) {
            timer.current = setTimeout(() => flushRef.current(), delay);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            flush();
          }
          rest.onKeyDown?.(e);
        }}
        onBlur={(e) => {
          if (validate(text.trim())) {
            // Недопустимое значение при уходе из поля — возвращаем сохранённое.
            setText(value);
            setDirty(false);
          } else {
            flush();
          }
          rest.onBlur?.(e);
        }}
        aria-invalid={Boolean(error || hint)}
        className={`${className ?? ""} ${error || hint ? "border-red-400" : ""}`}
      />
      {(error || hint) && <span className="mt-1 block text-xs text-red-700">{error ?? hint}</span>}
    </span>
  );
}
