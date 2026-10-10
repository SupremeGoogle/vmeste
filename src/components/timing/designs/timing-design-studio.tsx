"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type Ref } from "react";
import styles from "./timing-design-studio.module.css";
import { printTimingSheet } from "./print-timing-sheet";

export type TimingDesign = "botanical" | "letter" | "modern" | "tuscany";
export type TimingDesignStep = { id: string; time: string; title: string; dateLabel?: string };
export type TimingDesignStudioProps = {
  eventId: string;
  title: string;
  dateLabel: string;
  lang: "ru" | "en";
  steps: TimingDesignStep[];
};

const designs = ["botanical", "letter", "modern", "tuscany"] as const;
const selectionEvent = "vmeste:timing-design";
const memoryChoices = new Map<string, TimingDesign>();
const getServerChoice = (): TimingDesign => "botanical";

const copy = {
  ru: {
    heading: "Оформление тайминга",
    collection: "4 авторских стиля",
    eyebrow: "Маленькие детали. Большой день.",
    title: "У вашего дня есть свой почерк",
    description: "Превратите расписание в красивую программу праздника — для гостей, команды и на память.",
    choose: "Выберите оформление",
    selected: "Выбрано",
    preview: "Ваша программа",
    example: "Пример программы",
    exampleNote: "Это пример: этапов в вашем плане пока нет. Добавьте их ниже — здесь появится ваше расписание.",
    localNote: "Выбор оформления сохраняется в этом браузере для этого мероприятия.",
    print: "Печать / PDF",
    printing: "Готовим к печати…",
    printHint: "В окне печати можно выбрать «Сохранить как PDF». Для цветной бумаги включите печать фона.",
    printError: "Не удалось подготовить печать. Попробуйте ещё раз после загрузки страницы.",
    storageError: "Браузер не разрешил сохранить выбор. Стиль будет доступен, пока открыта страница.",
    announcement: (name: string) => `Выбрано оформление «${name}».`,
    program: "Программа дня",
    wedding: "День, который мы запомним",
    together: "Самое важное — быть вместе",
    welcome: "Рады разделить этот день с вами",
    weddingDay: "Наш свадебный день",
    exampleTitle: "Александра и Михаил",
    designNames: { botanical: "Тихий сад", letter: "Любовное письмо", modern: "Современная классика", tuscany: "Солнечная Тоскана" },
    designNotes: { botanical: "Акварельная зелень · нежная арка", letter: "Шёлковый бант · винтажная рамка", modern: "Чистая типографика · тонкие линии", tuscany: "Кобальтовая керамика · лимоны" },
    steps: ["Сбор гостей и приветственные напитки", "Церемония под открытым небом", "Общие фотографии и немного объятий", "Праздничный ужин", "Первый танец", "Свадебный торт и пожелания"],
  },
  en: {
    heading: "Timeline design",
    collection: "4 signature styles",
    eyebrow: "Little details. A wonderful day.",
    title: "A day with your own signature",
    description: "Turn your timeline into a beautiful wedding programme — for your guests, your team and your memories.",
    choose: "Choose a design",
    selected: "Selected",
    preview: "Your programme",
    example: "Sample programme",
    exampleNote: "This is a sample: your plan has no steps yet. Add them below and your own timeline will appear here.",
    localNote: "Your design choice is saved in this browser for this event.",
    print: "Print / PDF",
    printing: "Preparing to print…",
    printHint: "Choose “Save as PDF” in the print dialog. Enable background graphics to include the paper colour.",
    printError: "We couldn’t prepare your programme for printing. Please try again once the page has loaded.",
    storageError: "Your browser couldn’t save this choice. The design will remain available while this page is open.",
    announcement: (name: string) => `Selected the “${name}” design.`,
    program: "Order of the day",
    wedding: "A day to remember",
    together: "The best part is being together",
    welcome: "So glad to share this day with you",
    weddingDay: "Our wedding day",
    exampleTitle: "Alexandra & Michael",
    designNames: { botanical: "The Quiet Garden", letter: "A Love Letter", modern: "Modern Classic", tuscany: "Tuscan Sunshine" },
    designNotes: { botanical: "Watercolour greenery · a graceful arch", letter: "Silk ribbon · a vintage frame", modern: "Expressive type · fine lines", tuscany: "Cobalt ceramics · sunlit lemons" },
    steps: ["Welcome drinks and warm hellos", "An open-air ceremony", "Group photographs and a few hugs", "Wedding dinner", "Our first dance", "Wedding cake and wishes"],
  },
} as const;

function isDesign(value: unknown): value is TimingDesign {
  return typeof value === "string" && designs.some((design) => design === value);
}

