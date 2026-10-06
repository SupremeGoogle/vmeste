import type { WeddingProfile } from "@/lib/invite-personalization";

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
};

const input = "mt-1 w-full rounded-lg border border-stone-300 bg-card px-3 py-2.5 text-sm";

/**
 * Данные свадьбы: имена, дата, место — общие для всех разделов и шаблонов.
 * Сначала главное, оформление свёрнуто: его трогают редко, а поля «рамка
 * портрета» и «декоративная подпись» рядом с именами только путают.
 */
function WeddingForm({ value, date, deadline, timezone, action }: Props) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-stone-600 sm:col-span-2">Имена пары<input required maxLength={120} name="names" defaultValue={value.names} placeholder="Анна и Михаил" className={input} /></label>
        <label className="text-xs text-stone-600">Дата и время · {timezone}<input required type="datetime-local" name="eventDate" defaultValue={date} className={input} /></label>
        <label className="text-xs text-stone-600">Город<input maxLength={120} name="city" defaultValue={value.city} className={input} /></label>
        <label className="text-xs text-stone-600">Название площадки<input maxLength={120} name="venueName" defaultValue={value.venueName} className={input} /></label>
        <label className="text-xs text-stone-600">Адрес<input maxLength={500} name="venueAddress" defaultValue={value.venueAddress} className={input} /></label>
        <label className="text-xs text-stone-600 sm:col-span-2">Своя точка на карте · ссылка из Яндекс Карт<input type="url" name="mapUrl" defaultValue={value.mapUrl} placeholder="https://yandex.ru/maps/…" className={input} /></label>
        <label className="text-xs text-stone-600">Ответить до · необязательно<input type="date" name="deadline" defaultValue={deadline} className={input} /></label>
      </div>
      <details className="rounded-xl border border-stone-200 px-4 py-3">
        <summary className="cursor-pointer text-sm text-stone-700">Оформление <span className="text-xs text-stone-500">· рамка портрета, текст на фото, детские снимки</span></summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-stone-600">Рамка портрета<select name="portraitShape" defaultValue={value.portraitShape} className={input}><option value="signature">Форма шаблона</option><option value="rectangle">Прямоугольная · Жемчуг и Рубин</option></select></label>
          <label className="text-xs text-stone-600">Текст поверх фотографии<select name="textPosition" defaultValue={value.textPosition} className={input}><option value="bottom">Внизу</option><option value="top">Вверху · Эвергрин, Шёлк, Созвездие, Призма</option></select></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="childhood" defaultChecked={value.childhood} />История с детскими фотографиями</label>
          <label className="text-xs text-stone-600">Декоративная подпись слева<input name="captionLeft" maxLength={120} defaultValue={value.captionLeft} className={input} /></label>
          <label className="text-xs text-stone-600">Декоративная подпись справа<input name="captionRight" maxLength={120} defaultValue={value.captionRight} className={input} /></label>
        </div>
        <p className="mt-3 text-xs text-stone-500">Для «Истории» и «Тили-тесто» можно отключить детские снимки и поставить общую фотографию на обложку.</p>
      </details>
      <button className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm text-white">Сохранить</button>
    </form>
  );
}

export function WeddingPanel(props: Props) {
  const { warnings, initial = false, variant = "details" } = props;
  if (variant === "plain") return <WeddingForm {...props} />;
  return <details id="our-wedding" className="my-5 rounded-2xl border border-stone-200 bg-card p-5" open={initial}>
    <summary className="cursor-pointer text-base font-medium">Наша свадьба <span className="ml-2 text-xs font-normal text-stone-500">Имена, дата, место и оформление</span></summary>
    <p className="mt-3 mb-4 text-sm text-stone-500">Эти данные используются во всех шаблонах. Имена, инициалы, дата на обложке и обратный отсчёт обновляются вместе.</p>
    <WeddingForm {...props} />
    {warnings.length > 0 && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Перед отправкой гостям</p><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
  </details>;
}
