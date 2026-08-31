"use client";

/**
 * Тарифы с переключателем «за свадьбу / за год».
 *
 * Организаторы делятся на два вида, и считают деньги они по-разному:
 * пара платит один раз за свою свадьбу, агентство — за сезон. Один
 * прайс-лист для обоих читается плохо, поэтому переключатель, а не
 * шесть карточек подряд.
 */
import Link from "next/link";
import { useState } from "react";

type Plan = {
  name: string;
  note: string;
  price: { event: string; year: string };
  unit: { event: string; year: string };
  features: string[];
  accent?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Своя свадьба",
    note: "Паре, которая всё делает сама",
    price: { event: "0 ₽", year: "0 ₽" },
    unit: { event: "первая свадьба целиком", year: "первая свадьба целиком" },
    features: [
      "До 40 гостей",
      "Приглашение и ответы гостей",
      "Рассадка и план зала",
      "Печать плана и табличек",
    ],
  },
  {
    name: "Свадьба целиком",
    note: "Всё, что есть в сервисе",
    price: { event: "4 900 ₽", year: "39 000 ₽" },
    unit: { event: "за одно мероприятие", year: "в год, свадеб сколько угодно" },
    features: [
      "Гостей без ограничения",
      "Вход по QR и поиск по имени",
      "Экран в зале и фотографии гостей",
      "Розыгрыш среди пришедших",
      "Выгрузка в CSV и PDF",
    ],
    accent: true,
  },
  {
    name: "Агентство",
    note: "Нескольким координаторам",
    price: { event: "по запросу", year: "89 000 ₽" },
    unit: { event: "обсуждаем объём", year: "в год, до 10 сотрудников" },
    features: [
      "Общий доступ помощникам",
      "Свадьбы разных пар в одном кабинете",
      "Приоритетная поддержка в день свадьбы",
      "Помощь с переносом текущих списков",
    ],
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  const period = yearly ? "year" : "event";

  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full border border-stone-200 bg-white p-1 text-sm">
        {[
          [false, "За свадьбу"],
          [true, "За год"],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setYearly(Boolean(value))}
            className={`rounded-full px-5 py-2 transition-colors ${
              yearly === value ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            {label as string}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            // На планшете карточек в ряду две, и третья осталась бы одна
            // в половину ширины. `sm:last:col-span-2` растягивает её на
            // всю строку; на широком экране столбцов снова три.
            className={`card-lift relative flex flex-col rounded-2xl border p-5 sm:last:col-span-2 sm:p-6 lg:last:col-span-1 ${
              plan.accent
                ? "border-stone-900/25 bg-white shadow-[0_20px_50px_-30px_rgba(64,56,51,0.6)]"
                : "border-stone-200 bg-white/70"
            }`}
          >
            {plan.accent && (
              <span className="absolute -top-3 left-6 rounded-full bg-stone-900 px-3 py-1 text-[11px] text-white">
                Чаще всего берут
              </span>
            )}
            <p className="font-serif text-xl">{plan.name}</p>
            <p className="mt-1 text-sm text-stone-500">{plan.note}</p>

            <p className="tile-value mt-6 text-3xl">{plan.price[period]}</p>
            <p className="mt-1 text-xs text-stone-500">{plan.unit[period]}</p>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-stone-700">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className={`mt-7 rounded-full px-5 py-2.5 text-center text-sm transition-transform hover:scale-[1.02] ${
                plan.accent
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 text-stone-800"
              }`}
            >
              Начать бесплатно
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-stone-500">
        Цены — ориентир для демонстрации: сервис пока работает в тестовом режиме,
        и первая свадьба в любом случае бесплатная.
      </p>
    </div>
  );
}
