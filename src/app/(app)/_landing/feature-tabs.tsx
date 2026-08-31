"use client";

/**
 * Возможности: слева список, справа макет экрана.
 *
 * Почему макеты нарисованы разметкой, а не сняты скриншотами: скриншот
 * устаревает в тот день, когда меняется кнопка, весит сотни килобайт и
 * плохо читается на телефоне. Нарисованный макет живёт в той же палитре,
 * что и настоящая панель, и весит ноль.
 *
 * Вкладки сами переключаются раз в семь секунд, пока человек не тронул их
 * сам: страницу часто листают без единого клика, и статичная картинка не
 * покажет и шестой части продукта.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "./photo";

type Tab = {
  id: string;
  title: string;
  lead: string;
  points: string[];
  preview: "invite" | "rsvp" | "seating" | "qr" | "screen" | "raffle";
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
      "Меню и аллергии сразу в списке для ресторана",
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
    id: "screen",
    title: "Экран в зале",
    lead: "Фотографии гостей на проекторе — после вашего одобрения.",
    points: [
      "Гость снимает и отправляет со своего телефона",
      "Модерация горячими клавишами: одобрить, отклонить, дальше",
      "Экран обновляется за секунду, без перезагрузки страницы",
    ],
    preview: "screen",
  },
  {
    id: "raffle",
    title: "Розыгрыш",
    lead: "Барабан с именами гостей — и честный, проверяемый результат.",
    points: [
      "Участвуют только пришедшие, победитель второй раз не выпадает",
      "Порядок задан заранее и повторяем: спорить не о чем",
      "Имя во весь экран — ведущему остаётся объявить",
    ],
    preview: "raffle",
  },
];

const AUTOPLAY_MS = 7000;

/**
 * Снимки для макетов. Приходят пропсом, а не читаются здесь: этот
 * компонент клиентский, а поиск файлов на диске — серверное дело.
 */
export type FeaturePhotos = {
  backdrop: string | null;
  screen: (string | null)[];
  raffle: string | null;
};

export function FeatureTabs({ photos }: { photos: FeaturePhotos }) {
  const [current, setCurrent] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual) return;
    const timer = setInterval(() => setCurrent((value) => (value + 1) % TABS.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [manual]);

  const pick = (index: number) => {
    setCurrent(index);
    setManual(true);
  };

  const tab = TABS[current];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
      {/* `min-w-0` здесь обязателен, а не для красоты: ячейка сетки по
          умолчанию не даёт себя сжать меньше содержимого, и лента вкладок
          с горизонтальной прокруткой растягивала не себя, а всю страницу —
          на телефоне это была прокрутка вбок на четверть экрана. */}
      <div className="min-w-0">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {TABS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => pick(index)}
              aria-pressed={index === current}
              className={`relative shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm transition-colors ${
                index === current
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white/60 text-stone-600 hover:border-stone-400"
              }`}
            >
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

        <div key={tab.id} className="reveal mt-8" data-shown="true">
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
            <Link href="/register" className="text-sm text-stone-900 underline underline-offset-4">
              Попробовать на своей свадьбе →
            </Link>
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Пятно-подложка вылезает за карточку — в этом и смысл. Но вбок
            вылезать ей нельзя: поля страницы на телефоне 16 px, и вылет
            в 24 px давал горизонтальную прокрутку — страница «дребезжала»
            под пальцем, хотя смотреть вбок там не на что.
            Поэтому вертикальный вылет полный, а боковой подогнан под поля:
            гнаться за каждой контрольной точкой бессмысленно, вниз и вверх
            прокрутка и так есть. */}
        <div className="absolute -inset-y-6 -inset-x-3 -z-10 rounded-[2rem] bg-gradient-to-br from-stone-100 to-transparent sm:-inset-x-4 xl:-inset-x-6" />
        <div key={tab.id} className="card-lift rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-6">
          {tab.preview === "invite" && <InvitePreview backdrop={photos.backdrop} />}
          {tab.preview === "rsvp" && <RsvpPreview />}
          {tab.preview === "seating" && <SeatingPreview />}
          {tab.preview === "qr" && <QrPreview />}
          {tab.preview === "screen" && <ScreenPreview photos={photos.screen} />}
          {tab.preview === "raffle" && <RafflePreview backdrop={photos.raffle} />}
        </div>
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