function readChoice(key: string): TimingDesign {
  const memory = memoryChoices.get(key);
  if (memory) return memory;
  try {
    const saved = window.localStorage.getItem(key);
    if (isDesign(saved)) return saved;
  } catch {
    // Private mode and storage policies must not prevent previewing a design.
  }
  return memoryChoices.get(key) ?? "botanical";
}

function useDesignChoice(eventId: string) {
  const key = `vmeste:timing-design:v1:${eventId}`;
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      memoryChoices.set(key, isDesign(event.newValue) ? event.newValue : "botanical");
      notify();
    };
    const onSelection = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(selectionEvent, onSelection);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(selectionEvent, onSelection);
    };
  }, [key]);
  const getSnapshot = useCallback(() => readChoice(key), [key]);
  const selected = useSyncExternalStore(subscribe, getSnapshot, getServerChoice);
  const choose = useCallback((design: TimingDesign) => {
    let saved = true;
    memoryChoices.set(key, design);
    try {
      window.localStorage.setItem(key, design);
    } catch {
      saved = false;
    }
    window.dispatchEvent(new CustomEvent(selectionEvent, { detail: key }));
    return saved;
  }, [key]);
  return [selected, choose] as const;
}

function sampleSteps(lang: "ru" | "en"): TimingDesignStep[] {
  const times = lang === "ru"
    ? ["15:00", "15:30", "16:00", "17:00", "19:00", "21:00"]
    : ["3:00 PM", "3:30 PM", "4:00 PM", "5:00 PM", "7:00 PM", "9:00 PM"];
  return copy[lang].steps.map((title, index) => ({ id: `sample-${index}`, title, time: times[index] }));
}

/** Preserve the supplied order, including days that cross midnight. */
function groupDays(steps: TimingDesignStep[], fallback: string) {
  const groups: { date: string; steps: TimingDesignStep[] }[] = [];
  for (const step of steps) {
    const date = step.dateLabel ?? fallback;
    const last = groups.at(-1);
    if (last?.date === date) last.steps.push(step);
    else groups.push({ date, steps: [step] });
  }
  return groups;
}

function Rings({ className }: { className?: string }) {
  return <svg className={className} width="40" height="30" viewBox="0 0 40 30" fill="none" aria-hidden="true"><circle cx="14" cy="18" r="9" stroke="currentColor" strokeWidth="1.2" /><circle cx="26" cy="18" r="9" stroke="currentColor" strokeWidth="1.2" /><path d="m23 6 3-4 3 4-3 4-3-4Z" stroke="currentColor" strokeWidth="1.1" /><path d="M11 5h6M14 2v6" stroke="currentColor" strokeWidth="1.1" /></svg>;
}

function Flourish() {
  return <svg className={styles.flourish} width="110" height="20" viewBox="0 0 110 20" fill="none" aria-hidden="true"><path d="M4 10h37m28 0h37M45 10l10-6 10 6-10 6-10-6Z" stroke="currentColor" strokeWidth=".8" /><circle cx="55" cy="10" r="1.5" fill="currentColor" /></svg>;
}

function Miniature({ design }: { design: TimingDesign }) {
  return <span className={`${styles.miniature} ${styles[`mini_${design}`]}`} aria-hidden="true">
    <span className={styles.miniArt} />
    <span className={styles.miniFrame} />
    <span className={styles.miniMark}>{design === "modern" ? "&" : design === "tuscany" ? "✦" : "♡"}</span>
    <span className={styles.miniTitle} />
    <span className={styles.miniSubtitle} />
    <span className={styles.miniLines}><i /><i /><i /></span>
  </span>;
}

export type TimingDesignPreviewProps = Pick<TimingDesignStudioProps, "title" | "dateLabel" | "lang" | "steps"> & {
  design: TimingDesign;
  isExample?: boolean;
  ref?: Ref<HTMLElement>;
};

