import type { WeddingProfile } from "@/lib/invite-personalization";
import { makeT, type Lang } from "@/lib/i18n";

type Props = {
  value: WeddingProfile; date: string; deadline: string; timezone: string;
  action: (data: FormData) => Promise<void>; warnings: string[];
  initial?: boolean;
  /**
   * `details` — сворачиваемый блок над формами «Разделы и поля»;
   * `plain` — только форма: её открывает визуальный редактор в боковой панели,
   * чтобы приглашение было на экране сразу, без стены полей над ним.
   */
  variant?: "details" | "plain";
  /** Язык кабинета (серверный компонент — без useT). */
  lang?: Lang;
};

const input = "mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2.5 text-sm";

/**
 * Данные свадьбы: имена, дата, место — общие для всех разделов и шаблонов.
 * Сначала главное, оформление свёрнуто: его трогают редко, а поля «рамка
 * портрета» и «декоративная подпись» рядом с именами только путают.
 */
function WeddingForm({ value, date, deadline, timezone, action, lang = "ru" }: Props) {
  const t = makeT(lang);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-stone-600 sm:col-span-2">{t("Имена пары", "Couple’s names")}<input required maxLength={120} name="names" defaultValue={value.names} placeholder={t("Анна и Михаил", "Anna & Michael")} className={input} /></label>
        <label className="text-xs text-stone-600">{t("Дата и время", "Date and time")} · {timezone}<input required type="datetime-local" name="eventDate" defaultValue={date} className={input} /></label>
        <label className="text-xs text-stone-600">{t("Город", "City")}<input maxLength={120} name="city" defaultValue={value.city} className={input} /></label>
        <label className="text-xs text-stone-600">{t("Название площадки", "Venue name")}<input maxLength={120} name="venueName" defaultValue={value.venueName} className={input} /></label>
        <label className="text-xs text-stone-600">{t("Адрес", "Address")}<input maxLength={500} name="venueAddress" defaultValue={value.venueAddress} className={input} /></label>
        <label className="text-xs text-stone-600 sm:col-span-2">{t("Своя точка на карте · ссылка из Яндекс Карт", "Custom map pin · Google Maps or Yandex Maps link")}<input type="url" name="mapUrl" defaultValue={value.mapUrl} placeholder={t("https://yandex.ru/maps/…", "https://maps.google.com/…")} className={input} /></label>
        <label className="text-xs text-stone-600">{t("Ответить до · необязательно", "RSVP by · optional")}<input type="date" name="deadline" defaultValue={deadline} className={input} /></label>
      </div>
      <details className="rounded-xl border border-stone-200 px-4 py-3">
        <summary className="cursor-pointer text-sm text-stone-700">{t("Оформление", "Design")} <span className="text-xs text-stone-500">{t("· рамка портрета, текст на фото, детские снимки", "· portrait frame, text on photo, childhood photos")}</span></summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-stone-600">{t("Рамка портрета", "Portrait frame")}<select name="portraitShape" defaultValue={value.portraitShape} className={input}><option value="signature">{t("Форма шаблона", "Template shape")}</option><option value="rectangle">{t("Прямоугольная · Жемчуг и Рубин", "Rectangle · Pearl and Ruby")}</option></select></label>
          <label className="text-xs text-stone-600">{t("Текст поверх фотографии", "Text over photo")}<select name="textPosition" defaultValue={value.textPosition} className={input}><option value="bottom">{t("Внизу", "Bottom")}</option><option value="top">{t("Вверху · Эвергрин, Шёлк, Созвездие, Призма", "Top · Evergreen, Silk, Constellation, Prism")}</option></select></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="childhood" defaultChecked={value.childhood} />{t("История с детскими фотографиями", "Story with childhood photos")}</label>
          <label className="text-xs text-stone-600">{t("Декоративная подпись слева", "Decorative caption, left")}<input name="captionLeft" maxLength={120} defaultValue={value.captionLeft} className={input} /></label>
          <label className="text-xs text-stone-600">{t("Декоративная подпись справа", "Decorative caption, right")}<input name="captionRight" maxLength={120} defaultValue={value.captionRight} className={input} /></label>
        </div>
        <p className="mt-3 text-xs text-stone-500">{t("Для «Истории» и «Тили-тесто» можно отключить детские снимки и поставить общую фотографию на обложку.", "In Story and Sitting in a Tree you can turn off childhood photos and put a photo of the two of you on the cover.")}</p>
      </details>
      <button className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm text-white">{t("Сохранить", "Save")}</button>
    </form>
  );
}

export function WeddingPanel(props: Props) {
  const { warnings, initial = false, variant = "details", lang = "ru" } = props;
  const t = makeT(lang);
  if (variant === "plain") return <WeddingForm {...props} />;
  return <details id="our-wedding" className="my-5 rounded-2xl border border-stone-200 bg-card p-5" open={initial}>
    <summary className="cursor-pointer text-base font-medium">{t("Наша свадьба", "Our wedding")} <span className="ml-2 text-xs font-normal text-stone-500">{t("Имена, дата, место и оформление", "Names, date, venue and design")}</span></summary>
    <p className="mt-3 mb-4 text-sm text-stone-500">{t("Эти данные используются во всех шаблонах. Имена, инициалы, дата на обложке и обратный отсчёт обновляются вместе.", "These details are used in every template. Names, initials, the cover date and the countdown all update together.")}</p>
    <WeddingForm {...props} />
    {warnings.length > 0 && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">{t("Перед отправкой гостям", "Before sending to guests")}</p><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
  </details>;
}
