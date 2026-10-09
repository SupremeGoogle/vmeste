/**
 * Образец шаблона по его идентификатору: /templates/story.
 *
 * Раньше такой маршрут был один и жёстко знал про единственный шаблон.
 * Витрине же нужно «посмотреть, как выглядит» для любого из них, а мне —
 * возможность открыть шаблон, не применяя его к настоящему мероприятию
 * и не затирая чужой текст.
 *
 * Страница ничего не читает из базы и ничего в ней не меняет.
 * `?lang=en` — тот же шаблон, как его увидит английская свадьба.
 */
import { notFound } from "next/navigation";
import { findTemplate, templateBlocks, templateSampleNames, templateTheme } from "@/lib/invite-templates";
import { readBlockContent } from "@/lib/invite-blocks";
import { weddingSchema } from "@/lib/invite-personalization";
import { invitePage, inviteScript, renderBlocks } from "@/server/guest-html/invite-html";
import type { InviteBlockView } from "@/server/repositories/invites";
import { isWedwedTemplate } from "@/server/guest-html/wedwed/markup";
import { SAMPLE_WISHLIST } from "@/server/guest-html/wishlist";
import { isEditorialTemplate } from "@/lib/invite-templates/editorial";
import type { BlockContentMap } from "@/lib/invite-blocks";
import { celebrationTemplate, isCelebrationTemplate } from "@/lib/invite-templates/celebration";
import { gl, withGuestLang } from "@/server/guest-html/guest-lang";
import type { Lang } from "@/lib/i18n";

/** Пример вместо плейсхолдера: пустая обложка не показывает оформление. */
const SAMPLE_NAMES = "Валерия и Давид";

/** Точки на карте для образцов: поиск по одному названию находит не то
 *  место — у «Усадьбы Гребнево» три совпадения по всей стране. */