/** Printable presentation only: it never edits or creates event steps. */
export function TimingDesignPreview({ title, dateLabel, lang, steps, design, isExample = false, ref }: TimingDesignPreviewProps) {
  const t = copy[lang];
  const days = groupDays(steps, dateLabel);
  return <article ref={ref} className={`${styles.sheet} ${styles[design]}`} data-timing-sheet data-design={design} lang={lang}>
    <div className={styles.paperFrame} aria-hidden="true" />
    <div className={styles.artTop} aria-hidden="true" />
    <div className={styles.artBottom} aria-hidden="true" />
    <header className={styles.sheetHeader}>
      <p className={styles.sheetEyebrow}>{t.wedding}</p>
      <div className={styles.sheetEmblem} aria-hidden="true">{design === "modern" ? <span>&</span> : <Rings />}</div>
      <h4 className={styles.eventTitle}>{title || t.weddingDay}</h4>
      {dateLabel ? <p className={styles.sheetDate}>{dateLabel}</p> : null}
      <Flourish />
      <p className={styles.programTitle}>{t.program}</p>
      {isExample ? <p className={styles.sampleBadge}>{t.example}</p> : null}
    </header>
    <div className={styles.days}>
      {days.map((day, dayIndex) => <section className={styles.day} key={`${day.date}-${dayIndex}`}>
        {days.length > 1 && day.date ? <h5 className={styles.dayHeading}>{day.date}</h5> : null}
        <ol className={styles.stepList}>
          {day.steps.map((step, index) => <li className={styles.step} key={step.id}>
            <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.stepTime}>{step.time}</span>
            <span className={styles.stepDot} aria-hidden="true" />
            <span className={styles.stepTitle}>{step.title}</span>
          </li>)}
        </ol>
      </section>)}
    </div>
    <footer className={styles.sheetFooter}>
      <span className={styles.footerSymbol} aria-hidden="true">{design === "modern" ? "✳" : design === "tuscany" ? "✦" : "♡"}</span>
      <p>{t.together}</p>
      <span>{t.welcome}</span>
    </footer>
  </article>;
}

export function TimingDesignStudio({ eventId, title, dateLabel, lang, steps }: TimingDesignStudioProps) {
  const t = copy[lang];
  const radioName = useId();
  const hintId = useId();
  const [design, choose] = useDesignChoice(eventId);
  const [announcement, setAnnouncement] = useState("");
  const [storageFailed, setStorageFailed] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const printCleanup = useRef<(() => void) | null>(null);
  const printingRef = useRef(false);
  const mounted = useRef(true);
  const isExample = steps.length === 0;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      printCleanup.current?.();
    };
  }, []);

  async function print() {
    if (!sheetRef.current || printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    setPrintError(false);
    printCleanup.current?.();
    try {
      const cleanup = await printTimingSheet(sheetRef.current, title || t.weddingDay, lang);
      if (mounted.current) printCleanup.current = cleanup;
      else cleanup();
    } catch {
      if (mounted.current) setPrintError(true);
    } finally {
      printingRef.current = false;
      if (mounted.current) setPrinting(false);
    }
  }

  return <details className={styles.studio} open>
    <summary className={styles.summary}>
      <span className={styles.summaryIcon} aria-hidden="true"><Rings /></span>
      <span>{t.heading}</span>
      <span className={styles.collection}>{t.collection}</span>
      <span className={styles.caret} aria-hidden="true" />
    </summary>
    <div className={styles.studioBody}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h3>{t.title}</h3>
        <p className={styles.description}>{t.description}</p>
      </header>
      <fieldset className={styles.choices} aria-describedby={hintId}>
        <legend className={styles.visuallyHidden}>{t.choose}</legend>
        <div className={styles.choiceGrid}>
          {designs.map((item, index) => <label className={styles.choice} key={item}>
            <input className={styles.radio} type="radio" name={radioName} value={item} checked={design === item} onChange={() => {
              const saved = choose(item);
              setStorageFailed(!saved);
              setAnnouncement(t.announcement(t.designNames[item]));
            }} />
            <span className={styles.choiceCard}>
              <Miniature design={item} />
              <span className={styles.choiceText}>
                <span className={styles.choiceIndex}>0{index + 1}</span>
                <span className={styles.choiceName}>{t.designNames[item]}</span>
                <span className={styles.choiceNote}>{t.designNotes[item]}</span>
              </span>
              <span className={styles.checkmark} aria-hidden="true">✓</span>
              {design === item ? <span className={styles.visuallyHidden}>{t.selected}</span> : null}
            </span>
          </label>)}
        </div>
      </fieldset>
      <p id={hintId} className={styles.localNote}>{storageFailed ? t.storageError : t.localNote}</p>
      <p className={styles.visuallyHidden} role="status" aria-live="polite">{announcement}</p>
      <div className={styles.previewBar}>
        <div><span className={styles.previewLabel}>{isExample ? t.example : t.preview}</span><span className={styles.previewName}>{t.designNames[design]}</span></div>
        <button type="button" className={styles.printButton} onClick={print} disabled={printing}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M17 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          {printing ? t.printing : t.print}
        </button>
      </div>
      {isExample ? <p className={styles.exampleNote}>{t.exampleNote}</p> : null}
      <div className={styles.previewSurface}>
        <TimingDesignPreview ref={sheetRef} design={design} title={title || (isExample ? t.exampleTitle : t.weddingDay)} dateLabel={dateLabel} lang={lang} steps={isExample ? sampleSteps(lang) : steps} isExample={isExample} />
      </div>
      <p className={styles.printHint}>{t.printHint}</p>
      {printError ? <p role="alert" className={styles.error}>{t.printError}</p> : null}
    </div>
  </details>;
}