/* ── Макеты ─────────────────────────────────────────────────── */

/** Телефон на подложке-фотографии: пустой белый прямоугольник в этом
 *  месте выглядел как макет в редакторе, а не как страница о свадьбе. */
function PhoneFrame({ children, backdrop }: { children: React.ReactNode; backdrop: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-stone-100">
      <Photo src={backdrop} alt="" className="absolute inset-0 h-full w-full opacity-45" />
      <div className="relative mx-auto my-4 w-[236px] rounded-[2rem] border-[6px] border-stone-800/90 bg-[#fffdf9] p-4 shadow-xl sm:w-[260px]">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-stone-300" />
        {children}
      </div>
    </div>
  );
}

function InvitePreview({ backdrop }: { backdrop: string | null }) {
  return (
    <PhoneFrame backdrop={backdrop}>
      <div className="text-center">
        <p className="text-[10px] tracking-[0.25em] text-stone-500 uppercase">15 августа</p>
        <p className="mt-2 font-serif text-2xl">Аня и Миша</p>
        <div className="mx-auto my-3 h-px w-10 bg-stone-200" />
        <p className="text-xs text-stone-600">Усадьба «Рябинка», 16:00</p>
      </div>
      <div className="mt-4 space-y-2">
        {[
          ["16:00", "Сбор гостей"],
          ["17:00", "Церемония"],
          ["18:30", "Ужин"],
        ].map(([time, what]) => (
          <div key={time} className="flex gap-3 rounded-lg bg-stone-50 px-3 py-2 text-xs">
            <span className="font-mono text-stone-500">{time}</span>
            <span className="text-stone-700">{what}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-stone-200 p-3 text-center">
        <p className="text-xs text-stone-600">Ирина, вы придёте?</p>
        <div className="mt-2 flex gap-2">
          <span className="flex-1 rounded-md bg-stone-900 px-2 py-1.5 text-[11px] text-white">Приду</span>
          <span className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-[11px] text-stone-600">
            Не смогу
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}

function RsvpPreview() {
  const guests = [
    ["Ирина Соколова", "Придёт", "рыба"],
    ["Павел Крылов", "Придёт", "мясо"],
    ["Мария Гринёва", "Не знает", "—"],
    ["Тимур Асланов", "Не сможет", "—"],
  ];

  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="font-serif text-lg">Ответы гостей</p>
        <p className="text-xs text-stone-500">68 из 84</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full w-[81%] rounded-full bg-stone-900" />
      </div>
      <div className="mt-5 space-y-2">
        {guests.map(([name, status, meal]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          >
            <span className="text-stone-800">{name}</span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-stone-500">{meal}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                  status === "Придёт"
                    ? "bg-stone-100 text-stone-700"
                    : status === "Не знает"
                      ? "bg-amber-50 text-amber-900"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {status}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["61", "придут"],
          ["12", "с парой"],
          ["7", "детей"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg bg-stone-50 py-2.5">
            <p className="tile-value text-xl">{value}</p>
            <p className="text-[11px] text-stone-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatingPreview() {
  return (
    <div>
      <p className="font-serif text-lg">План зала</p>
      <svg viewBox="0 0 320 200" className="mt-3 w-full" role="img" aria-label="Пример плана зала">
        <rect width="320" height="200" rx="12" fill="#faf7f2" />
        <circle cx="82" cy="72" r="30" fill="#fffdf9" stroke="#d8ccbb" />
        <text x="82" y="76" textAnchor="middle" fontSize="11" fill="#7c7168">Стол 1</text>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={index}
              cx={82 + Math.cos(angle) * 44}
              cy={72 + Math.sin(angle) * 44}
              r="7"
              fill={index === 0 || index === 1 ? "#8b6f47" : "#e6ddd1"}
            />
          );
        })}
        <rect x="180" y="46" width="106" height="46" rx="8" fill="#fffdf9" stroke="#d8ccbb" />
        <text x="233" y="74" textAnchor="middle" fontSize="11" fill="#7c7168">Стол 2</text>
        {[0, 1, 2, 3].map((index) => (
          <circle key={`t${index}`} cx={196 + index * 27} cy="34" r="7" fill="#e6ddd1" />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle key={`b${index}`} cx={196 + index * 27} cy="104" r="7" fill="#e6ddd1" />
        ))}
        <rect x="96" y="146" width="128" height="30" rx="6" fill="#fffdf9" stroke="#d8ccbb" />
        <text x="160" y="165" textAnchor="middle" fontSize="10" fill="#7c7168">Президиум</text>
      </svg>
      <p className="mt-2 text-xs text-stone-500">
        Золотом отмечены места молодожёнов. Форму стола выбираете вы.
      </p>
    </div>
  );
}

function QrPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-stone-200 p-4 text-center">
        <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Табличка на входе</p>
        <div className="mx-auto mt-3 grid w-28 grid-cols-7 gap-0.5">
          {Array.from({ length: 49 }, (_, index) => (
            <span
              key={index}
              className={`aspect-square rounded-[1px] ${
                // Псевдослучайный, но одинаковый на сервере и клиенте узор:
                // настоящий QR тут не нужен, а расхождение разметки нужно ещё меньше.
                (index * 7 + (index % 5) * 3) % 3 === 0 ? "bg-stone-800" : "bg-stone-100"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-sm tracking-widest text-stone-600">ANMI-15</p>
      </div>
      <div className="rounded-xl bg-stone-50 p-4">
        <p className="text-xs text-stone-500">Гость набирает</p>
        <div className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Настя</div>
        <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
          <p className="font-serif text-lg">Анастасия Петрова</p>
          <p className="mt-1 text-sm text-stone-600">Стол 3 · место 5</p>
        </div>
        <p className="mt-3 text-[11px] text-stone-500">
          Больше о госте не показывается ничего — ни телефона, ни списка.
        </p>
      </div>
    </div>
  );
}

function ScreenPreview({ photos }: { photos: (string | null)[] }) {
  return (
    <div>
      <div className="rounded-xl bg-stone-950 p-3">
        {/* Экран в зале показывает снимки гостей — здесь на их месте
            стоят фотографии из галереи. */}
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, index) => (
            <div key={index} className="overflow-hidden rounded-md bg-stone-800">
              <Photo src={src} alt="" className="aspect-[4/3] w-full" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] tracking-[0.2em] text-stone-400 uppercase">
          Аня и Миша · 15 августа
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5">
        <span className="text-sm text-stone-700">В очереди на модерацию</span>
        <span className="flex gap-2 text-xs">
          <kbd className="rounded border border-stone-300 px-1.5 py-0.5 font-mono">A</kbd>
          <span className="text-stone-500">одобрить</span>
          <kbd className="rounded border border-stone-300 px-1.5 py-0.5 font-mono">D</kbd>
          <span className="text-stone-500">отклонить</span>
        </span>
      </div>
    </div>
  );
}

function RafflePreview({ backdrop }: { backdrop: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-stone-950 px-6 py-10 text-center">
      <Photo src={backdrop} alt="" className="absolute inset-0 h-full w-full opacity-35" />
      <p className="relative text-[10px] tracking-[0.3em] text-stone-400 uppercase">Розыгрыш</p>
      <p className="relative mt-5 font-serif text-3xl text-stone-100">Павел Крылов</p>
      <p className="relative mt-2 text-sm text-stone-400">стол 2 · место 4</p>
      <div className="relative mx-auto mt-6 flex w-fit gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className="h-1.5 w-8 rounded-full"
            style={{ background: index === 2 ? "#c2a878" : "#403833" }}
          />
        ))}
      </div>
      <p className="relative mt-6 text-[11px] text-stone-500">
        Порядок задан заранее — победителя нельзя «подкрутить» на месте.
      </p>
    </div>
  );
}
