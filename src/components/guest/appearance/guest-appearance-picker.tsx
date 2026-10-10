"use client";

import { useActionState, useId, useState, type CSSProperties } from "react";
import { GUEST_APPEARANCES, findGuestAppearance, guestAppearanceVariables, type GuestAppearanceId } from "@/lib/guest-appearance";
import styles from "./guest-appearance-picker.module.css";

export type GuestAppearanceState = { ok: boolean; message: string; id?: string };
type Props = {
  initial: GuestAppearanceId | null;
  title: string;
  date: string;
  guestUrl: string;
  lang: "ru" | "en";
  saveAction: (previous: GuestAppearanceState, data: FormData) => Promise<GuestAppearanceState>;
};

export function GuestAppearancePicker({ initial, title, date, guestUrl, lang, saveAction }: Props) {
  const t = (ru: string, en: string) => lang === "en" ? en : ru;
  const [selected, setSelected] = useState<string>(initial ?? "original");
  const [state, action, pending] = useActionState(saveAction, { ok: false, message: "" });
  const radioName = useId();
  const theme = findGuestAppearance(selected);
  const savedId = state.id ?? initial ?? "original";
  const dirty = selected !== savedId;
  const sampleTheme = theme ?? GUEST_APPEARANCES[4];
  const previewVariables = theme ? guestAppearanceVariables(theme) : {
    ...guestAppearanceVariables(sampleTheme), "--color-paper": "#fffaf6", "--color-card": "#fffdfb",
    "--color-ink": "#294038", "--color-muted": "#746f68", "--color-gold": "#906e4c",
    "--color-gold-soft": "#c5a279", "--color-line": "#e7d9cd",
    "--guest-art": 'url("/media/guest-wedding/floral-garland.webp")',
  };
  return <section className={styles.studio} aria-label={t("Оформление страницы гостя", "Guest page design")}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>{t("ВСТРЕЧАЕМ ГОСТЕЙ КРАСИВО", "A BEAUTIFUL WELCOME")}</p><h2>{t("Ваш праздник. В каждом оттенке.", "Your celebration. In every shade.")}</h2><p>{t("Выберите, какой увидят свадьбу гости после сканирования QR-кода.", "Choose what guests see when they scan your wedding QR code.")}</p></div>
      <span className={styles.edition} aria-hidden="true">07<span>{t("оттенков", "shades")}</span></span>
    </header>
    <div className={styles.layout}>
      <div className={styles.controls}>
        <fieldset disabled={pending} className={styles.fieldset}>
          <legend>{t("Цвет и настроение", "Colour and mood")}</legend>
          <div className={styles.choices}>
            {GUEST_APPEARANCES.map((item, index) => <label key={item.id} className={styles.option}>
              <input type="radio" name={radioName} value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} />
              <span className={styles.optionBody}>
                <span className={styles.swatches} aria-hidden="true"><i style={{ background: item.paper }} /><i style={{ background: item.soft }} /><i style={{ background: item.accent }} /></span>
                <span className={styles.optionCopy}><span className={styles.optionName}>{t(item.name, item.nameEn)}</span><span>{t(item.note, item.noteEn)}</span></span>
                <span className={styles.optionNumber} aria-hidden="true">{selected === item.id ? "✓" : `0${index + 1}`}</span>
              </span>
            </label>)}
          </div>
          <label className={styles.original}><input type="radio" name={radioName} value="original" checked={selected === "original"} onChange={() => setSelected("original")} />{t("Исходное оформление", "Original design")}</label>
        </fieldset>
        <form action={action}>
        <input key={selected} type="hidden" name="appearanceId" value={selected} />
        <div className={styles.actions}>
          <button type="submit" disabled={pending || !dirty}>{pending ? t("Сохраняем…", "Saving…") : dirty ? t("Применить для гостей", "Apply for guests") : t("Оформление сохранено", "Design saved")}</button>
          <a href={guestUrl} target="_blank" rel="noreferrer">{t("Открыть страницу ↗", "Open guest page ↗")}</a>
        </div>
        </form>
        <p className={styles.note}>{t("Новый стиль увидят все гости. Напечатанный QR-код останется рабочим.", "All guests will see the new style. Your printed QR code will keep working.")}</p>
        <p role="status" className={state.ok ? styles.success : styles.error}>{state.message}</p>
      </div>
      <div className={styles.previewArea}>
        <div className={styles.previewLabel}><span>{t("ПРЕДПРОСМОТР", "PREVIEW")}</span><span>{dirty ? t("Не сохранено", "Unsaved") : t("Текущий стиль", "Current style")}</span></div>
        <div className={styles.phone} style={previewVariables as CSSProperties} data-mood={theme?.mood ?? "original"}>
          <div className={styles.statusBar} aria-hidden="true"><span>9:41</span><span>••• ▰</span></div>
          <div className={styles.phoneArt} aria-hidden="true" />
          <div className={styles.phoneHeading}>
            <p>{t("ДОБРО ПОЖАЛОВАТЬ НА СВАДЬБУ", "WELCOME TO OUR WEDDING")}</p>
            <h3>{title}</h3><span>{date}</span>
            <div className={styles.ornament} aria-hidden="true">—— ♡ ——</div>
          </div>
          <div className={styles.finder}>
            <span className={styles.cardEyebrow}>{t("РАДЫ, ЧТО ВЫ С НАМИ", "SO GLAD YOU’RE HERE")}</span>
            <h4>{t("Найдите своё место", "Find your seat")}</h4>
            <p>{t("Введите имя или фамилию — мы подскажем ваш стол.", "Enter your name and we’ll help you find your table.")}</p>
            <div className={styles.sampleInput}><span aria-hidden="true">⌕</span>{t("Ваше имя или фамилия", "Your first or last name")}</div>
            <div className={styles.sampleButton}>{t("Найти себя", "Find my seat")}<span aria-hidden="true">↗</span></div>
          </div>
          <div className={styles.features} aria-hidden="true"><span>▦<small>{t("Рассадка", "Seating")}</small></span><span>▧<small>{t("Фото", "Photos")}</small></span><span>♡<small>{t("Пожелания", "Wishes")}</small></span></div>
          <p className={styles.phoneFooter}>{t("Маленькие моменты большого дня", "Little moments of a wonderful day")}</p>
        </div>
        <p className={styles.sampleNote}>{t("Образец оформления. Доступные разделы зависят от настроек свадьбы.", "Design sample. Available sections depend on your wedding settings.")}</p>
      </div>
    </div>
  </section>;
}
