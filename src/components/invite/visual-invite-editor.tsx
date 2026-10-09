"use client";

/**
 * Визуальный редактор приглашения — «как в Тильде»: открывается сама
 * страница, щелчок по тексту правит его на месте, по фотографии — открывает
 * выбор, по цвету палитры — выбор цвета.
 *
 * Начало положил редактор «Эвергрина»; здесь он общий для всех шаблонов.
 * Страница живёт во фрейме (`/invite/canvas`) и сообщает о правках через
 * postMessage; сохраняет всё серверное действие страницы с проверкой прав
 * и схемы блока. После действий, меняющих структуру, фрейм перезагружается
 * и возвращается к тому же месту прокрутки.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { DRAFT_CHANGED } from "@/components/invite/publish-controls";
import { useRouter } from "next/navigation";
import { WeddingSheet } from "@/components/invite/wedding-sheet";
import { SectionsPanel, TypePicker, type BlockTypeOption, type SectionItem, type ComponentItem } from "@/components/invite/sections-panel";
import { DesignPanel } from "@/components/invite/design-panel";
import { PhotoControls } from "@/components/invite/photo-controls";
import { defaultPhotoAdjustment, photoAdjustmentSchema, type PhotoAdjustment } from "@/lib/invite-personalization";
import { PRISM_SAMPLE_IMAGES } from "@/lib/invite-templates/prism-assets";
import type { PickerAsset } from "@/components/invite/image-picker";
import { CONSTELLATION_SAMPLE_IMAGES } from "@/lib/invite-templates/constellation-assets";
import { EVERGREEN_SAMPLE_IMAGES } from "@/lib/invite-templates/evergreen-assets";
import { PEARL_SAMPLE_IMAGES } from "@/lib/invite-templates/pearl-assets";
import { RUBY_SAMPLE_IMAGES } from "@/lib/invite-templates/ruby-assets";
import { SILK_SAMPLE_IMAGES } from "@/lib/invite-templates/silk-assets";
import { TILI_SAMPLE_IMAGES } from "@/lib/invite-templates/tili-assets";
import { uploadType } from "@/lib/upload-type";
import { useT } from "@/components/i18n-provider";
import { TUSCANY_SAMPLE_IMAGES } from "@/lib/invite-templates/tuscany-assets";
import { BURGUNDY_SAMPLE_IMAGES } from "@/lib/invite-templates/burgundy-assets";
import { ROSERAIE_SAMPLE_IMAGES } from "@/lib/invite-templates/roseraie-assets";
import { FLORAL_GARDEN_SAMPLE_IMAGES } from "@/lib/invite-templates/floral-garden-assets";
import type { InviteImageSlot } from "@/lib/invite-image-slots";
import { CELEBRATION_SAMPLE_IMAGES } from "@/lib/invite-templates/celebration-assets";

type SaveResult = { ok: true } | { ok: false; message: string };
type Target = { kind: "image" | "link" | "color"; blockId: string; path: string; current: string };
export type BlockAction = "up" | "down" | "hide" | "show" | "add-detail" | "remove-detail" | "duplicate" | "delete" | "insert-after" | "move-to";

const SAMPLES: Record<string, readonly string[]> = {
  ...Object.fromEntries(["gravure", "disco", "coral", "chrome"].map(id => [id, CELEBRATION_SAMPLE_IMAGES.filter(url => url.startsWith(`/media/invite-${id}/`))])),
  prism: PRISM_SAMPLE_IMAGES,
  constellation: CONSTELLATION_SAMPLE_IMAGES,
  evergreen: EVERGREEN_SAMPLE_IMAGES,
  pearl: PEARL_SAMPLE_IMAGES,
  ruby: RUBY_SAMPLE_IMAGES,
  silk: SILK_SAMPLE_IMAGES,
  tili: TILI_SAMPLE_IMAGES,
  tuscany: TUSCANY_SAMPLE_IMAGES,
  burgundy: BURGUNDY_SAMPLE_IMAGES,
  roseraie: ROSERAIE_SAMPLE_IMAGES,
  "floral-garden": FLORAL_GARDEN_SAMPLE_IMAGES,
};

/** Подсказка по умолчанию. На телефоне её не показываем: место над
 *  приглашением дорого, а сообщения о сохранении остаются видны. */
const EDIT_HINT = "Нажмите на любой текст, фотографию или дату — изменения сохраняются в черновик";
const EDIT_HINT_EN = "Tap any text, photo or date to edit it — changes are saved to your draft";

