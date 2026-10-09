import { localDateTime, localTimeToUtc } from "@/lib/wedding-day";
import type { Lang } from "@/lib/i18n";

type StageText = { title: string; responsible: string; notes: string };
/** Этап по-русски и `en` — по-английски: этапы видят ведущий и команда, они на языке мероприятия. */
type Stage = StageText & { time: string; en: StageText };
/** Название, подзаголовок и настроение — на языке кабинета (`*En` — английский вариант). */
export type TimingTemplate = {
  id: string; name: string; subtitle: string; mood: string; theme: string; stages: Stage[];
  nameEn: string; subtitleEn: string; moodEn: string;
};

export const TIMING_TEMPLATES: TimingTemplate[] = [
  {
    id: "classic", name: "Классический день", subtitle: "От первого взгляда до последнего танца", mood: "Торжественно и нежно", theme: "rose",
    nameEn: "Classic day", subtitleEn: "From the first look to the last dance", moodEn: "Elegant and tender",
    stages: [
      { time: "15:00", title: "Встреча гостей", responsible: "Координатор", notes: "Welcome-напитки, лёгкие закуски и музыка. Помочь гостям найти свои места.", en: { title: "Guest arrival", responsible: "Coordinator", notes: "Welcome drinks, light bites and music. Help guests find their seats." } },
      { time: "16:00", title: "Свадебная церемония", responsible: "Ведущий церемонии", notes: "Проверить микрофон, подготовить кольца. Музыка для выхода пары и обмена клятвами.", en: { title: "Wedding ceremony", responsible: "Officiant", notes: "Check the microphone, have the rings ready. Music for the processional and the vows." } },
      { time: "16:40", title: "Общее фото и поздравления", responsible: "Фотограф", notes: "Сначала общее фото, затем снимки с родителями и друзьями. Для пары оставить 20 минут на прогулку.", en: { title: "Group photo and congratulations", responsible: "Photographer", notes: "Group photo first, then photos with parents and friends. Leave the couple 20 minutes for a walk." } },
      { time: "17:30", title: "Праздничный ужин", responsible: "Ведущий и банкетный менеджер", notes: "Приветственное слово пары, подача первой смены блюд. Согласовать тосты с кухней.", en: { title: "Reception dinner", responsible: "MC and banquet manager", notes: "Welcome words from the couple, first course served. Coordinate the toasts with the kitchen." } },
      { time: "19:00", title: "Первый танец", responsible: "Диджей", notes: "Подготовить выбранный трек и свет. После танца пригласить всех гостей на танцпол.", en: { title: "First dance", responsible: "DJ", notes: "Have the chosen song and lighting ready. After the dance, invite everyone to the dance floor." } },
      { time: "21:00", title: "Свадебный торт", responsible: "Кондитер и ведущий", notes: "Подготовить сервировку и нож, пригласить фотографа. Уточнить время подачи чая и кофе.", en: { title: "Wedding cake", responsible: "Baker and MC", notes: "Set out plates and the knife, call the photographer. Confirm when tea and coffee are served." } },
      { time: "22:00", title: "Танцы и красивый финал", responsible: "Диджей и координатор", notes: "Любимые песни гостей, благодарность от пары. Проверить трансфер и вещи гостей перед отъездом.", en: { title: "Dancing and a beautiful send-off", responsible: "DJ and coordinator", notes: "Guests' favorite songs, a thank-you from the couple. Check transportation and guests' belongings before they leave." } },
    ],
  },
  {
    id: "intimate", name: "Камерный вечер", subtitle: "Тёплый праздник для самых близких", mood: "Без спешки и лишней суеты", theme: "lavender",
    nameEn: "Intimate evening", subtitleEn: "A warm celebration with your closest people", moodEn: "Unhurried and easygoing",
    stages: [
      { time: "17:00", title: "Собираемся вместе", responsible: "Координатор", notes: "Встречать гостей лично. Подготовить напитки и уютную зону для общения.", en: { title: "Gathering together", responsible: "Coordinator", notes: "Greet guests personally. Have drinks and a cozy lounge area ready." } },
      { time: "17:40", title: "Клятвы и объятия", responsible: "Пара и ведущий", notes: "Короткая церемония, обмен кольцами и слова друг другу. Оставить время на поздравления.", en: { title: "Vows and hugs", responsible: "Couple and officiant", notes: "A short ceremony, the ring exchange and words to each other. Leave time for congratulations." } },
      { time: "18:15", title: "Ужин за общим столом", responsible: "Банкетный менеджер", notes: "Подача блюд без длинных пауз. Тосты и истории близких по желанию, без обязательного порядка.", en: { title: "Dinner at one long table", responsible: "Banquet manager", notes: "Serve courses without long pauses. Toasts and stories from loved ones as they wish, in no set order." } },
      { time: "19:30", title: "Истории, музыка и танцы", responsible: "Ведущий и диджей", notes: "Несколько тёплых историй о паре, первый танец и любимая музыка. Не заполнять каждую минуту активностями.", en: { title: "Stories, music and dancing", responsible: "MC and DJ", notes: "A few warm stories about the couple, the first dance and favorite music. Don't fill every minute with activities." } },
      { time: "20:30", title: "Торт и чай", responsible: "Банкетный менеджер", notes: "Небольшой торт, чай и кофе. Приготовить коробочки для десертов, которые гости заберут домой.", en: { title: "Cake and tea", responsible: "Banquet manager", notes: "A small cake, tea and coffee. Have boxes ready for desserts guests can take home." } },
      { time: "21:30", title: "Спасибо, что вы с нами", responsible: "Пара", notes: "Общее фото и слова благодарности. Помочь старшим гостям с такси или трансфером.", en: { title: "Thank you for being here", responsible: "Couple", notes: "A group photo and words of thanks. Help older guests with a taxi or transportation." } },
    ],
  },
  {
    id: "garden", name: "Свадьба на природе", subtitle: "Воздух, зелень и вечер под огнями", mood: "Легко и естественно", theme: "sage",
    nameEn: "Outdoor wedding", subtitleEn: "Fresh air, greenery and an evening under the lights", moodEn: "Light and natural",
    stages: [
      { time: "14:30", title: "Welcome в саду", responsible: "Координатор", notes: "Напитки, закуски и вода в доступе. Проверить прогноз, запасной крытый зал и указатели на площадке.", en: { title: "Garden welcome", responsible: "Coordinator", notes: "Drinks, snacks and water within reach. Check the forecast, the indoor backup space and the signs at the venue." } },
      { time: "15:30", title: "Церемония под открытым небом", responsible: "Ведущий церемонии", notes: "Проверить звук на улице, подготовить кольца и рассадить гостей. При солнце предложить зонтики.", en: { title: "Open-air ceremony", responsible: "Officiant", notes: "Check the outdoor sound, have the rings ready and seat the guests. Offer parasols if it is sunny." } },
      { time: "16:15", title: "Прогулка и фотографии", responsible: "Фотограф", notes: "Групповые фото и прогулка пары. Для гостей — напитки и свободное общение в лаунж-зоне.", en: { title: "Stroll and photos", responsible: "Photographer", notes: "Group photos and a walk for the couple. Drinks and mingling in the lounge area for guests." } },
      { time: "17:30", title: "Ужин на террасе", responsible: "Банкетный менеджер", notes: "Начать подачу блюд вовремя. Проверить пледы и дополнительный свет на вечер.", en: { title: "Dinner on the terrace", responsible: "Banquet manager", notes: "Start serving on time. Check the blankets and extra lighting for the evening." } },
      { time: "19:00", title: "Фото в вечернем свете", responsible: "Фотограф", notes: "Время примерное: перенести по реальному закату в день свадьбы. Отвести 15–20 минут для пары.", en: { title: "Golden-hour photos", responsible: "Photographer", notes: "The time is approximate: adjust to the actual sunset on the day. Set aside 15–20 minutes for the couple." } },
      { time: "20:00", title: "Первый танец под гирляндами", responsible: "Диджей", notes: "Включить декоративный свет, проверить покрытие танцпола. После первого танца пригласить гостей.", en: { title: "First dance under string lights", responsible: "DJ", notes: "Turn on the string lights, check the dance floor surface. Invite guests to join after the first dance." } },
      { time: "21:00", title: "Торт и вечер у огней", responsible: "Ведущий и координатор", notes: "Торт, чай и спокойное завершение вечера. Проверить освещение дорожек и время трансфера.", en: { title: "Cake and an evening by the lights", responsible: "MC and coordinator", notes: "Cake, tea and a calm end to the evening. Check the path lighting and the transportation time." } },
    ],
  },
];

/** Use the venue's calendar date, even when it differs from the UTC date. */
export function timingTemplateSteps(id: string, eventDate: Date, timezone: string, lang: Lang = "ru") {
  const template = TIMING_TEMPLATES.find((item) => item.id === id);
  if (!template) return null;
  const date = localDateTime(eventDate, timezone).slice(0, 10);
  const stages = template.stages.map(({ time, en, ...ru }) => ({ ...(lang === "en" ? en : ru), startsAt: localTimeToUtc(`${date}T${time}`, timezone) }));
  if (stages.some((stage) => !stage.startsAt)) return null;
  return stages.map((stage) => ({ ...stage, startsAt: stage.startsAt! }));
}
