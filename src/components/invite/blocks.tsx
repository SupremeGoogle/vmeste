/**
 * Отрисовка блоков приглашения.
 *
 * Всё здесь — серверные компоненты без единого обработчика: приглашение
 * читают, а не нажимают. Единственное действие — ссылка на форму ответа.
 * Никаких внешних ресурсов: ни шрифтов с CDN, ни встроенной карты. Карта
 * стоила бы +300 КБ и сторонних скриптов на странице, которую открывают
 * с телефона в дороге (см. блок MAP в `lib/invite-blocks.ts`).
 */
import type { BlockContentMap } from "@/lib/invite-blocks";
import type { InviteBlockView } from "@/server/repositories/invites";

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-lg px-6 py-8">
      {title ? (
        <h2 className="mb-4 text-center text-xl font-medium tracking-wide text-stone-800">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** Пользовательский текст: переносы строк сохраняем, разметку — нет. */
function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div className={`whitespace-pre-line text-center leading-relaxed text-stone-700 ${className}`}>
      {text}
    </div>
  );
}

function Cover({ content }: { content: BlockContentMap["COVER"] }) {
  return (
    <section className="relative">
      {content.imageUrl ? (
        // Обычный <img>, а не next/image: картинка приходит по внешней ссылке,
        // оптимизатор для неё потребовал бы настройки доменов и рантайма.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.imageUrl}
          alt=""
          className="h-72 w-full object-cover sm:h-96"
          loading="eager"
        />
      ) : null}
      <div className={content.imageUrl ? "px-6 py-8 text-center" : "px-6 pt-16 pb-8 text-center"}>
        {content.names ? (
          <p className="text-2xl font-light tracking-[0.2em] text-stone-800 uppercase">
            {content.names}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-medium text-stone-900">{content.title}</h1>
        {content.dateText ? (
          <p className="mt-3 text-lg text-stone-600">{content.dateText}</p>
        ) : null}
        <Paragraphs text={content.subtitle} className="mt-4" />
      </div>
    </section>
  );
}

function Timeline({ content }: { content: BlockContentMap["TIMELINE"] }) {
  return (
    <Section title={content.title}>
      <ol className="space-y-4">
        {content.items.map((item, index) => (
          <li key={index} className="flex gap-4">
            <span className="w-14 shrink-0 text-right font-mono text-sm text-stone-500">
              {item.time}
            </span>
            <span className="border-l border-stone-200 pl-4">
              <span className="block text-stone-900">{item.title}</span>
              {item.note ? <span className="block text-sm text-stone-500">{item.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Venue({ content }: { content: BlockContentMap["VENUE"] }) {
  return (
    <Section title={content.title}>
      {content.name ? (
        <p className="text-center text-lg text-stone-900">{content.name}</p>
      ) : null}
      <Paragraphs text={content.address} className="mt-1 text-sm" />
      <Paragraphs text={content.note} className="mt-4 text-sm" />
    </Section>
  );
}

function Dresscode({ content }: { content: BlockContentMap["DRESSCODE"] }) {
  return (
    <Section title={content.title}>
      <Paragraphs text={content.text} />
      {content.palette.length > 0 ? (
        <div className="mt-5 flex justify-center gap-3">
          {content.palette.map((color) => (
            <span
              key={color}
              className="h-9 w-9 rounded-full border border-stone-300"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function MapBlock({ content }: { content: BlockContentMap["MAP"] }) {
  const links = [
    { url: content.yandexUrl, label: "Яндекс Карты" },
    { url: content.googleUrl, label: "Google Maps" },
  ].filter((link) => link.url);

  return (
    <Section title={content.title}>
      <Paragraphs text={content.note} className="text-sm" />
      {links.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              rel="noreferrer noopener"
              target="_blank"
              className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-700"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function TextBlock({ content }: { content: BlockContentMap["TEXT"] }) {
  return (
    <Section title={content.title || undefined}>
      <Paragraphs text={content.text} />
    </Section>
  );
}

function RsvpCall({
  content,
  href,
  answered,
}: {
  content: BlockContentMap["RSVP_FORM"];
  href: string | null;
  answered: string | null;
}) {
  return (
    <Section title={content.title}>
      <Paragraphs text={content.text} />
      {answered ? (
        <p className="mt-5 text-center text-stone-700">
          Ваш ответ: <b>{answered}</b>
          {href ? (
            <>
              {" · "}
              <a href={href} className="underline">
                изменить
              </a>
            </>
          ) : null}
        </p>
      ) : href ? (
        <div className="mt-5 text-center">
          <a
            href={href}
            className="inline-block rounded-full bg-stone-900 px-8 py-3 text-white"
          >
            {content.buttonLabel}
          </a>
        </div>
      ) : (
        // Общая ссылка без токена: отвечать некому — гость неизвестен.
        <p className="mt-5 text-center text-sm text-stone-500">
          Ответить можно по именной ссылке из приглашения.
        </p>
      )}
    </Section>
  );
}

export function InviteBlocks({
  blocks,
  rsvpHref,
  answered,
}: {
  blocks: InviteBlockView[];
  /** Ссылка на форму ответа. null на неименной странице. */
  rsvpHref: string | null;
  /** Уже данный ответ — «Придём» / «Не сможем». */
  answered: string | null;
}) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "COVER":
            return <Cover key={block.id} content={block.content as BlockContentMap["COVER"]} />;
          case "TIMELINE":
            return (
              <Timeline key={block.id} content={block.content as BlockContentMap["TIMELINE"]} />
            );
          case "VENUE":
            return <Venue key={block.id} content={block.content as BlockContentMap["VENUE"]} />;
          case "DRESSCODE":
            return (
              <Dresscode key={block.id} content={block.content as BlockContentMap["DRESSCODE"]} />
            );
          case "MAP":
            return <MapBlock key={block.id} content={block.content as BlockContentMap["MAP"]} />;
          case "TEXT":
            return <TextBlock key={block.id} content={block.content as BlockContentMap["TEXT"]} />;
          case "RSVP_FORM":
            return (
              <RsvpCall
                key={block.id}
                content={block.content as BlockContentMap["RSVP_FORM"]}
                href={rsvpHref}
                answered={answered}
              />
            );
        }
      })}
    </>
  );
}
