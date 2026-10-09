/**
 * Строка с маленькой разметкой → React: `**жирный**` и `[текст](/адрес)`.
 * Внутренние адреса — через next/link, внешние открываются как обычные ссылки.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export function Rich({ text }: { text: string }) {
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = match.index;
    if (match[3] !== undefined) {
      out.push(<strong key={key}>{match[3]}</strong>);
    } else {
      const [, label, href] = match;
      out.push(
        href.startsWith("/") ? (
          <Link key={key} href={href}>{label}</Link>
        ) : (
          <a key={key} href={href} rel="noopener">{label}</a>
        ),
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
