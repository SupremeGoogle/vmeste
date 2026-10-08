/**
 * Вопросы и ответы лендинга. Отдельно от компонента: те же тексты идут
 * в разметку FAQPage (JSON-LD) — ответ в выдаче и на странице совпадает.
 */
export const FAQ_ITEMS = [
  {
    q: "Гостю нужно что-то устанавливать?",
    a: "Нет. Приглашение открывается по ссылке в браузере, а на входе достаточно снять QR-код камерой. Ни приложения, ни регистрации, ни пароля у гостя нет — только именная ссылка.",
  },
  {
    q: "А если в день свадьбы упадёт интернет?",
    a: "План зала, список гостей и таблички с номерами столов печатаются заранее — PDF собирается из тех же данных, что и экран. Свадьба не должна зависеть от вайфая в усадьбе.",
  },
  {
    q: "Кто видит фотографии гостей?",
    a: "Снимки проверяет ИИ-фильтр: обычные фотографии публикуются сразу, а всё, где он заподозрил 18+, ждёт вашего одобрения и до него никому не показывается. На следующий день после свадьбы опубликованные фотографии собираются в общий альбом для гостей.",
  },
  {
    q: "Можно перенести список гостей из моей таблицы?",
    a: "Да, из файла Excel (.xlsx) или CSV. Импорт чинит телефоны, которые Excel превратил в «9.15E+11», и перед сохранением показывает, что именно попадёт в список.",
  },
  {
    q: "Как гости узнают, что подарить?",
    a: "На странице приглашения есть список подарков: гость отмечает «беру этот», и второй такой же чайник вам уже не подарят. Для тех, кто дарит деньгами, — конверт с реквизитами и QR-кодом для перевода.",
  },
  {
    q: "Ведущему и диджею нужен доступ к кабинету?",
    a: "Нет. У команды своя ссылка: по ней виден тайминг дня и список песен, которые заказали гости, — и больше ничего из вашего кабинета.",
  },
  {
    q: "У меня несколько свадеб одновременно — не перепутается?",
    a: "Каждое мероприятие живёт отдельно: гости, столы, фотографии и ссылки не пересекаются между свадьбами и тем более между организаторами. Это проверяется автоматически на каждом запросе.",
  },
  {
    q: "Что будет с данными после свадьбы?",
    a: "Через 10 дней после свадьбы мероприятие само уходит в архив: гостевые ссылки, QR-код и альбом перестают работать. Ещё 5 дней фотографии можно скачать архивом из кабинета, а через 15 дней после свадьбы они удаляются насовсем. Список гостей и ответы остаются у вас.",
  },
];

/** Те же вопросы для английской версии (/en) — и для её FAQPage. */
export const FAQ_ITEMS_EN = [
  {
    q: "Do guests need to install anything?",
    a: "No. The invitation opens in the browser from a link, and at the entrance guests simply scan a QR code with their phone camera. No app, no sign-up, no password — just a personal link.",
  },
  {
    q: "What if the internet goes down on the wedding day?",
    a: "The floor plan, the guest list and the table number cards can all be printed in advance — the PDF is built from the same data you see on screen. Your wedding shouldn’t depend on the venue’s Wi-Fi.",
  },
  {
    q: "Who can see the guests’ photos?",
    a: "Every photo is checked by an AI filter: ordinary shots go live right away, while anything it suspects of being 18+ waits for your approval and stays hidden from everyone until then. The day after the wedding, the published photos are gathered into a shared album for your guests.",
  },
  {
    q: "Can I bring over the guest list from my spreadsheet?",
    a: "Yes — from an Excel (.xlsx) or CSV file. The import repairs phone numbers that Excel turned into “9.15E+11” and, before saving, shows you exactly what will end up on your list.",
  },
  {
    q: "How will guests know what to give?",
    a: "Your invitation page has a gift list: a guest marks “I’ll get this one,” so nobody else gives you a second identical teapot. For those who prefer to give money, there’s an envelope with payment details and a QR code for a transfer.",
  },
  {
    q: "Do the host and the DJ need access to my account?",
    a: "No. Your team gets its own link: it shows the timeline of the day and the songs your guests requested — and nothing else from your account.",
  },
  {
    q: "I’m planning several weddings at once — will anything get mixed up?",
    a: "Every event lives on its own: guests, tables, photos and links never cross between weddings, let alone between organizers. This is checked automatically on every request.",
  },
  {
    q: "What happens to my data after the wedding?",
    a: "Ten days after the wedding, the event is archived automatically: guest links, the QR code and the album stop working. For 5 more days you can download the photos as an archive from your account, and 15 days after the wedding they are deleted for good. Your guest list and RSVPs stay with you.",
  },
];

export function faqItems(lang: "ru" | "en") {
  return lang === "en" ? FAQ_ITEMS_EN : FAQ_ITEMS;
}
