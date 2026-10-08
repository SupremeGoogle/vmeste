"use client";

import { useState } from "react";

const FEATURES = {
  ru: ["Приглашения", "Ответы гостей", "Рассадка", "Вход по QR", "Фотоальбом", "Подарки", "Музыка", "Розыгрыш"],
  en: ["Invitations", "RSVPs", "Seating chart", "QR check-in", "Photo album", "Gift list", "Music", "Raffle"],
};

const TEXT = {
  ru: { region: "Всё для вашего дня", resume: "Продолжить движение лент", pause: "Остановить движение лент" },
  en: { region: "Everything for your day", resume: "Resume animation", pause: "Pause animation" },
};

export function FeatureRibbons({ lang = "ru" }: { lang?: "ru" | "en" }) {
  const [paused, setPaused] = useState(false);
  const features = FEATURES[lang];
  const t = TEXT[lang];

  return (
    <div className="clay-ribbons" data-paused={paused} role="region" aria-label={t.region}>
      <button type="button" className="clay-ribbons-pause" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? t.resume : t.pause}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          {paused ? <path d="m5 3 7 5-7 5V3Z" fill="currentColor" /> : <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
        </svg>
      </button>
      {["sage", "rose"].map((color, row) => (
        <div className={`clay-ribbon clay-ribbon--${color}`} key={color} aria-hidden={row === 1 || undefined}>
          <div className="clay-ribbon-track">
            {[0, 1].map((copy) => (
              <ul className="clay-ribbon-group" key={copy} aria-hidden={copy === 1 || undefined}>
                {features.map((feature, index) => (
                  <li key={feature}><span className="clay-ribbon-symbol" aria-hidden="true">{(index + row) % 2 === 0 ? "♡" : "✦"}</span>{feature}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
