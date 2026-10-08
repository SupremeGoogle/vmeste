"use client";

/** Возможности сервиса со скриншотами работающего приложения. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT, SPRING } from "@/components/motion/motion";
import { FeatureVisual } from "./feature-visual";

type Tab = {
  id: string;
  title: string;
  lead: string;
  points: string[];
  preview: "invite" | "rsvp" | "seating" | "qr" | "photos" | "raffle";
};

const TABS: Tab[] = [
  {
    id: "invite",
    title: "Приглашение",
    lead: "Своя страница у каждого гостя, собирается из блоков за вечер.",
    points: [
      "Обложка, расписание дня, дорога, дресс-код, подарки",
      "Ссылка именная: гость видит своё имя и отвечает в один тап",
      "Открывается на любом телефоне, весит меньше фотографии",
    ],
    preview: "invite",
  },
  {
    id: "rsvp",
    title: "Ответы гостей",
    lead: "Кто придёт, с кем и что ест — считается само.",
    points: [
      "Придёт / не придёт / пока не знает — и «плюс один» с именем",
      "Меню сразу в списке для ресторана",
      "Выгрузка в CSV и импорт списка из вашей таблицы",
    ],
    preview: "rsvp",
  },
  {
    id: "seating",
    title: "Рассадка",
    lead: "План зала мышью: столы круглые, прямоугольные, президиум.",
    points: [
      "Перетаскивание гостей и столов, места считаются по форме",
      "Значки невесты и жениха — видно, где сидят молодые",
      "Тот же план уходит в PDF и на печать без единого расхождения",
    ],
    preview: "seating",
  },
  {
    id: "qr",
    title: "Вход по QR",
    lead: "На входе один код на всех: гость находит себя по имени.",
    points: [
      "Поиск понимает «Настя» вместо «Анастасия» и опечатки",
      "В ответ — только имя и номер стола, чужих данных не видно",
      "Работает на бумажной табличке, без приложения и без вайфая гостя",
    ],
    preview: "qr",
  },
  {
    id: "photos",
    title: "Фото и альбом",
    lead: "Снимки гостей — в общей галерее, на экране в зале и в альбоме после свадьбы.",
    points: [
      "Гости загружают фотографии с телефона по своей ссылке",
      "Интеллектуальный фильтр анализирует снимки на контент 18+: подозрительные кадры ждут вашего одобрения и до него не видны гостям и на экране",
      "После свадьбы гости могут открыть альбом и скачать фотографии",
    ],
    preview: "photos",
  },
  {
    id: "raffle",
    title: "Розыгрыш",
    lead: "Барабан с именами гостей — и честный, проверяемый результат.",
    points: [
      "Участвуют гости с одобренными фотографиями",
      "Порядок задан заранее и повторяем: спорить не о чем",
      "Имя во весь экран — ведущему остаётся объявить",
    ],
    preview: "raffle",
  },
];

/** Те же вкладки по-английски: id и порядок совпадают с русскими. */
const TABS_EN: Tab[] = [
  {
    id: "invite",
    title: "Invitation",
    lead: "A personal page for every guest, put together from blocks in a single evening.",
    points: [
      "Cover, schedule for the day, directions, dress code, gifts",
      "A personal link: each guest sees their own name and replies with one tap",
      "Opens on any phone and weighs less than a photo",
    ],
    preview: "invite",
  },
  {
    id: "rsvp",
    title: "RSVPs",
    lead: "Who’s coming, with whom, and what they’ll eat — all tallied for you.",
    points: [
      "Coming / not coming / not sure yet — plus a named plus-one",
      "Meal choices land right in a list for the restaurant",
      "Export to CSV and import the list from your own spreadsheet",
    ],
    preview: "rsvp",
  },
  {
    id: "seating",
    title: "Seating",
    lead: "Lay out the floor plan with your mouse: round tables, long tables, a head table.",
    points: [
      "Drag guests and tables around — seats are counted by table shape",
      "Bride and groom icons show exactly where the newlyweds sit",
      "The very same plan goes to PDF and print, without a single discrepancy",
    ],
    preview: "seating",
  },
  {
    id: "qr",
    title: "QR check-in",
    lead: "One code at the entrance for everyone: guests find themselves by name.",
    points: [
      "Search understands short names — “Nastya” for “Anastasia” — and typos",
      "All it shows is a name and a table number — nobody else’s details",
      "Works from a printed sign — no app and no guest Wi-Fi needed",
    ],
    preview: "qr",
  },
  {
    id: "photos",
    title: "Photos & album",
    lead: "Guests’ shots go into a shared gallery, onto the screen at the venue, and into an album after the wedding.",
    points: [
      "Guests upload photos from their phones using their own link",
      "A smart filter checks every photo for 18+ content: anything suspicious waits for your approval and stays hidden from guests and the screen until then",
      "After the wedding, guests can open the album and download the photos",
    ],
    preview: "photos",
  },
  {
    id: "raffle",
    title: "Raffle",
    lead: "A spinning drum of guest names — and a fair, verifiable result.",
    points: [
      "Guests with approved photos take part",
      "The order is fixed in advance and reproducible, so there’s nothing to argue about",
      "The winner’s name fills the screen — all the host has to do is announce it",
    ],
    preview: "raffle",
  },
];