export function VisualInviteEditor({
  eventId,
  template,
  canvasSrc,
  previewHref,
  assets,
  audio,
  musicUrl,
  photoSlots,
  hidden,
  sections,
  blockTypes,
  saveField: saveFieldAction,
  blockAction: blockActionAction,
  saveMusic: saveMusicAction,
  savePhoto: savePhotoAction,
  introAvailable,
  introOff,
  saveIntro: saveIntroAction,
  style,
  saveStyle: saveStyleAction,
  fontChoices,
  weddingForm,
  rsvpBuilder,
  rsvpOpen: rsvpOpenInitially = false,
  addRsvpOption,
  weddingReady,
  warnings,
}: {
  eventId: string;
  template: string;
  canvasSrc: string;
  previewHref: string;
  assets: PickerAsset[];
  audio: PickerAsset[];
  musicUrl: string;
  photoSlots: InviteImageSlot[];
  hidden: { id: string; label: string }[];
  /** Все разделы по порядку — для панели слева. */
  sections: SectionItem[];
  /** Какие разделы можно добавить. */
  blockTypes: BlockTypeOption[];
  saveField: (input: { blockId: string; path: string; value: string }) => Promise<SaveResult>;
  blockAction: (input: { blockId: string; action: BlockAction; index?: number; type?: string }) => Promise<SaveResult>;
  saveMusic: (url: string) => Promise<SaveResult>;
  /** У шаблона есть заставка, которую можно выключить. */
  introAvailable: boolean;
  introOff: boolean;
  saveIntro: (off: boolean) => Promise<SaveResult>;
  /** Свои цвета и шрифты поверх шаблона. */
  style: { accent: string | null; fonts: Record<string, string> };
  saveStyle: (input: { accent: string | null; fonts: Record<string, string> }) => Promise<SaveResult>;
  fontChoices: { family: string; kind: string }[];
  savePhoto: (input: { blockId: string; path: string; url: string; settings: PhotoAdjustment }) => Promise<SaveResult>;
  /** Форма «Имена, дата и место» — открывается в боковой панели. */
  weddingForm: ReactNode;
  /** Конструктор вопросов анкеты — открывается на весь экран по щелчку по анкете. */
  rsvpBuilder?: ReactNode;
  /** Открыть конструктор анкеты сразу (старый адрес /invite/form ведёт сюда). */
  rsvpOpen?: boolean;
  /** «+ Добавить вариант» под вариантами анкеты: drink, meal или q:<id вопроса>. */
  addRsvpOption?: (input: { target: string; title: string }) => Promise<SaveResult>;
  /** Данные свадьбы уже заполнены хотя бы раз. */
  weddingReady: boolean;
  /** Что поправить перед отправкой гостям. */
  warnings: string[];
}) {
  // Каждая удачная правка — сигнал плашке черновика (publish-controls.tsx):
  // у опубликованного приглашения она копится и ждёт «Сохранить изменения».
  const tracked = useMemo(() => {
    const track = <I,>(action: (input: I) => Promise<SaveResult>) => async (input: I) => {
      const result = await action(input);
      if (result.ok) window.dispatchEvent(new Event(DRAFT_CHANGED));
      return result;
    };
    return {
      saveField: track(saveFieldAction), blockAction: track(blockActionAction), saveMusic: track(saveMusicAction),
      savePhoto: track(savePhotoAction), saveIntro: track(saveIntroAction), saveStyle: track(saveStyleAction),
    };
  }, [saveFieldAction, blockActionAction, saveMusicAction, savePhotoAction, saveIntroAction, saveStyleAction]);
  const { saveField, blockAction, saveMusic, savePhoto, saveIntro, saveStyle } = tracked;
  const t = useT();
  const [rsvpOpen, setRsvpOpen] = useState(rsvpOpenInitially);
  const [optionTarget, setOptionTarget] = useState<string | null>(null);
  const [optionTitle, setOptionTitle] = useState("");
  const [optionError, setOptionError] = useState<string | null>(null);
  const [addingOption, startAddingOption] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const scrollY = useRef(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState("");
  const [photoSettings, setPhotoSettings] = useState(defaultPhotoAdjustment);
  const [photoRatio, setPhotoRatio] = useState(4 / 3);
  const [phone, setPhone] = useState(false);
  const [items, setItems] = useState<PickerAsset[]>(() => [
    ...assets,
    ...(SAMPLES[template] ?? []).map((url, index) => ({ id: `sample-${index}`, url, alt: t(`Пример шаблона ${index + 1}`, `Template sample ${index + 1}`) })),
  ]);
  const [songs, setSongs] = useState(audio);
  const [music, setMusic] = useState(musicUrl);
  const [musicOpen, setMusicOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [photos, setPhotos] = useState(photoSlots);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(() => t(EDIT_HINT, EDIT_HINT_EN));
  const [revision, setRevision] = useState(0);
  const [saving, startSaving] = useTransition();
  const [weddingOpen, setWeddingOpen] = useState(false);
  const [weddingFocus, setWeddingFocus] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  // На телефоне над приглашением остаются две главные кнопки, остальное —
  // под «Ещё»: семь кнопок в три ряда отодвигали само приглашение на
  // второй экран.
  const [moreOpen, setMoreOpen] = useState(false);
  const openWedding = useCallback((focus: string | null = null) => {
    setWeddingFocus(focus);
    setWeddingOpen(true);
  }, []);
  const closeWedding = useCallback(() => setWeddingOpen(false), []);
  const router = useRouter();
  // Куда вставлять новый раздел: id раздела выше, null — в начало, undefined — меню закрыто.
  const [insertAfter, setInsertAfter] = useState<string | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<SectionItem | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [lastRemoved, setLastRemoved] = useState<{ blockId: string; key: string } | null>(null);
  const [intro, setIntro] = useState(!introOff);
  const [designOpen, setDesignOpen] = useState(false);
  /** Исходные цвет и шрифты шаблона — из `<meta name="vm-style">` страницы. */
  const [templateStyle, setTemplateStyle] = useState<{ accent: string | null; fonts: string[] } | null>(null);
  const [accent, setAccent] = useState<string | null>(style.accent);
  const [fonts, setFonts] = useState<Record<string, string>>(style.fonts);

  const readCanvas = useCallback(() => {
    const document = frame.current?.contentDocument;
    if (!document) return;
    const found = new Map<string, ComponentItem>();
    document.querySelectorAll<HTMLElement>("[data-invite-component]").forEach(node => {
      const blockId = node.dataset.componentOwner ?? "";
      const key = node.dataset.inviteComponent ?? "";
      if (!blockId || !key || node.parentElement?.closest("[data-component-removed]")) return;
      found.set(`${blockId}/${key}`, { blockId, key, label: node.dataset.componentLabel ?? t("Элемент", "Element"), removed: node.dataset.componentRemoved === "true" });
    });
    setComponents([...found.values()]);
    try {
      const meta = document.querySelector('meta[name="vm-style"]')?.getAttribute("content");
      if (meta) setTemplateStyle(JSON.parse(meta));
    } catch { /* Панель остаётся доступна и без метаданных оформления. */ }
    if (scrollY.current > 0) frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll", y: scrollY.current }, "*");
  }, [t]);

  function saveDesign(next: { accent: string | null; fonts: Record<string, string> }, done: string) {
    setAccent(next.accent);
    setFonts(next.fonts);
    setNotice(t("Сохраняю оформление…", "Saving design…"));
    startSaving(async () => {
      const result = await saveStyle(next);
      setNotice(result.ok ? done : result.message);
      if (result.ok) setRevision((value) => value + 1);
    });
  }

  function toggleIntro() {
    const next = !intro;
    setNotice(t("Сохраняю…", "Saving…"));
    startSaving(async () => {
      const result = await saveIntro(!next);
      if (result.ok) setIntro(next);
      setNotice(result.ok ? (next ? t("Заставка включена — гости увидят её при открытии", "Intro on — guests will see it when they open the invitation") : t("Заставка выключена — приглашение откроется сразу", "Intro off — the invitation opens right away")) : result.message);
    });
  }

  /** Действие со структурой: сохранить, обновить список разделов и страницу. */
  const runAction = useCallback((input: { blockId: string; action: BlockAction; index?: number; type?: string }, done: string) => {
    setNotice(t("Обновляю разделы…", "Updating sections…"));
    startSaving(async () => {
      const result = await blockAction(input);
      setNotice(result.ok ? done : result.message);
      if (result.ok) {
        router.refresh();
        setRevision((value) => value + 1);
      }
    });
  }, [blockAction, router, t]);

  function scrollToSection(id: string) {
    frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll-to", blockId: id }, "*");
  }

  const changeComponent = useCallback((blockId: string, key: string, action: "remove" | "restore") => {
    setNotice(action === "remove" ? t("Удаляю элемент…", "Removing element…") : t("Возвращаю элемент…", "Restoring element…"));
    startSaving(async () => {
      try {
        const result = await saveField({ blockId, path: `component:${key}`, value: action });
        setNotice(result.ok ? action === "remove" ? t("Элемент удалён — его можно вернуть в списке разделов", "Element removed — you can restore it from the sections list") : t("Элемент возвращён", "Element restored") : result.message);
        if (result.ok) {
          setLastRemoved(action === "remove" ? { blockId, key } : null);
          setRevision(value => value + 1);
        }
      } catch { setNotice(t("Не удалось сохранить элемент. Попробуйте ещё раз.", "Couldn’t save the element. Please try again.")); }
    });
  }, [saveField, t]);

  const reload = () => setRevision((value) => value + 1);
  const visiblePhotos = photos.filter((photo) => !hidden.some((block) => block.id === photo.blockId));
  const displayedPhotoUrl = (photo: InviteImageSlot) => photo.url;

  function openPhotoSlot(photo: InviteImageSlot) {
    const current = displayedPhotoUrl(photo);
    const selector = `[data-media-block="${CSS.escape(photo.blockId)}"][data-media-path="${CSS.escape(photo.path)}"]`;
    const element = frame.current?.contentDocument?.querySelector<HTMLElement>(selector);
    setTarget({ kind: "image", blockId: photo.blockId, path: photo.path, current });
    setDraft(current);
    setPhotoSettings(photo.settings);
    setPhotoRatio(element && element.clientWidth > 0 && element.clientHeight > 0 ? element.clientWidth / element.clientHeight : 4 / 3);
  }

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as Record<string, unknown> | null;
      if (!message || message.source !== "invite-canvas") return;
      if (message.kind === "canvas-ready") { readCanvas(); return; }
      const blockId = typeof message.blockId === "string" ? message.blockId : "";
      const path = typeof message.path === "string" ? message.path : "";
      const current = typeof message.current === "string" ? message.current : "";

      if (message.kind === "scroll" && typeof message.y === "number") scrollY.current = message.y;
      // Щелчок по дате на обложке: дата со временем выбирается в календаре панели.
      if (message.kind === "wedding-edit") openWedding(typeof message.focus === "string" ? message.focus : null);
      if (message.kind === "reload") reload();
      if (message.kind === "rsvp-add" && addRsvpOption && typeof message.target === "string") {
        setOptionTarget(message.target);
        setOptionTitle("");
        setOptionError(null);
        return;
      }
      // Анкета — внутри приглашения: щелчок по ней открывает конструктор вопросов.
      if (rsvpBuilder && (message.kind === "rsvp-builder" || (message.kind === "form-click" && sections.some((item) => item.id === blockId && item.type === "RSVP_FORM")))) {
        setRsvpOpen(true);
        return;
      }
      if (message.kind === "component-action" && blockId && path && (message.action === "remove" || message.action === "restore")) {
        changeComponent(blockId, path, message.action);
        return;
      }

      if (message.kind === "text-edit" && blockId && path && typeof message.value === "string") {
        const value = message.value;
        setNotice(t("Сохраняю…", "Saving…"));
        startSaving(async () => {
          const result = await saveField({ blockId, path, value });
          setNotice(result.ok ? t("Сохранено", "Saved") : result.message);
          // Отказ — вернуть на странице то, что действительно сохранено.
          reload();
        });
      }

      if ((message.kind === "image-edit" || message.kind === "link-edit" || message.kind === "color-edit") && blockId && path) {
        const kind = message.kind === "image-edit" ? "image" : message.kind === "link-edit" ? "link" : "color";
        setTarget({ kind, blockId, path, current });
        setDraft(current);
        if (kind === "image") {
          let raw: unknown;
          try { raw = JSON.parse(String(message.settings || "{}")); } catch { raw = {}; }
          const parsed = photoAdjustmentSchema.safeParse(raw);
          setPhotoSettings(parsed.success ? parsed.data : defaultPhotoAdjustment());
          setPhotoRatio(typeof message.ratio === "number" ? message.ratio : 4 / 3);
        }
      }

      if (message.kind === "block-action" && blockId && message.action === "insert-after") { setInsertAfter(blockId); return; }
      if (message.kind === "block-action" && blockId && message.action === "delete") {
        setToDelete(sections.find((item) => item.id === blockId) ?? { id: blockId, type: "", label: t("раздел", "section"), hint: "", visible: true });
        return;
      }
      if (message.kind === "block-action" && blockId && message.action === "duplicate") { runAction({ blockId, action: "duplicate" }, t("Копия раздела добавлена ниже", "Section copy added below")); return; }
      if (message.kind === "block-action" && blockId && (message.action === "up" || message.action === "down" || message.action === "hide" || message.action === "add-detail" || message.action === "remove-detail")) {
        const action = message.action as BlockAction;
        const index = typeof message.index === "number" ? message.index : undefined;
        setNotice(action === "add-detail" ? t("Добавляю новую деталь…", "Adding a new item…") : action === "remove-detail" ? t("Удаляю деталь…", "Removing item…") : t("Обновляю разделы…", "Updating sections…"));
        startSaving(async () => {
          const result = await blockAction({ blockId, action, index });
          setNotice(result.ok ? (action === "add-detail" ? t("Деталь добавлена — нажмите на неё, чтобы заполнить", "Item added — tap it to fill it in") : action === "remove-detail" ? t("Деталь удалена", "Item removed") : action === "hide" ? t("Раздел скрыт — вернуть можно кнопкой «Скрытые разделы»", "Section hidden — bring it back from the sections list") : t("Сохранено", "Saved")) : result.message);
          if (result.ok) { reload(); router.refresh(); }
        });
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [blockAction, saveField, openWedding, runAction, sections, router, changeComponent, readCanvas, rsvpBuilder, addRsvpOption, t]);

  function submitOption(event: React.FormEvent) {
    event.preventDefault();
    const title = optionTitle.trim();
    if (!optionTarget || !addRsvpOption || !title) return;
    startAddingOption(async () => {
      const result = await addRsvpOption({ target: optionTarget, title });
      if (!result.ok) {
        setOptionError(result.message);
        return;
      }
      setOptionTarget(null);
      setNotice(t("Вариант добавлен — гости уже видят его в анкете", "Option added — guests can already see it in the RSVP form"));
      reload();
    });
  }

  const choices = (() => {
    if (!target || target.kind !== "image") return items;
    const current = target.current && !items.some((item) => item.url === target.current)
      ? [{ id: "current", url: target.current, alt: t("Текущее изображение", "Current image") }] : [];
    return [...current, ...items].filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index);
  })();

  async function commit(value: string) {
    if (!target) return;
    setBusy(true);
    setNotice(t("Сохраняю…", "Saving…"));
    const result = await saveField({ blockId: target.blockId, path: target.path, value });
    setBusy(false);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    frame.current?.contentWindow?.postMessage(
      { source: "invite-editor", kind: `${target.kind}-saved`, blockId: target.blockId, path: target.path, value },
      "*",
    );
    setNotice(t("Сохранено", "Saved"));
    setTarget(null);
    // Перезагрузка нужна не только для новой раскладки: пустой слот — это
    // не <img>, а понятная плашка «Добавить фото». После выбора/удаления
    // сервер заново нарисует правильный элемент и вернёт прежний скролл.
    if (target.kind === "image") reload();
  }

  async function uploadFile(file: File): Promise<PickerAsset> {
    const presign = await fetch(`/api/app/events/${eventId}/assets/presign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentType: uploadType(file), bytes: file.size }),
    }).then((response) => response.json());
    if (!presign.ok) throw new Error(presign.message);
    const put = await fetch(presign.uploadUrl, { method: "PUT", headers: { "content-type": uploadType(file) }, body: file });
    if (!put.ok) throw new Error(t("Хранилище не приняло файл", "The file couldn’t be uploaded to storage"));
    const done = await fetch(`/api/app/events/${eventId}/assets/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: presign.key, alt: file.name.replace(/\.[^.]+$/, "") }),
    }).then((response) => response.json());
    if (!done.ok) throw new Error(done.message);
    return done.asset as PickerAsset;
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setNotice(t("Загружаю фотографию…", "Uploading photo…"));
    try {
      const asset = await uploadFile(file);
      setItems((current) => [asset, ...current]);
      setDraft(asset.url);
      setPhotoSettings(defaultPhotoAdjustment());
      setNotice(t("Фотография загружена. Настройте кадр и нажмите «Сохранить фотографию».", "Photo uploaded. Adjust the framing and tap “Save photo”."));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : t("Не получилось загрузить фотографию", "Couldn’t upload the photo"));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function chooseMusic(url: string) {
    setBusy(true);
    setNotice(t("Сохраняю музыку…", "Saving music…"));
    const result = await saveMusic(url);
    setBusy(false);
    setNotice(result.ok ? (url ? t("Музыка сохранена", "Music saved") : t("Музыка выключена", "Music off")) : result.message);
    if (result.ok) {
      setMusic(url);
      setMusicOpen(false);
      reload();
    }
  }

  async function uploadSong(file: File) {
    setBusy(true);
    setNotice(t("Загружаю песню…", "Uploading song…"));
    try {
      const asset = await uploadFile(file);
      setSongs((current) => [asset, ...current]);
      await chooseMusic(asset.url);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : t("Не получилось загрузить песню", "Couldn’t upload the song"));
    } finally {
      setBusy(false);
      if (audioInput.current) audioInput.current.value = "";
    }
  }


  async function commitPhoto() {
    if (!target) return;
    setBusy(true);
    try {
      const result = await savePhoto({ blockId: target.blockId, path: target.path, url: draft, settings: photoSettings });
      setNotice(result.ok ? t("Фотография и кадрирование сохранены", "Photo and framing saved") : result.message);
      if (result.ok) {
        setPhotos((current) => current.map((slot) => slot.blockId === target.blockId && slot.path === target.path ? { ...slot, url: draft, settings: photoSettings } : slot));
        setTarget(null);
        reload();
      }
    } catch { setNotice(t("Не удалось сохранить. Проверьте соединение и попробуйте снова.", "Couldn’t save. Check your connection and try again.")); }
    finally { setBusy(false); }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-800 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stone-900 px-4 py-3 text-white sm:px-5">
        <div className="min-w-0">
          <p className="hidden text-sm font-medium sm:block">{t("Редактирование на странице", "Editing on the page")}</p>
          <p className={`mt-0.5 text-xs ${saving || busy ? "text-amber-200" : "text-white/60"} ${notice === t(EDIT_HINT, EDIT_HINT_EN) ? "hidden sm:block" : ""}`}>{notice}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openWedding()}
            className={`rounded-lg px-3 py-2 text-xs ${weddingReady ? "border border-white/20 hover:bg-white/10" : "bg-amber-200 font-medium text-stone-900"}`}
          >
            {t("Имена, дата и место", "Names, date & venue")}
          </button>
          {warnings.length > 0 && (
            <button type="button" onClick={() => setWarningsOpen((open) => !open)} className="rounded-lg border border-amber-200/50 px-3 py-2 text-xs text-amber-100 hover:bg-white/10" aria-expanded={warningsOpen}>
              {t("Перед отправкой:", "Before sending:")} {warnings.length}
            </button>
          )}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10 sm:hidden" aria-expanded={moreOpen}>
            {moreOpen ? t("Скрыть", "Less") : t("Ещё", "More")}
          </button>
          <div className={`${moreOpen ? "flex" : "hidden"} w-full flex-wrap items-center gap-2 sm:contents`}>
          <button type="button" onClick={() => setPhone(!phone)} className="hidden rounded-lg border border-white/20 px-3 py-2 text-xs sm:block">{phone ? t("Широкий экран", "Wide view") : t("Посмотреть на телефоне", "Phone view")}</button>
          <button type="button" onClick={() => setSectionsOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10 lg:hidden" aria-expanded={sectionsOpen}>
            {t("Разделы", "Sections")}{hidden.length > 0 ? t(` · скрыто ${hidden.length}`, ` · ${hidden.length} hidden`) : ""}
          </button>
          <button type="button" onClick={() => setDesignOpen(true)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
            {t("Цвета и шрифты", "Colors & fonts")}
          </button>
          {introAvailable && (
            <button type="button" onClick={toggleIntro} disabled={saving} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10" aria-pressed={intro} title={t("Экран-заставка, который гость видит при открытии приглашения", "The intro screen guests see when they open the invitation")}>
              {t("Заставка:", "Intro:")} {intro ? t("включена", "on") : t("выключена", "off")}
            </button>
          )}
          <button type="button" onClick={() => setMusicOpen(true)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
            {music ? t("♪ Музыка", "♪ Music") : t("♪ Добавить музыку", "♪ Add music")}
          </button>
          {visiblePhotos.length > 0 && <button type="button" onClick={() => setImagesOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">{t("Все фотографии:", "All photos:")} {visiblePhotos.length}</button>}
          <a href={previewHref} target="_blank" rel="noopener noreferrer" aria-disabled={saving || busy} onClick={(event) => { if (saving || busy) event.preventDefault(); }} className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-medium text-stone-900 aria-disabled:opacity-50">{t("Открыть как гость ↗", "View as guest ↗")}</a>
          </div>
        </div>
      </div>

      {!weddingReady && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-amber-100/10 px-4 py-3 text-sm text-amber-50 sm:px-5">
          <span>{t("Начните с имён и даты — они сразу появятся на обложке, в «Где» и в обратном отсчёте. Всё остальное правится прямо на странице.", "Start with your names and date — they’ll appear right away on the cover, the venue section and the countdown. Everything else you can edit right on the page.")}</span>
          <button type="button" onClick={() => openWedding("names")} className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-medium text-stone-900">{t("Указать", "Add")}</button>
        </div>
      )}

      {warningsOpen && warnings.length > 0 && (
        <ul className="list-disc space-y-1 border-b border-white/10 bg-stone-900/80 py-3 pr-4 pl-9 text-xs text-amber-100 sm:pr-5">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}

      {imagesOpen && (
        <div className="border-b border-white/10 bg-stone-900 px-4 py-4 text-white sm:px-5">
          <p className="text-sm font-medium">{t("Фотографии в приглашении", "Photos in the invitation")}</p>
          <p className="mt-1 text-xs text-white/60">{t("Здесь собраны фотографии всех разделов. Выберите карточку, загрузите свой снимок и сохраните. Фото из образца:", "All the photos from every section are here. Pick a card, upload your own photo and save. Sample photos:")} {visiblePhotos.filter((photo) => displayedPhotoUrl(photo).startsWith("/media/invite-")).length}.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePhotos.map((photo) => (
              <button key={`${photo.blockId}:${photo.path}`} type="button" onClick={() => openPhotoSlot(photo)} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-2 text-left hover:border-amber-200">
                {displayedPhotoUrl(photo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayedPhotoUrl(photo)} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-stone-700 object-cover" />
                ) : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/30 text-2xl text-white/50">＋</span>}
                <span className="min-w-0"><strong className="block text-sm font-medium">{photo.label}</strong><span className="mt-1 block text-xs text-amber-200">{displayedPhotoUrl(photo).startsWith("/media/invite-") ? t("Фото из образца · заменить", "Sample photo · replace") : photo.url ? t("Свое фото · изменить", "Your photo · change") : t("Добавить фото", "Add photo")}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {lastRemoved && <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-stone-900 px-4 py-2 text-xs text-white/70"><span>{t("Элемент удалён", "Element removed")}</span><button type="button" disabled={saving} onClick={() => changeComponent(lastRemoved.blockId, lastRemoved.key, "restore")} className="rounded-lg px-3 py-2 font-medium text-amber-200 hover:bg-white/5 disabled:opacity-40">{t("Отменить удаление", "Undo")}</button></div>}
      <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className={`${sectionsOpen ? "block max-h-[60vh]" : "hidden"} border-b border-white/10 bg-[#211c19] lg:block lg:max-h-none lg:border-r lg:border-b-0`} aria-label={t("Разделы приглашения", "Invitation sections")}>
        <div className="lg:sticky lg:top-0 lg:h-[calc(78vh+3rem)]">
          <SectionsPanel
            sections={sections}
            components={components}
            onComponentAction={changeComponent}
            onScrollToComponent={(blockId, key) => frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll-component", blockId, path: key }, "*")}
            busy={saving || busy}
            onScrollTo={scrollToSection}
            onToggle={(id, visible) => runAction({ blockId: id, action: visible ? "show" : "hide" }, visible ? t("Раздел снова на странице", "Section is back on the page") : t("Раздел скрыт — вернуть можно «глазом» в списке", "Section hidden — tap the eye in the list to bring it back"))}
            onMove={(id, index) => runAction({ blockId: id, action: "move-to", index }, t("Порядок разделов сохранён", "Section order saved"))}
            onDuplicate={(id) => runAction({ blockId: id, action: "duplicate" }, t("Копия раздела добавлена ниже", "Section copy added below"))}
            onDelete={(item) => setToDelete(item)}
            onInsertAfter={(id) => setInsertAfter(id)}
          />
        </div>
      </aside>
      <div className={`mx-auto w-full p-2 sm:p-6 ${phone ? "max-w-[420px]" : template === "tili" ? "max-w-[1100px]" : "max-w-[760px]"}`}>
        <iframe
          key={revision}
          ref={frame}
          src={`${canvasSrc}?v=${revision}`}
          onLoad={readCanvas}
          title={t("Визуальный редактор приглашения", "Visual invitation editor")}
          className="block h-[78vh] min-h-[560px] w-full rounded-xl bg-card shadow-2xl"
          sandbox="allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>
      </div>

      {designOpen && (
        <DesignPanel
          template={templateStyle}
          accent={accent}
          fonts={fonts}
          fontChoices={fontChoices}
          busy={saving}
          onClose={() => setDesignOpen(false)}
          onAccent={(value) => saveDesign({ accent: value, fonts }, value ? t("Цвет сохранён", "Color saved") : t("Цвета как в шаблоне", "Template colors restored"))}
          onFont={(from, to) => {
            const next = { ...fonts };
            if (!to || to === from) delete next[from];
            else next[from] = to;
            saveDesign({ accent, fonts: next }, t("Шрифт сохранён", "Font saved"));
          }}
          onReset={() => saveDesign({ accent: null, fonts: {} }, t("Оформление как в шаблоне", "Template design restored"))}
        />
      )}

      {insertAfter !== undefined && (
        <TypePicker
          types={blockTypes}
          onClose={() => setInsertAfter(undefined)}
          onPick={(type) => {
            const afterId = insertAfter;
            setInsertAfter(undefined);
            runAction({ blockId: afterId ?? "", action: "insert-after", type }, t("Раздел добавлен — нажмите на текст, чтобы заполнить", "Section added — tap the text to fill it in"));
          }}
        />
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setToDelete(null); }}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl">
            <p className="font-serif text-2xl text-stone-900">{t("Удалить раздел?", "Delete section?")}</p>
            <p className="mt-2 text-sm text-stone-600">{t("«", "“")}{toDelete.label}{toDelete.hint ? ` · ${toDelete.hint}` : ""}{t("» исчезнет вместе с текстами и фотографиями. Если раздел просто не нужен сейчас — лучше скрыть его «глазом».", "” will be deleted along with its text and photos. If you just don’t need it right now, hide it with the eye icon instead.")}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setToDelete(null)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">{t("Отмена", "Cancel")}</button>
              <button type="button" onClick={() => { runAction({ blockId: toDelete.id, action: "hide" }, t("Раздел скрыт", "Section hidden")); setToDelete(null); }} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">{t("Скрыть", "Hide")}</button>
              <button type="button" onClick={() => { runAction({ blockId: toDelete.id, action: "delete" }, t("Раздел удалён", "Section deleted")); setToDelete(null); }} className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white">{t("Удалить", "Delete")}</button>
            </div>
          </div>
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTarget(null); }}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg text-stone-900">
                {target.kind === "image" ? t("Заменить фотографию", "Replace photo") : target.kind === "link" ? t("Ссылка", "Link") : t("Цвет палитры", "Palette color")}
              </h2>
              <button type="button" disabled={busy} onClick={() => setTarget(null)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">{t("Закрыть", "Close")}</button>
            </div>

            {target.kind === "image" && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDraft("")}
                  className={`flex min-h-32 flex-col items-center justify-center rounded-xl border-2 px-4 text-center ${target.current ? "border-stone-200 text-stone-600 hover:border-red-300 hover:bg-red-50" : "border-stone-900 bg-stone-50 text-stone-900"}`}
                >
                  <span className="text-xl">×</span>
                  <span className="mt-1 text-sm">{t("Без фотографии", "No photo")}</span>
                </button>
                {choices.map((asset) => (
                  <button key={asset.id} type="button" disabled={busy} onClick={() => { setDraft(asset.url); setPhotoSettings(defaultPhotoAdjustment()); }} className={`group overflow-hidden rounded-xl border-2 text-left ${draft === asset.url ? "border-stone-900" : "border-stone-200"}`}>
                    {/* Картинки отдаёт защищённый маршрут, размеры заранее неизвестны. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.alt} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]" />
                    <span className="block truncate px-3 py-2 text-xs text-stone-600">{asset.alt}</span>
                  </button>
                ))}
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 px-4 text-center text-sm text-stone-500 hover:border-stone-500">
                  <span className="text-2xl">＋</span><span className="mt-1">{t("Загрузить свою", "Upload your own")}</span>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
                </label>
                <p className="col-span-full text-xs leading-5 text-stone-500">
                  {t("Фотографию можно убрать сейчас и вернуть позже: пустое место останется доступным в редакторе.", "You can remove the photo now and add one back later — the empty spot stays available in the editor.")}
                </p>
                {draft && <div className="col-span-full"><PhotoControls src={draft} value={photoSettings} onChange={setPhotoSettings} ratio={photoRatio} /></div>}
                <p role="status" className="col-span-full text-sm text-stone-600">{notice}</p>
                <button type="button" disabled={busy} onClick={() => void commitPhoto()} className="col-span-full rounded-xl bg-stone-900 px-4 py-3 text-sm text-white disabled:opacity-50">{busy ? t("Сохраняю…", "Saving…") : draft ? t("Сохранить фотографию", "Save photo") : t("Убрать фотографию", "Remove photo")}</button>
              </div>
            )}

            {target.kind === "link" && (
              <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void commit(draft.trim()); }}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="https://…"
                  autoFocus
                  className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
                />
                <p className="text-xs text-stone-500">{t("Вставьте ссылку на карту целиком. Пустое поле убирает кнопку у гостей.", "Paste the full map link. Leave it empty to hide the button from guests.")}</p>
                <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50">{t("Сохранить", "Save")}</button>
              </form>
            )}

            {target.kind === "color" && (
              <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={(event) => { event.preventDefault(); void commit(draft); }}>
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(draft) ? draft : "#e8dbc8"} onChange={(event) => setDraft(event.target.value)} className="h-14 w-20 cursor-pointer rounded-lg border border-stone-300" />
                <input value={draft} onChange={(event) => setDraft(event.target.value)} className="w-32 rounded-lg border border-stone-300 px-3 py-2.5 font-mono text-base" />
                <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50">{t("Сохранить", "Save")}</button>
              </form>
            )}
          </div>
        </div>
      )}

      <WeddingSheet open={weddingOpen} focus={weddingFocus} onClose={closeWedding}>
        {weddingForm}
      </WeddingSheet>
      {optionTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOptionTarget(null)}>
          <form role="dialog" aria-modal="true" aria-label={t("Новый вариант", "New option")} onSubmit={submitOption} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl">
            <h2 className="text-lg text-stone-900">{optionTarget === "drink" ? t("Новый напиток", "New drink") : optionTarget === "meal" ? t("Новое блюдо", "New dish") : t("Новый вариант ответа", "New answer option")}</h2>
            <input
              autoFocus
              value={optionTitle}
              onChange={(event) => setOptionTitle(event.target.value)}
              maxLength={120}
              placeholder={optionTarget === "drink" ? t("Например, Апероль", "e.g. Aperol spritz") : optionTarget === "meal" ? t("Например, Утка с яблоками", "e.g. Duck with apples") : t("Текст варианта", "Option text")}
              className="mt-3 w-full rounded-lg border border-stone-300 bg-card px-3 py-2.5 text-base"
            />
            <p className="mt-2 text-xs text-stone-500">{t("Появится в анкете у гостей сразу, без «Сохранить изменения».", "Guests will see it in the RSVP form right away — no need to save changes.")}</p>
            {optionError ? <p role="alert" className="mt-2 text-sm text-red-700">{optionError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOptionTarget(null)} className="rounded-lg px-4 py-2 text-sm text-stone-600">{t("Отмена", "Cancel")}</button>
              <button disabled={addingOption || !optionTitle.trim()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {addingOption ? t("Добавляю…", "Adding…") : t("Добавить", "Add")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {rsvpOpen && rsvpBuilder ? (
        <div role="dialog" aria-modal="true" aria-label={t("Анкета гостя", "RSVP form")} className="fixed inset-0 z-50 overflow-y-auto bg-stone-50">
          <div className="sticky top-0 z-10 border-b border-stone-200 bg-card/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">{t("Анкета гостя", "RSVP form")}</p>
                <p className="truncate text-xs text-stone-500">{t("Вопросы сохраняются сразу и сразу появляются у гостей в приглашении.", "Questions save instantly and appear in your guests’ invitation right away.")}</p>
              </div>
              <button
                type="button"
                onClick={() => { setRsvpOpen(false); reload(); }}
                className="shrink-0 rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white"
              >
                {t("Готово", "Done")}
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">{rsvpBuilder}</div>
        </div>
      ) : null}

      {musicOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setMusicOpen(false); }}>
          <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg text-stone-900">{t("Музыка приглашения", "Invitation music")}</h2>
                <p className="mt-1 text-sm text-stone-500">{t("Играет тихо после того, как гость открыл приглашение; в углу есть кнопка, чтобы выключить.", "Plays softly once a guest opens the invitation; there’s a button in the corner to turn it off.")}</p>
              </div>
              <button type="button" disabled={busy} onClick={() => setMusicOpen(false)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">{t("Закрыть", "Close")}</button>
            </div>
            <ul className="mt-4 space-y-2">
              {songs.map((song) => (
                <li key={song.id} className={`flex items-center gap-3 rounded-xl border p-3 ${music === song.url ? "border-stone-900" : "border-stone-200"}`}>
                  <audio src={song.url} controls preload="none" className="h-9 min-w-0 flex-1" />
                  <button type="button" disabled={busy || music === song.url} onClick={() => void chooseMusic(song.url)} className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-40">
                    {music === song.url ? t("Играет", "Playing") : t("Выбрать", "Choose")}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border-2 border-dashed border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-500">
                {t("＋ Загрузить песню (MP3)", "＋ Upload a song (MP3)")}
                <input ref={audioInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSong(file); }} />
              </label>
              {music && (
                <button type="button" disabled={busy} onClick={() => void chooseMusic("")} className="rounded-lg px-4 py-2.5 text-sm text-red-800 hover:bg-red-50">
                  {t("Без музыки", "No music")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
