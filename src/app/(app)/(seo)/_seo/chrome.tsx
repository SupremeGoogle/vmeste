/**
 * Шапка, хлебные крошки и подвал открытых материалов (лендинги и блог).
 *
 * Без клиентского JS: на телефоне разделы шапки — прокручиваемая строка
 * под логотипом, а не меню-бургер. Стиль — тот же, что у титульной
 * (палитра и шрифты из _landing/home.css и clay.css).
 */
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import type { Lang } from "@/lib/i18n";
import { SEO_NAV } from "@/content/nav";
import { ARTICLES, articlePath } from "@/content/blog";
import "../../_landing/home.css";
import "../../_landing/clay.css";
import "./seo.css";

export function SeoShell({ lang, alternate, children }: { lang: Lang; alternate?: string; children: React.ReactNode }) {
  return (
    <div className="home home--clay seo">
      <SeoHeader lang={lang} alternate={alternate} />
      {children}
      <SeoFooter lang={lang} />
    </div>
  );
}

function SeoHeader({ lang, alternate }: { lang: Lang; alternate?: string }) {
  const nav = SEO_NAV[lang];
  const other = lang === "en" ? "ru" : "en";
  return (
    <header className="seo-nav">
      <div className="home-container seo-nav-bar">
        <Link href={nav.home} className="home-brand" aria-label={nav.homeLabel}>
          <BrandLogo size={40} adaptive={false} />
        </Link>
        <nav className="seo-nav-links" aria-label={nav.sections}>
          {[...nav.landings, nav.blog].map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <div className="seo-nav-actions">
          <Link href={alternate ?? nav.otherLang.fallback} hrefLang={other} lang={other} className="seo-lang" title={nav.otherLang.name}>
            {nav.otherLang.label}
          </Link>
          <Link href={nav.register.href} className="home-button seo-nav-cta">{nav.register.label}</Link>
        </div>
      </div>
    </header>
  );
}

export function Breadcrumbs({ lang, items }: { lang: Lang; items: { name: string; href?: string }[] }) {
  return (
    <nav className="seo-crumbs" aria-label={SEO_NAV[lang].crumbs}>
      <ol>
        {items.map((item, index) => (
          <li key={item.name}>
            {item.href && index < items.length - 1 ? <Link href={item.href}>{item.name}</Link> : <span aria-current="page">{item.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SeoFooter({ lang }: { lang: Lang }) {
  const nav = SEO_NAV[lang];
  const t = nav.footer;
  return (
    <footer className="home-footer seo-footer">
      <div className="home-container">
        <div className="home-footer-grid">
          <div>
            <Link href={nav.home} className="home-brand" aria-label={nav.homeLabel}>
              <BrandLogo size={52} adaptive={false} />
            </Link>
            <p>{t.tagline}</p>
          </div>
          <div>
            <h2 className="seo-footer-h">{t.product}</h2>
            <ul>
              {nav.landings.map((link) => (
                <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
              ))}
              <li><Link href={lang === "en" ? "/en#vozmozhnosti" : "/#vozmozhnosti"}>{t.features}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="seo-footer-h">{t.articles}</h2>
            <ul>
              {ARTICLES[lang].slice(0, 4).map((article) => (
                <li key={article.slug}><Link href={articlePath(lang, article.slug)}>{article.short}</Link></li>
              ))}
              <li><Link href={nav.blog.href}>{lang === "en" ? "All articles" : "Все статьи"}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="seo-footer-h">{t.account}</h2>
            <ul>
              <li><Link href={nav.login.href}>{nav.login.label}</Link></li>
              <li><Link href={nav.register.href}>{nav.register.label}</Link></li>
            </ul>
            <h2 className="seo-footer-h seo-footer-h--spaced">{t.legal}</h2>
            <ul>
              {nav.legal.map((link) => (
                <li key={link.href}><Link href={link.href} hrefLang={lang === "en" ? "ru" : undefined}>{link.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="home-footer-bottom">
          <span>© {new Date().getFullYear()} {t.brand}</span>
          <span>{t.motto}</span>
        </div>
      </div>
    </footer>
  );
}
