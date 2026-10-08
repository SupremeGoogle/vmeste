/**
 * Оболочка юридического документа: шапка с логотипом, заголовок, дата
 * редакции, текст и ссылки на остальные документы внизу.
 */
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { LEGAL_UPDATED, OPERATOR, SITE_HOST, SITE_URL } from "@/lib/site";
import { LEGAL_DOCS } from "./links";
import "./legal.css";

export function LegalPage({ title, current, children }: { title: string; current: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="inline-block" aria-label="На главную">
        <BrandLogo size={48} />
      </Link>
      <h1 className="mt-8 font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">Редакция от {LEGAL_UPDATED}</p>
      <article className="legal mt-8">{children}</article>
      <nav className="mt-12 border-t border-stone-200 pt-6 text-sm" aria-label="Документы">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {LEGAL_DOCS.filter((doc) => doc.href !== current).map((doc) => (
            <li key={doc.href}>
              <Link href={doc.href} className="text-stone-600 underline underline-offset-4 hover:text-stone-900">
                {doc.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-stone-500">
          Вопросы по документам: <a href={`mailto:${OPERATOR.email}`} className="underline underline-offset-4">{OPERATOR.email}</a>
        </p>
      </nav>
    </main>
  );
}

/** Контакты оператора — одни и те же во всех документах. */
export function OperatorDetails() {
  return (
    <ul>
      <li>Сервис «Вместе», сайт <a href={SITE_URL}>{SITE_HOST}</a></li>
      <li>Электронная почта: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a></li>
    </ul>
  );
}
