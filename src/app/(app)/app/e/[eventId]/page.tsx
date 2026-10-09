/**
 * Дашборд мероприятия.
 *
 * Первый экран показывает статус подготовки, выбранное приглашение
 * и QR-код, который организатор сможет проверить или распечатать.
 */
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { requireEventContext } from "@/server/context";
import { getEvent } from "@/server/repositories/events";
import { countGuests } from "@/server/repositories/guests";
import { countPhotos } from "@/server/services/photos";
import { rsvpSummary } from "@/server/services/rsvp";
import { getTheme, listBlocks } from "@/server/repositories/invites";
import { getSavedPrintDesigns } from "@/server/services/print-design";
import { PICKABLE_TEMPLATES, findTemplate } from "@/lib/invite-templates";
import { PRINT_TEMPLATES, pageScale, paperSize, reconcilePrintDesign } from "@/lib/print-design";
import { formatEventDateTime } from "@/lib/format-datetime";
import { CountUp } from "@/components/motion/motion";
import { IphoneFrame } from "@/components/invite/iphone-frame";
import { getUiLang } from "@/server/i18n";
import { countWord, localeOf, makeT, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * «Сейчас» для серверного рендера.
 *
 * Обёртка не ради красоты: линтер React запрещает вызывать `Date.now()`
 * в теле компонента — для клиентского это правильная строгость, а
 * серверный рендерится один раз на запрос, и текущее время ему нужно.
 * Выносим вызов за пределы рендера вместо того, чтобы глушить правило.
 */
async function currentTime(): Promise<number> {
  return Date.now();
}

function daysUntil(date: Date, now: number, lang: Lang): string {
  const days = Math.ceil((date.getTime() - now) / 86_400_000);
  const t = makeT(lang);
  if (days < 0) return t("прошла", "past");
  if (days === 0) return t("сегодня", "today");
  if (days === 1) return t("завтра", "tomorrow");
  if (lang === "en") return `in ${countWord(lang, days, ["день", "дня", "дней"], ["day", "days"])}`;
  const mod100 = days % 100;
  const mod10 = days % 10;
  const word =
    mod100 >= 11 && mod100 <= 14 ? "дней" : mod10 === 1 ? "день" : mod10 >= 2 && mod10 <= 4 ? "дня" : "дней";
  return `через ${days} ${word}`;
}

export default async function EventDashboard({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireEventContext(eventId);
  const event = await getEvent(ctx, eventId);
  if (!event) notFound();

  const now = await currentTime();
  const lang = await getUiLang();
  const t = makeT(lang);

  const [guests, rsvp, photos, theme, blocks, savedPrint] = await Promise.all([
    countGuests(ctx),
    rsvpSummary(ctx.eventId),
    countPhotos(ctx.eventId),
    getTheme(ctx),
    listBlocks(ctx),
    getSavedPrintDesigns(ctx),
  ]);
  // Шаблон «выбран», только если он есть на витрине. Снятый с показа или
  // пустой — это не выбор: раньше карточка писала «Шаблон выбран» и
  // показывала голую раскладку без оформления.
  const found = findTemplate(theme.template);
  const template = found && !found.retired ? found : null;
  const hasInvite = Boolean(template) && blocks.some((block) => block.visible);
  const sample = PICKABLE_TEMPLATES[0];
  const previewUrl = hasInvite ? `/app/e/${eventId}/invite/canvas?preview=1` : `/templates/${sample.id}`;
  const qrLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/e/${event.shortCode}`;
  const qrData = await QRCode.toDataURL(qrLink, { width: 480, margin: 2, errorCorrectionLevel: "H" });
  // Подпись на печатной карточке — для гостей, на языке мероприятия.
  const dateLabel = new Intl.DateTimeFormat(localeOf(event.language === "en" ? "en" : "ru"), { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(event.eventDate);
  const qrDesign = reconcilePrintDesign(savedPrint.qr, "qr", event.title, dateLabel, []);
  const qrTemplate = PRINT_TEMPLATES.find((item) => item.id === qrDesign.template);
  const qrSheet = paperSize(qrDesign.paper, qrDesign.orientation);
  const qrFont = (size: number) => size * pageScale(qrDesign.paper) * (270 / qrSheet.w) * qrDesign.textScale;
  const visibleQr = qrDesign.elements.some((item) => item.kind === "qr" && !item.hidden && item.page === 0);

  const tiles = [
    {
      href: `/app/e/${eventId}/guests?tab=answers`,
      value: rsvp.accepted,
      label: t("придут", "attending"),
      hint: t(`${rsvp.pending} не ответили · ${rsvp.notOpened} не открыли ссылку`, `${rsvp.pending} haven’t replied · ${rsvp.notOpened} haven’t opened the link`),
    },
    {
      href: `/app/e/${eventId}/seating`,
      value: guests.seated,
      label: t("рассажено", "seated"),
      hint:
        rsvp.accepted > guests.seated
          ? t(`без места: ${rsvp.accepted - guests.seated}`, `without a seat: ${rsvp.accepted - guests.seated}`)
          : t("все, кто придёт, за столами", "everyone attending has a seat"),
    },
    {
      href: `/app/e/${eventId}/photos`,
      value: photos.pending,
      label: t("фото на модерации", "photos to review"),
      hint: t(`опубликовано ${photos.approved}`, `${photos.approved} published`),
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-sm text-stone-500">
        {formatEventDateTime(event.eventDate, event.timezone, lang)} · {daysUntil(event.eventDate, now, lang)}
        {event.venueName ? ` · ${event.venueName}` : ""}
      </p>

      {/* На телефоне два показателя помещаются рядом. */}
      <div className="rise-stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile, i) => (
          <Link
            key={tile.label}
            href={tile.href}
            style={{ "--i": i } as React.CSSProperties}
            className="group rounded-xl border border-stone-200 bg-card p-4 transition-[border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-back)] hover:-translate-y-1 hover:border-stone-400 hover:shadow-lg hover:shadow-stone-900/5 active:scale-[0.98]"
          >
            <p className="tile-value text-3xl transition-colors duration-200 group-hover:text-stone-900">
              <CountUp value={tile.value} />
            </p>
            <p className="text-sm text-stone-600">{tile.label}</p>
            {/* Подпись мелкая и длинная — на узком экране ей нужен
                перенос по словам, иначе «не открыли ссылку» распирает
                плитку и ломает сетку. */}
            <p className="mt-1 text-xs leading-snug text-balance text-stone-400">{tile.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <section className="rise rounded-2xl border border-stone-200 bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">{t("Ваше приглашение", "Your invitation")}</p>
              <h2 className="mt-1 font-serif text-3xl text-stone-900">{template?.name ?? t("Шаблон не выбран", "No template selected")}</h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-stone-600">
                {hasInvite ? t("Это приглашение увидят гости. Тексты и фотографии можно изменить в редакторе.", "This is the invitation your guests will see. You can change the text and photos in the editor.") : t("Выберите оформление и добавьте свои имена, фотографии и детали праздника.", "Choose a design and add your names, photos and celebration details.")}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${hasInvite ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {hasInvite ? t("Шаблон выбран", "Template selected") : t("Нужно настроить", "Needs setup")}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            {/* Настоящий телефон: приглашение можно пролистать прямо здесь. */}
            <div className="mx-auto shrink-0 sm:mx-0">
              <IphoneFrame src={previewUrl} title={t("Ваше приглашение на телефоне", "Your invitation on a phone")} width={236} interactive />
              <p className="mt-3 text-center text-xs text-stone-400">{t("Листайте приглашение прямо в телефоне", "Scroll through the invitation right on the phone")}</p>
            </div>
            <div className="flex min-w-[190px] flex-1 flex-col gap-2">
              <p className="mb-1 text-sm leading-relaxed text-stone-600">
                {hasInvite
                  ? t(`В приглашении ${countWord(lang, blocks.filter((block) => block.visible).length, ["раздел", "раздела", "разделов"], ["section", "sections"])}. Можно менять порядок, тексты и снимки.`, `Your invitation has ${countWord(lang, blocks.filter((block) => block.visible).length, ["раздел", "раздела", "разделов"], ["section", "sections"])}. You can reorder them and change the text and photos.`)
                  : t(`Начните с выбора одного из готовых свадебных шаблонов. На телефоне — пример: «${sample.name}».`, `Start by choosing one of the ready-made wedding templates. The phone shows an example: “${sample.name}”.`)}
              </p>
              <Link href={`/app/e/${eventId}/invite${hasInvite ? "?edit=1" : ""}`} className="flex min-h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-center text-sm font-medium text-white">
                {hasInvite ? t("Редактировать приглашение", "Edit invitation") : t("Выбрать шаблон", "Choose a template")}
              </Link>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 text-center text-sm text-stone-700">
                {t("Открыть предпросмотр ↗", "Open preview ↗")}
              </a>
            </div>
          </div>
        </section>

        <section className="rise rounded-2xl border border-stone-200 bg-card p-5 sm:p-6">
          <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">{t("Вход гостя", "Guest check-in")}</p>
          <h2 className="mt-1 font-serif text-3xl text-stone-900">{t("Ваш QR-код", "Your QR code")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">{t("Гость сканирует код, находит себя и сразу видит свой стол.", "Guests scan the code, find their name and see their table right away.")}</p>
          <div
            className="relative mx-auto mt-5 w-full max-w-[270px] overflow-hidden rounded-sm border bg-center bg-no-repeat shadow-md"
            style={{ aspectRatio: `${qrSheet.w} / ${qrSheet.h}`, backgroundColor: qrTemplate?.paper ?? "#fffdf8", backgroundImage: qrTemplate ? `url('/media/print-design/${qrTemplate.qrArt}.webp')` : undefined, backgroundSize: "100% 100%", borderColor: qrDesign.accent, color: qrDesign.ink }}
          >
            {qrDesign.elements.filter((item) => !item.hidden && item.page === 0 && item.kind !== "code").map((item) => (
              <div key={item.id} className="absolute leading-tight whitespace-pre-line" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, textAlign: item.align, color: item.id === "title" ? qrDesign.accent : qrDesign.ink, overflowWrap: "anywhere" }}>
                {item.kind === "qr" ? <Image src={qrData} width={176} height={176} unoptimized alt={t("QR-код для входа гостей на праздник", "QR code for guest check-in")} className="block h-auto w-full bg-white p-1 shadow-sm" /> : <span className="font-serif" style={{ fontSize: qrFont(item.fontSize), fontStyle: item.id === "title" ? "italic" : "normal" }}>{item.text}</span>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">{t("Дизайн для печати", "Print design")}: {qrTemplate?.qrName ?? t("Классика", "Classic")}{visibleQr ? "" : t(" · QR скрыт в макете", " · QR hidden in the layout")}</p>
          <div className="mt-4 grid gap-2">
            <Link href={`/app/e/${eventId}/print`} className="flex min-h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-center text-sm font-medium text-white">
              {t("Настроить и скачать PDF", "Customize and download PDF")}
            </Link>
            <a href={`/e/${event.shortCode}`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 text-center text-sm text-stone-700">
              {t("Проверить страницу гостя ↗", "Check the guest page ↗")}
            </a>
          </div>
        </section>
      </div>

    </main>
  );
}
