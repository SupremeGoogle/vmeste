import Image from "next/image";
import { shuffledTemplates } from "@/lib/invite-templates";
import { Reveal } from "./reveal";

function preview(id: string) {
  return `/media/template-previews/${id}.webp`;
}

/** Витрина и полный каталог всегда используют актуальный список шаблонов. */
export function InviteShowcase() {
  // Порядок случайный при каждом показе — один и тот же для ленты и каталога.
  const PICKABLE_TEMPLATES = shuffledTemplates();
  return <>
    <Reveal delay={120} className="home-marquee">
      <ul className="home-phones" aria-label="Примеры приглашений">
        {[...PICKABLE_TEMPLATES, ...PICKABLE_TEMPLATES].map((template, index) => {
          const copy = index >= PICKABLE_TEMPLATES.length;
          return <li key={`${template.id}-${index}`} className="home-phone-item" aria-hidden={copy || undefined}>
            <a href={`/templates/${template.id}`} target="_blank" rel="noopener noreferrer" className="home-phone" tabIndex={copy ? -1 : undefined} aria-label={copy ? undefined : `Открыть приглашение «${template.name}»`}>
              <span className="home-phone-screen"><Image src={preview(template.id)} alt={copy ? "" : `Приглашение «${template.name}»`} fill unoptimized sizes="(max-width: 560px) 156px, 250px" /></span>
            </a>
          </li>;
        })}
      </ul>
    </Reveal>
    <div className="home-container">
      <details className="home-invite-catalog">
        <summary className="home-button home-button--light">
          <span className="invite-catalog-open">Посмотреть все приглашения</span>
          <span className="invite-catalog-close">Свернуть каталог</span>
          <span className="invite-catalog-count">{PICKABLE_TEMPLATES.length}</span>
          <span className="invite-catalog-arrow" aria-hidden="true">↓</span>
        </summary>
        <div className="invite-catalog-grid" aria-label="Все шаблоны приглашений">
          {PICKABLE_TEMPLATES.map(template => <a key={template.id} className="invite-catalog-card" href={`/templates/${template.id}`} target="_blank" rel="noopener noreferrer">
            <span className="invite-catalog-preview"><Image src={preview(template.id)} alt={`Первый экран приглашения «${template.name}»`} width={400} height={810} unoptimized sizes="(max-width: 560px) 40vw, (max-width: 860px) 28vw, 230px" /></span>
            <span className="invite-catalog-name">{template.name}<span aria-hidden="true">↗</span></span>
            <span className="invite-catalog-mood">{template.mood}</span>
          </a>)}
        </div>
      </details>
    </div>
  </>;
}
