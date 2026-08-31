/**
 * Титульная страница сервиса.
 *
 * Раньше здесь была визитка в один экран: «что это и куда идти». Её хватало,
 * пока ссылку давали лично. Публичной странице этого мало — человек,
 * который выбирает, чем вести свою свадьбу, хочет увидеть продукт до
 * регистрации, а не после.
 *
 * Поэтому страница показывает продукт: макеты настоящих экранов, живой
 * план зала, который можно потрогать без единого запроса на сервер, и
 * честные ответы на вопросы, которые задают чаще всего.
 *
 * Серверный компонент: интерактив вынесен в клиентские островки в
 * `_landing`, а сама страница знает только одно — вошёл человек или нет,
 * чтобы позвать его в кабинет вместо регистрации.
 */
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/server/auth/session";
import { Nav } from "./_landing/nav";
import { Reveal } from "./_landing/reveal";
import { Petals } from "./_landing/petals";
import { Counter } from "./_landing/counter";
import { FeatureTabs } from "./_landing/feature-tabs";
import { SeatingDemo } from "./_landing/seating-demo";
import { Pricing } from "./_landing/pricing";
import { Faq } from "./_landing/faq";
import "./_landing/landing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вместе — сервис для свадьбы: приглашения, рассадка, вход по QR",
  description:
    "Приглашения и ответы гостей, план зала с рассадкой, вход по QR-коду, фотографии на экране и розыгрыш. Первая свадьба бесплатно.",
};

const MARQUEE = [
  "именные приглашения",
  "ответы гостей",
  "план зала",
  "круглые и прямоугольные столы",
  "президиум",
  "вход по QR",
  "поиск по имени",
  "меню и аллергии",
  "фотографии на экране",
  "модерация",
  "розыгрыш",
  "печать и PDF",
  "импорт из Excel",
];

