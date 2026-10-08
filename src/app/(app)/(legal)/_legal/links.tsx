import Link from "next/link";

export const LEGAL_DOCS = [
  { href: "/offer", title: "Публичная оферта" },
  { href: "/privacy", title: "Политика конфиденциальности" },
  { href: "/consent", title: "Согласие на обработку данных" },
  { href: "/cookies", title: "Политика cookie" },
] as const;

/** Пункты списка для подвала: `<ul>` даёт место, где они стоят. */
export function LegalLinks() {
  return LEGAL_DOCS.map((doc) => (
    <li key={doc.href}>
      <Link href={doc.href}>{doc.title}</Link>
    </li>
  ));
}