const AUTOPLAY_MS = 7000;

export function FeatureTabs({ lang = "ru" }: { lang?: "ru" | "en" }) {
  const tabs = lang === "en" ? TABS_EN : TABS;
  const [current, setCurrent] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const showFeature = (event: Event) => {
      const index = TABS.findIndex((item) => item.id === (event as CustomEvent).detail);
      if (index < 0) return;
      setCurrent(index);
      setManual(true);
    };
    window.addEventListener("vmeste:show-feature", showFeature);
    return () => window.removeEventListener("vmeste:show-feature", showFeature);
  }, []);

  useEffect(() => {
    if (manual) return;
    const timer = setInterval(() => setCurrent((value) => (value + 1) % TABS.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [manual]);

  const pick = (index: number) => {
    setCurrent(index);
    setManual(true);
  };

  const tab = tabs[current];

  return (
    // Картинка — на всю ширину под вкладками: в колонке сбоку макеты были
    // мелкими, и подписи на них не читались.
    <div className="feature-tabs grid gap-8 lg:gap-10">
      <div className="feature-tabs-info grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
      {/* `min-w-0` здесь обязателен, а не для красоты: ячейка сетки по
          умолчанию не даёт себя сжать меньше содержимого, и лента вкладок
          с горизонтальной прокруткой растягивала не себя, а всю страницу —
          на телефоне это была прокрутка вбок на четверть экрана. */}
      <div className="min-w-0">
        <div className="story-feature-tabrail -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {tabs.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => pick(index)}
              aria-pressed={index === current}
              className={`relative isolate shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm transition-colors duration-300 ${
                index === current
                  ? "border-stone-900 text-white"
                  : "border-stone-300 bg-white/60 text-stone-600 hover:border-stone-400"
              }`}
            >
              {index === current && (
                // Заливка одна на всю ленту и переезжает к выбранной вкладке.
                <motion.span aria-hidden layoutId="feature-pill" className="absolute inset-0 -z-10 bg-stone-900" transition={SPRING} />
              )}
              {item.title}
              {index === current && !manual && (
                // Полоска показывает, сколько осталось до следующей вкладки:
                // без неё самопереключение выглядит как сбой.
                <span
                  key={current}
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white/45"
                  style={{ animation: `marquee-progress ${AUTOPLAY_MS}ms linear forwards` }}
                />
              )}
            </button>
          ))}
        </div>

      </div>

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab.id}
          className="feature-tabs-copy min-w-0 lg:mt-0"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.22, ease: EASE_OUT } }}
        >
          <h3 className="font-serif text-2xl">{tab.title}</h3>
          <p className="mt-2 text-stone-600">{tab.lead}</p>
          <ul className="mt-5 space-y-3">
            {tab.points.map((point) => (
              <li key={point} className="flex gap-3 text-[15px] text-stone-700">
                <Check />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7">
            <Link href={lang === "en" ? "/register?lang=en" : "/register"} className="text-sm text-stone-900 underline underline-offset-4">
              {lang === "en" ? "Try it for your own wedding →" : "Попробовать на своей свадьбе →"}
            </Link>
          </p>
        </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mx-auto w-full max-w-[780px]">
        {/* Пятно-подложка вылезает за карточку — в этом и смысл. Но вбок
            вылезать ей нельзя: поля страницы на телефоне 16 px, и вылет
            в 24 px давал горизонтальную прокрутку — страница «дребезжала»
            под пальцем, хотя смотреть вбок там не на что.
            Поэтому вертикальный вылет полный, а боковой подогнан под поля:
            гнаться за каждой контрольной точкой бессмысленно, вниз и вверх
            прокрутка и так есть. */}
        <div className="absolute -inset-y-6 -inset-x-3 -z-10 rounded-[2rem] bg-gradient-to-br from-stone-100 to-transparent sm:-inset-x-4 xl:-inset-x-6" />
        <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={tab.id}
          // Не .card-lift: CSS-переход на transform сглаживал бы кадры Motion.
          className={tab.preview === "invite" ? "feature-invite-stage" : "rounded-2xl border border-stone-200 bg-white p-2 shadow-sm transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(64,56,51,0.45)] sm:p-3"}
          whileHover={{ y: -4, transition: SPRING }}
          initial={{ opacity: 0, scale: 0.96, y: 16, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT } }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25, ease: EASE_OUT } }}
        >
          <FeatureVisual kind={tab.preview} lang={lang} onOpen={() => pick(current)} />
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" className="mt-1 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#f3ede3" />
      <path d="M5.8 10.3 8.6 13l5.4-5.8" fill="none" stroke="#8b6f47" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