const STEPS = [
  {
    title: "Заводите свадьбу",
    text: "Название, дата, место. Список гостей набирается руками или загружается из вашей таблицы.",
  },
  {
    title: "Собираете приглашение",
    text: "Обложка, расписание, дорога, дресс-код. Каждый гость получает свою ссылку и отвечает в один тап.",
  },
  {
    title: "Рассаживаете",
    text: "Ставите столы, выбираете форму, тащите гостей на места. План уходит в печать и в PDF.",
  },
  {
    title: "Проводите день",
    text: "Гости находят себя по QR, присылают фотографии на экран, ведущий разыгрывает подарок.",
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <>
      {/* Анимация появления живёт в CSS и снимается наблюдателем в браузере.
          Без JavaScript снимать её некому — тогда показываем всё сразу,
          иначе страница осталась бы пустым листом. */}
      <noscript>
        <style>{".reveal { opacity: 1; transform: none; }"}</style>
      </noscript>

      <Nav userName={user?.name ?? null} />

      <main>
        {/* ── Первый экран ─────────────────────────────────── */}
        <section className="hero-glow relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="paper pointer-events-none absolute inset-0" aria-hidden="true" />
          <Petals />

          <div className="relative mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal as="p" className="inline-flex items-center gap-2 rounded-full border border-stone-300/70 bg-white/60 px-4 py-1.5 text-xs text-stone-600 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-900" />
                Сервис для свадьбы — от приглашения до последнего танца
              </Reveal>

              <Reveal as="h1" delay={80} className="mt-7 font-serif text-4xl leading-[1.1] sm:text-6xl">
                Свадьба, где всё
                <br className="hidden sm:block" /> на своих местах
              </Reveal>

              <Reveal as="p" delay={160} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
                Приглашения и ответы гостей, план зала с рассадкой, вход по QR-коду,
                фотографии на экране и розыгрыш. Одно место вместо чата, таблицы
                и стопки распечаток.
              </Reveal>

              <Reveal delay={240} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {user ? (
                  <Link
                    href="/app"
                    className="shimmer relative overflow-hidden rounded-full bg-stone-900 px-8 py-3.5 text-white transition-transform hover:scale-[1.03]"
                  >
                    Перейти в личный кабинет
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className="shimmer relative overflow-hidden rounded-full bg-stone-900 px-8 py-3.5 text-white transition-transform hover:scale-[1.03]"
                  >
                    Создать кабинет бесплатно
                  </Link>
                )}
                <a
                  href="#demo"
                  className="rounded-full border border-stone-300 px-8 py-3.5 text-stone-700 transition-colors hover:border-stone-500"
                >
                  Потрогать рассадку
                </a>
              </Reveal>

              <Reveal as="p" delay={320} className="mt-5 text-sm text-stone-500">
                Без карты и без звонка менеджера. Первая свадьба целиком — бесплатно.
              </Reveal>
            </div>

            {/* Три плитки с цифрами: сколько работы снимает сервис. */}
            <Reveal delay={400} className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
              {[
                { value: 84, suffix: "", label: "гостя в одном списке — без переписки в трёх чатах" },
                { value: 3, suffix: " мин", label: "от загрузки таблицы до готовых именных ссылок" },
                { value: 1, suffix: " с", label: "фотография гостя оказывается на экране в зале" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="card-lift rounded-2xl border border-stone-200/80 bg-white/70 p-5 text-center backdrop-blur"
                >
                  <p className="tile-value text-3xl">
                    <Counter to={tile.value} suffix={tile.suffix} />
                  </p>
                  <p className="mt-2 text-sm leading-snug text-stone-600">{tile.label}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ── Бегущая строка ───────────────────────────────── */}
        <div className="marquee overflow-hidden border-y border-stone-200 bg-white/50 py-3">
          <div className="marquee-track flex w-max gap-8 text-sm whitespace-nowrap text-stone-500">
            {[...MARQUEE, ...MARQUEE].map((item, index) => (
              <span key={index} className="flex items-center gap-8">
                {item}
                <span className="h-1 w-1 rounded-full bg-stone-300" />
              </span>
            ))}
          </div>
        </div>

        {/* ── Боль ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Знакомо</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                Свадьба на 80 человек живёт в семи местах сразу
              </h2>
              <p className="mt-5 text-stone-600">
                Список гостей в таблице, ответы в переписке, рассадка на листе А4,
                меню у ресторана, фотографии в чате, а в день свадьбы координатор
                бегает с распечаткой, потому что «Настя» в списке записана как
                «Анастасия Юрьевна».
              </p>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Таблица", "Кто-то правит копию, и версий становится две."],
                ["Переписка", "«Мы придём вдвоём» теряется среди поздравлений."],
                ["Лист А4", "Пересадили гостя — и лист опять неактуален."],
                ["Стопка распечаток", "Гость у входа ждёт, пока найдут его строчку."],
              ].map(([title, text], index) => (
                <Reveal key={title} delay={index * 90}>
                  <div className="card-lift h-full rounded-xl border border-stone-200 bg-white p-5">
                    <p className="text-sm text-stone-900">{title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Возможности ──────────────────────────────────── */}
        <section id="vozmozhnosti" className="border-y border-stone-200 bg-white/40 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal className="max-w-2xl">
              <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Возможности</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                Шесть частей одного дня
              </h2>
              <p className="mt-4 text-stone-600">
                Каждая работает отдельно, но данные общие: пересадили гостя — изменилось
                и в его приглашении, и на входе, и в распечатке.
              </p>
            </Reveal>

            <Reveal delay={120} className="mt-12">
              <FeatureTabs />
            </Reveal>
          </div>
        </section>

        {/* ── Как это работает ─────────────────────────────── */}
        <section id="kak" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Как это работает</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              Четыре шага от списка до свадьбы
            </h2>
          </Reveal>

          <div className="relative mt-14">
            {/* Линия, вдоль которой стоят шаги: на телефоне слева, на
                широком экране горизонтально. */}
            <div
              className="absolute top-6 left-6 h-[calc(100%-3rem)] w-px bg-stone-200 lg:top-6 lg:left-0 lg:h-px lg:w-full"
              aria-hidden="true"
            />
            <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
              {STEPS.map((step, index) => (
                <Reveal as="li" key={step.title} delay={index * 110} className="relative pl-16 lg:pl-0">
                  <span className="absolute top-0 left-0 flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-[#fffdf9] font-serif text-lg lg:relative lg:mb-6">
                    {index + 1}
                  </span>
                  <p className="font-serif text-xl">{step.title}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{step.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Живое демо ───────────────────────────────────── */}
        <section id="demo" className="border-y border-stone-200 bg-white/40 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal className="max-w-2xl">
              <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Демо без регистрации</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                Рассадите гостей прямо здесь
              </h2>
              <p className="mt-4 text-stone-600">
                Возьмите гостя и посадите за стол. Это тот же расчёт мест и те же
                значки молодожёнов, что в настоящей панели, — ничего не сохраняется
                и никуда не отправляется.
              </p>
            </Reveal>

            <Reveal delay={120} className="mt-12">
              <SeatingDemo />
            </Reveal>
          </div>
        </section>

        {/* ── Гостю ────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <Reveal>
              <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Со стороны гостя</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                Ни приложения, ни пароля, ни регистрации
              </h2>
              <div className="mt-7 space-y-5">
                {[
                  ["Ссылка приходит именная", "Гость открывает и сразу видит своё имя — искать себя в списке не нужно."],
                  ["Страница открывается на любом телефоне", "Никакого тяжёлого приложения: приглашение весит меньше одной фотографии."],
                  ["На входе — QR и поиск по имени", "«Настя» находит Анастасию, а в ответе только имя и номер стола."],
                  ["Фотографии — одной кнопкой", "Снял, отправил, и после одобрения снимок появился на экране в зале."],
                ].map(([title, text], index) => (
                  <Reveal key={title} delay={index * 90}>
                    <div className="flex gap-4">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-900" />
                      <div>
                        <p className="text-stone-900">{title}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-stone-600">{text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="float-slow relative mx-auto w-fit">
                <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-br from-stone-200/70 to-transparent blur-2xl" />
                <div className="w-[280px] rounded-[2.2rem] border-[7px] border-stone-800/90 bg-[#fffdf9] p-5 shadow-2xl">
                  <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-stone-300" />
                  <p className="text-center text-[10px] tracking-[0.25em] text-stone-500 uppercase">
                    Вы на свадьбе
                  </p>
                  <p className="mt-3 text-center font-serif text-2xl">Ирина Соколова</p>
                  <div className="mx-auto my-4 h-px w-10 bg-stone-200" />
                  <div className="rounded-xl bg-stone-50 p-4 text-center">
                    <p className="text-xs text-stone-500">Ваш стол</p>
                    <p className="tile-value mt-1 text-4xl">3</p>
                    <p className="mt-1 text-xs text-stone-500">место 5, у окна</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
                    <span className="rounded-lg border border-stone-200 py-2 text-stone-600">План зала</span>
                    <span className="rounded-lg bg-stone-900 py-2 text-white">Отправить фото</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Спокойствие ──────────────────────────────────── */}
        <section className="border-y border-stone-200 bg-white/40 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal className="max-w-2xl">
              <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Чтобы спать спокойно</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                День свадьбы бывает один раз
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                ["План Б напечатан", "План зала, таблички и списки собираются в PDF из тех же данных. Упал интернет — свадьба идёт по бумаге."],
                ["Чужого не видно", "Гости, столы и фотографии одной свадьбы недоступны другой. Это проверяется на каждом запросе, а не на честном слове."],
                ["Фото только после вас", "Снимок гостя не появится на экране, пока вы его не одобрили. Отклонённые не видит никто."],
                ["Ссылку можно погасить", "Мероприятие в архиве — и старые ссылки с QR-кодом перестают работать."],
                ["Розыгрыш не подкрутить", "Порядок победителей определяется заранее и воспроизводится: результат можно перепроверить."],
                ["Всё на русском", "Интерфейс, письма и распечатки — на языке ваших гостей, без «RSVP Deadline» в табличке."],
              ].map(([title, text], index) => (
                <Reveal key={title} delay={index * 80}>
                  <div className="card-lift h-full rounded-2xl border border-stone-200 bg-white p-6">
                    <p className="font-serif text-lg">{title}</p>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Тарифы ───────────────────────────────────────── */}
        <section id="ceny" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Цены</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              Платить за свадьбу, а не за подписку навсегда
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-stone-600">
              Первая свадьба бесплатно и целиком — до сорока гостей. Дальше можно
              заплатить один раз за мероприятие или взять год, если свадеб много.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-12">
            <Pricing />
          </Reveal>
        </section>

        {/* ── Вопросы ──────────────────────────────────────── */}
        <section id="voprosy" className="border-t border-stone-200 bg-white/40 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-5">
            <Reveal>
              <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">Вопросы</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                О чём спрашивают чаще всего
              </h2>
            </Reveal>
            <Reveal delay={120} className="mt-10">
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* ── Призыв ───────────────────────────────────────── */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-glow absolute inset-0" aria-hidden="true" />
          <Reveal className="relative mx-auto max-w-2xl px-5 text-center">
            <svg width="46" height="30" viewBox="0 0 34 24" className="mx-auto" aria-hidden="true">
              <circle cx="13" cy="13" r="8.5" fill="none" stroke="#8b6f47" strokeWidth="1.4" />
              <circle cx="21" cy="13" r="8.5" fill="none" stroke="#c2a878" strokeWidth="1.4" />
            </svg>
            <h2 className="mt-7 font-serif text-3xl leading-tight sm:text-5xl">
              Начните со списка гостей
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-stone-600">
              Кабинет создаётся за минуту. Список можно загрузить из таблицы,
              а приглашение собрать вечером — и уже завтра разослать ссылки.
            </p>
            <p className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={user ? "/app" : "/register"}
                className="shimmer relative overflow-hidden rounded-full bg-stone-900 px-8 py-3.5 text-white transition-transform hover:scale-[1.03]"
              >
                {user ? "Перейти в личный кабинет" : "Создать кабинет бесплатно"}
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="rounded-full border border-stone-300 px-8 py-3.5 text-stone-700 transition-colors hover:border-stone-500"
                >
                  У меня уже есть кабинет
                </Link>
              )}
            </p>
          </Reveal>
        </section>

        {/* ── Подвал ───────────────────────────────────────── */}
        <footer className="border-t border-stone-200 bg-white/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="font-serif text-xl tracking-wide">Вместе</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-600">
                Сервис для свадьбы: приглашения, ответы гостей, рассадка,
                вход по QR-коду, экран в зале и розыгрыш.
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-900">Разделы</p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li><a href="#vozmozhnosti" className="hover:text-stone-900">Возможности</a></li>
                <li><a href="#demo" className="hover:text-stone-900">Демо рассадки</a></li>
                <li><a href="#ceny" className="hover:text-stone-900">Цены</a></li>
                <li><a href="#voprosy" className="hover:text-stone-900">Вопросы</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm text-stone-900">Кабинет</p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li><Link href="/app" className="hover:text-stone-900">Личный кабинет</Link></li>
                {!user && <li><Link href="/register" className="hover:text-stone-900">Создать кабинет</Link></li>}
                {!user && <li><Link href="/login" className="hover:text-stone-900">Войти</Link></li>}
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-200 px-5 py-5">
            <p className="mx-auto max-w-6xl text-xs text-stone-500">
              Гостю сюда не нужно: у него есть именная ссылка или QR-код на входе.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
