import Image from "next/image";
import { shuffledTemplates } from "@/lib/invite-templates";
import { Reveal } from "./reveal";
import { TEMPLATE_COPY_EN } from "./templates-en";

const TEXT = {
  ru: {
    phones: "Примеры приглашений", open: (name: string) => `Открыть приглашение «${name}»`, alt: (name: string) => `Приглашение «${name}»`,
    all: "Посмотреть все приглашения", collapse: "Свернуть каталог", catalog: "Все шаблоны приглашений", first: (name: string) => `Первый экран приглашения «${name}»`,
  },
  en: {
    phones: "Sample invitations", open: (name: string) => `Open the “${name}” invitation`, alt: (name: string) => `The “${name}” invitation`,
    all: "See all invitations", collapse: "Show fewer", catalog: "All invitation templates", first: (name: string) => `Opening screen of the “${name}” invitation`,
  },
};

function preview(id: string) {
  return `/media/template-previews/${id}.webp`;
}

/** Витрина и полный каталог всегда используют актуальный список шаблонов. */
export function InviteShowcase({ lang = "ru" }: { lang?: "ru" | "en" }) {
  const t = TEXT[lang];
  // Порядок случайный при каждом показе — один и тот же для ленты и каталога.
  // По-английски названия и описания — из своего словаря (шаблоны сами русские).
  const PICKABLE_TEMPLATES = shuffledTemplates().map((template) => {
    const en = lang === "en" ? TEMPLATE_COPY_EN[template.id] : undefined;
    return en ? { ...template, name: en.name, mood: en.mood } : template;
  });
  return <>
    <Reveal delay={120} className="home-marquee">
      <ul className="home-phones" aria-label={t.phones}>
        {[...PICKABLE_TEMPLATES, ...PICKABLE_TEMPLATES].map((template, index) => {
          const copy = index >= PICKABLE_TEMPLATES.length;
          return <li key={`${template.id}-${index}`} className="home-phone-item" aria-hidden={copy || undefined}>
            <a href={`/templates/${template.id}`} target="_blank" rel="noopener noreferrer" className="home-phone" tabIndex={copy ? -1 : undefined} aria-label={copy ? undefined : t.open(template.name)}>
              <span className="home-phone-screen"><Image src={preview(template.id)} alt={copy ? "" : t.alt(template.name)} fill unoptimized sizes="(max-width: 560px) 156px, 250px" /></span>
            </a>
          </li>;
        })}
      </ul>
    </Reveal>
    <div className="home-container">
      <details className="home-invite-catalog">
        <summary className="home-button home-button--light">
          <span className="invite-catalog-open">{t.all}</span>
          <span className="invite-catalog-close">{t.collapse}</span>
          <span className="invite-catalog-count">{PICKABLE_TEMPLATES.length}</span>
          <span className="invite-catalog-arrow" aria-hidden="true">↓</span>
        </summary>
        <div className="invite-catalog-grid" aria-label={t.catalog}>
          {PICKABLE_TEMPLATES.map(template => <a key={template.id} className="invite-catalog-card" href={`/templates/${template.id}`} target="_blank" rel="noopener noreferrer">
            <span className="invite-catalog-preview"><Image src={preview(template.id)} alt={t.first(template.name)} width={400} height={810} unoptimized sizes="(max-width: 560px) 40vw, (max-width: 860px) 28vw, 230px" /></span>
            <span className="invite-catalog-name">{template.name}<span aria-hidden="true">↗</span></span>
            <span className="invite-catalog-mood">{template.mood}</span>
          </a>)}
        </div>
      </details>
    </div>
  </>;
}