const GREBNEVO_MAP = "https://yandex.ru/maps/?ll=38.0878%2C55.9485&z=16&pt=38.0878%2C55.9485%2Cpm2rdm";
const LERMONTOVO_MAP = "https://yandex.ru/maps/?ll=20.5795%2C54.4491&z=15&pt=20.5795%2C54.4491%2Cpm2rdm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = findTemplate(id);
  if (!template) notFound();
  // ?cover=1 — сразу обложка, без заставки: так снимаются картинки витрины
  // (scripts/template-previews.mjs). Как у организатора, выключившего заставку.
  const cover = new URL(req.url).searchParams.get("cover") === "1";
  const lang: Lang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "ru";
  // Тексты образца и надписи шаблона — на выбранном языке (если у шаблона есть английский образец).
  const sourceBlocks = templateBlocks(template, lang);
  const baseTheme = templateTheme(template, lang);
  const sampleFoot = () => gl("Образец шаблона. Имена, фотографии, место и тексты меняются в редакторе.", "Sample template. Names, photos, venue and text can all be changed in the editor.");
  const sampleTitle = () => `${template.name} — ${gl("образец приглашения", "sample invitation")}`;
  const respond = (render: () => string) => new Response(withGuestLang(lang, render), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });

  if (isCelebrationTemplate(id)) {
    const language = lang;
    const sample = celebrationTemplate(id, language);
    // The central registry supplies the automatically added wishlist.
    const blocks: InviteBlockView[] = template.blocks.map((block, order) => ({ id: `${id}-demo-${order}`, type: block.type, order, visible: block.visible !== false, ...readBlockContent(block.type, block.content) }));
    const sampleCover = sample.blocks.find(b => b.type === "COVER")!.content as BlockContentMap["COVER"];
    const venue = sample.blocks.find(b => b.type === "VENUE")!.content as BlockContentMap["VENUE"];
    const date = new Date("2027-09-12T13:00:00Z");
    const theme = { ...sample.theme, introOff: cover, wedding: weddingSchema.parse({ names: sampleCover.names, city: language === "en" ? "Moscow" : "Москва", venueName: venue.name, venueAddress: venue.address, mapUrl: venue.mapUrl, deadline: "2027-08-12T20:59:00.000Z" }) };
    const foot = language === "en" ? "Sample invitation. Names, photographs, venue and every word can be changed in the editor." : "Образец приглашения. Имена, фотографии, место и все тексты меняются в редакторе.";
    return respond(() => invitePage({ title: `${sample.name} — ${language === "en" ? "sample invitation" : "образец приглашения"}`, theme, noindex: true,
      body: `${renderBlocks(blocks, null, null, date, theme, "Europe/Moscow")}<p class="foot">${foot}</p>`, script: inviteScript(blocks, theme, sampleCover.names),
    }));
  }

  if (isEditorialTemplate(id)) {
    const blocks: InviteBlockView[] = sourceBlocks.map((block, order) => ({
      id: `${id}-demo-${order}`, type: block.type, order, visible: true,
      ...readBlockContent(block.type, block.content),
    }));
    const sampleCover = blocks.find(b => b.type === "COVER")!.content as BlockContentMap["COVER"];
    const venue = blocks.find(b => b.type === "VENUE")!.content as BlockContentMap["VENUE"];
    const date = new Date({ gazette: "2027-08-14T13:00:00Z", protokol: "2027-07-18T13:00:00Z", postcard: "2027-09-12T13:00:00Z" }[id]);
    const theme = { ...baseTheme, introOff: cover || template.theme.introOff, wedding: weddingSchema.parse({
      names: sampleCover.names, city: lang === "en" ? { gazette: "Kazan", protokol: "Saint Petersburg", postcard: "Moscow" }[id] : { gazette: "Казань", protokol: "Санкт-Петербург", postcard: "Москва" }[id],
      venueName: venue.name, venueAddress: venue.address, mapUrl: venue.mapUrl,
      deadline: new Date(date.getTime() - 30 * 86400000).toISOString(),
    }) };
    return respond(() => invitePage({
      title: sampleTitle(), theme, noindex: true,
      body: `${renderBlocks(blocks, null, null, date, theme, "Europe/Moscow", { wishlist: SAMPLE_WISHLIST })}<p class="foot">${sampleFoot()}</p>`,
      script: inviteScript(blocks, theme, sampleCover.names),
    }));
  }

  if (isWedwedTemplate(id)) {
    const blocks: InviteBlockView[] = sourceBlocks.map((block, order) => ({
      id: `${id}-demo-${order}`, type: block.type, order, visible: true,
      ...readBlockContent(block.type, block.content),
    }));
    const date = new Date(id === "priznanie" ? "2026-10-29T09:00:00Z" : "2026-10-29T13:00:00Z");
    return respond(() => invitePage({
      title: sampleTitle(), theme: { ...baseTheme, introOff: cover || template.theme.introOff }, noindex: true,
      body: `${renderBlocks(blocks, null, null, date, baseTheme, "Europe/Moscow", { wishlist: SAMPLE_WISHLIST })}<p class="foot">${sampleFoot()}</p>`,
      script: inviteScript(blocks, baseTheme, templateSampleNames(id, lang)),
    }));
  }

  // У «Тили-тесто» образец уже заполнен как на исходном сайте — подменять нечего.
  const scrapbook = template.id === "zefir" || template.id === "crayon";
  const keepSample = scrapbook || template.id === "iskra" || template.id === "tili" || template.id === "bohema" || template.id === "kraski" || template.id === "serdce" || template.id === "antic" || template.id === "skvoz-vremya" || template.id === "burgundy" || template.id === "roseraie" || template.id === "floral-garden";
  // Английский образец шаблона приходит со своими именами и местом.
  const english = lang === "en" && Boolean(template.blocksEn);
  const sampleNames = english ? templateSampleNames(template.id, "en") : SAMPLE_NAMES;
  const blocks: InviteBlockView[] = sourceBlocks.map((block, index) => {
    const content = keepSample
      ? block.content
      : block.type === "COVER"
        ? { ...block.content, names: sampleNames }
        : block.type === "VENUE" && !english
          ? { ...block.content, name: "Усадьба Гребнево", address: "" }
          : block.content;
    return {
      id: `${template.id}-demo-${index}`,
      type: block.type,
      order: index,
      visible: true,
      ...readBlockContent(block.type, content),
    };
  });

  // Дата в будущем — иначе обратный отсчёт показывает «праздник прошёл»
  // и образец выглядит сломанным.
  const date = new Date(scrapbook ? "2027-09-12T13:00:00Z" : template.id === "floral-garden" ? "2027-09-28T15:00:00Z" : template.id === "roseraie" ? "2027-06-12T14:00:00Z" : template.id === "skvoz-vremya" ? "2027-06-20T13:00:00Z" : template.id === "kraski" ? "2027-11-20T09:00:00Z" : template.id === "bohema" || template.id === "serdce" || template.id === "antic" ? "2027-11-20T13:00:00Z" : "2027-07-11T14:00:00Z");
  const iskra = template.id === "iskra";
  const bohema = template.id === "bohema";
  const kraski = template.id === "kraski";
  const serdce = template.id === "serdce";
  const antic = template.id === "antic";
  const skvoz = template.id === "skvoz-vremya";
  const burgundy = template.id === "burgundy";
  const roseraie = template.id === "roseraie";
  const floralGarden = template.id === "floral-garden";
  const englishVenue = english ? sourceBlocks.find((block) => block.type === "VENUE")?.content as { name?: string; address?: string } | undefined : undefined;
  const theme = { ...baseTheme, introOff: cover || template.theme.introOff, wedding: weddingSchema.parse({
    names: english ? sampleNames : floralGarden ? "Валерия и Давид" : roseraie ? "Валерия и Давид" : burgundy ? "Валерия и Давид" : skvoz ? "Валерия и Давид" : antic ? "Валерия и Давид" : kraski ? "Валерия и Давид" : serdce ? "Валерия и Давид" : bohema ? "Валерия и Давид" : keepSample ? "Валерия и Давид" : SAMPLE_NAMES,
    city: "",
    venueName: englishVenue?.name ? englishVenue.name : scrapbook ? "Загородный сад" : iskra ? "Солнечная веранда" : floralGarden ? "Вилла Ротонда" : roseraie ? "Вилла Беллароза" : burgundy ? "Усадьба «Розовый сад»" : skvoz ? "Загородный сад" : antic ? "Особняк Путилова" : kraski ? "Лучезарный Резорт" : serdce ? "Солнечная веранда" : bohema ? "Солнечная веранда" : keepSample ? "Лермонтовская частная баня" : "Усадьба Гребнево",
    venueAddress: englishVenue ? englishVenue.address ?? "" : scrapbook ? "Москва, Большая Никитская улица, 22" : iskra ? "г. Солнечногорск, Тимоновское ш., 36" : floralGarden ? "127, посёлок дома отдыха Озёра, коттеджный посёлок Довиль" : roseraie ? "Асоло, Венето, Италия" : burgundy || skvoz ? "Москва, Большая Никитская улица, 22" : antic ? "К.О., пр. Динамо, 2Б, Санкт-Петербург" : kraski ? "Сочи, п. Лоо, ул. Лучезарная, 18/4" : serdce || bohema ? "г. Солнечногорск, Тимоновское ш., 36" : keepSample ? "Лермонтово, Калининградская область" : "",
    mapUrl: scrapbook ? "https://yandex.ru/maps/?text=Москва%20Большая%20Никитская%2022" : iskra ? "https://yandex.ru/maps/org/the_sun_lake/40246030321/" : floralGarden ? "https://yandex.ru/maps/?text=%D0%94%D0%BE%D0%B2%D0%B8%D0%BB%D1%8C%20%D0%9E%D0%B7%D1%91%D1%80%D0%B0" : roseraie ? "https://www.google.com/maps/search/?api=1&query=Asolo%2C%20Veneto%2C%20Italy" : burgundy || skvoz ? "https://yandex.ru/maps/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%20%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B0%D1%8F%20%D0%9D%D0%B8%D0%BA%D0%B8%D1%82%D1%81%D0%BA%D0%B0%D1%8F%2022" : antic ? "https://yandex.ru/maps/?text=%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%20%D0%94%D0%B8%D0%BD%D0%B0%D0%BC%D0%BE%202%D0%91%20%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3" : kraski ? "https://yandex.ru/maps/?text=%D0%A1%D0%BE%D1%87%D0%B8%20%D0%9B%D0%BE%D0%BE%20%D0%9B%D1%83%D1%87%D0%B5%D0%B7%D0%B0%D1%80%D0%BD%D0%B0%D1%8F%2018%2F4" : serdce || bohema ? "https://yandex.ru/maps/org/the_sun_lake/40246030321/" : keepSample ? LERMONTOVO_MAP : GREBNEVO_MAP,
    deadline: scrapbook ? "2027-08-10T20:59:00.000Z" : iskra ? "" : floralGarden ? "2027-09-20T20:59:00.000Z" : bohema || kraski || serdce || antic || skvoz ? "" : "2027-06-20T20:59:00.000Z",
  }) };

  return respond(() => invitePage({
    title: sampleTitle(),
    theme,
    noindex: true,
    body: `${renderBlocks(blocks, null, null, date, theme, "Europe/Moscow", { wishlist: SAMPLE_WISHLIST })}<p class="foot">${sampleFoot()}</p>`,
    script: inviteScript(blocks, theme, sampleNames),
  }));
}
