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
import { TUSCANY_SAMPLE_IMAGES } from "@/lib/invite-templates/tuscany-assets";
import { BURGUNDY_SAMPLE_IMAGES } from "@/lib/invite-templates/burgundy-assets";
import { ROSERAIE_SAMPLE_IMAGES } from "@/lib/invite-templates/roseraie-assets";
import { FLORAL_GARDEN_SAMPLE_IMAGES } from "@/lib/invite-templates/floral-garden-assets";
import type { InviteImageSlot } from "@/lib/invite-image-slots";

type SaveResult = { ok: true } | { ok: false; message: string };
type Target = { kind: "image" | "link" | "color"; blockId: string; path: string; current: string };
export type BlockAction = "up" | "down" | "hide" | "show" | "add-detail" | "remove-detail" | "duplicate" | "delete" | "insert-after" | "move-to";

const SAMPLES: Record<string, readonly string[]> = {
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
  const [rsvpOpen, setRsvpOpen] = useState(rsvpOpenInitially);
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
    ...(SAMPLES[template] ?? []).map((url, index) => ({ id: `sample-${index}`, url, alt: `Пример шаблона ${index + 1}` })),
  ]);
  const [songs, setSongs] = useState(audio);
  const [music, setMusic] = useState(musicUrl);
  const [musicOpen, setMusicOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [photos, setPhotos] = useState(photoSlots);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(EDIT_HINT);
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
      found.set(`${blockId}/${key}`, { blockId, key, label: node.dataset.componentLabel ?? "Элемент", removed: node.dataset.componentRemoved === "true" });
    });
    setComponents([...found.values()]);
    try {
      const meta = document.querySelector('meta[name="vm-style"]')?.getAttribute("content");
      if (meta) setTemplateStyle(JSON.parse(meta));
    } catch { /* Панель остаётся доступна и без метаданных оформления. */ }
    if (scrollY.current > 0) frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll", y: scrollY.current }, "*");
  }, []);

  function saveDesign(next: { accent: string | null; fonts: Record<string, string> }, done: string) {
    setAccent(next.accent);
    setFonts(next.fonts);
    setNotice("Сохраняю оформление…");
    startSaving(async () => {
      const result = await saveStyle(next);
      setNotice(result.ok ? done : result.message);
      if (result.ok) setRevision((value) => value + 1);
    });
  }

  function toggleIntro() {
    const next = !intro;
    setNotice("Сохраняю…");
    startSaving(async () => {
      const result = await saveIntro(!next);
      if (result.ok) setIntro(next);
      setNotice(result.ok ? (next ? "Заставка включена — гости увидят её при открытии" : "Заставка выключена — приглашение откроется сразу") : result.message);
    });
  }

  /** Действие со структурой: сохранить, обновить список разделов и страницу. */
  const runAction = useCallback((input: { blockId: string; action: BlockAction; index?: number; type?: string }, done: string) => {
    setNotice("Обновляю разделы…");
    startSaving(async () => {
      const result = await blockAction(input);
      setNotice(result.ok ? done : result.message);
      if (result.ok) {
        router.refresh();
        setRevision((value) => value + 1);
      }
    });
  }, [blockAction, router]);

  function scrollToSection(id: string) {
    frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll-to", blockId: id }, "*");
  }

  const changeComponent = useCallback((blockId: string, key: string, action: "remove" | "restore") => {
    setNotice(action === "remove" ? "Удаляю элемент…" : "Возвращаю элемент…");
    startSaving(async () => {
      try {
        const result = await saveField({ blockId, path: `component:${key}`, value: action });
        setNotice(result.ok ? action === "remove" ? "Элемент удалён — его можно вернуть в списке разделов" : "Элемент возвращён" : result.message);
        if (result.ok) {
          setLastRemoved(action === "remove" ? { blockId, key } : null);
          setRevision(value => value + 1);
        }
      } catch { setNotice("Не удалось сохранить элемент. Попробуйте ещё раз."); }
    });
  }, [saveField]);

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
        setNotice("Сохраняю…");
        startSaving(async () => {
          const result = await saveField({ blockId, path, value });
          setNotice(result.ok ? "Сохранено" : result.message);
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
        setToDelete(sections.find((item) => item.id === blockId) ?? { id: blockId, type: "", label: "раздел", hint: "", visible: true });
        return;
      }
      if (message.kind === "block-action" && blockId && message.action === "duplicate") { runAction({ blockId, action: "duplicate" }, "Копия раздела добавлена ниже"); return; }
      if (message.kind === "block-action" && blockId && (message.action === "up" || message.action === "down" || message.action === "hide" || message.action === "add-detail" || message.action === "remove-detail")) {
        const action = message.action as BlockAction;
        const index = typeof message.index === "number" ? message.index : undefined;
        setNotice(action === "add-detail" ? "Добавляю новую деталь…" : action === "remove-detail" ? "Удаляю деталь…" : "Обновляю разделы…");
        startSaving(async () => {
          const result = await blockAction({ blockId, action, index });
          setNotice(result.ok ? (action === "add-detail" ? "Деталь добавлена — нажмите на неё, чтобы заполнить" : action === "remove-detail" ? "Деталь удалена" : action === "hide" ? "Раздел скрыт — вернуть можно кнопкой «Скрытые разделы»" : "Сохранено") : result.message);
          if (result.ok) { reload(); router.refresh(); }
        });
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [blockAction, saveField, openWedding, runAction, sections, router, changeComponent, readCanvas, rsvpBuilder]);

  const choices = (() => {
    if (!target || target.kind !== "image") return items;
    const current = target.current && !items.some((item) => item.url === target.current)
      ? [{ id: "current", url: target.current, alt: "Текущее изображение" }] : [];
    return [...current, ...items].filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index);
  })();

  async function commit(value: string) {
    if (!target) return;
    setBusy(true);
    setNotice("Сохраняю…");
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
    setNotice("Сохранено");
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
    if (!put.ok) throw new Error("Хранилище не приняло файл");
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
    setNotice("Загружаю фотографию…");
    try {
      const asset = await uploadFile(file);
      setItems((current) => [asset, ...current]);
      setDraft(asset.url);
      setPhotoSettings(defaultPhotoAdjustment());
      setNotice("Фотография загружена. Настройте кадр и нажмите «Сохранить фотографию».");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не получилось загрузить фотографию");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function chooseMusic(url: string) {
    setBusy(true);
    setNotice("Сохраняю музыку…");
    const result = await saveMusic(url);
    setBusy(false);
    setNotice(result.ok ? (url ? "Музыка сохранена" : "Музыка выключена") : result.message);
    if (result.ok) {
      setMusic(url);
      setMusicOpen(false);
      reload();
    }
  }

  async function uploadSong(file: File) {
    setBusy(true);
    setNotice("Загружаю песню…");
    try {
      const asset = await uploadFile(file);
      setSongs((current) => [asset, ...current]);
      await chooseMusic(asset.url);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не получилось загрузить песню");
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
      setNotice(result.ok ? "Фотография и кадрирование сохранены" : result.message);
      if (result.ok) {
        setPhotos((current) => current.map((slot) => slot.blockId === target.blockId && slot.path === target.path ? { ...slot, url: draft, settings: photoSettings } : slot));
        setTarget(null);
        reload();
      }
    } catch { setNotice("Не удалось сохранить. Проверьте соединение и попробуйте снова."); }
    finally { setBusy(false); }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-800 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stone-900 px-4 py-3 text-white sm:px-5">
        <div className="min-w-0">
          <p className="hidden text-sm font-medium sm:block">Редактирование на странице</p>
          <p className={`mt-0.5 text-xs ${saving || busy ? "text-amber-200" : "text-white/60"} ${notice === EDIT_HINT ? "hidden sm:block" : ""}`}>{notice}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openWedding()}
            className={`rounded-lg px-3 py-2 text-xs ${weddingReady ? "border border-white/20 hover:bg-white/10" : "bg-amber-200 font-medium text-stone-900"}`}
          >
            Имена, дата и место
          </button>
          {warnings.length > 0 && (
            <button type="button" onClick={() => setWarningsOpen((open) => !open)} className="rounded-lg border border-amber-200/50 px-3 py-2 text-xs text-amber-100 hover:bg-white/10" aria-expanded={warningsOpen}>
              Перед отправкой: {warnings.length}
            </button>
          )}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10 sm:hidden" aria-expanded={moreOpen}>
            {moreOpen ? "Скрыть" : "Ещё"}
          </button>
          <div className={`${moreOpen ? "flex" : "hidden"} w-full flex-wrap items-center gap-2 sm:contents`}>
          <button type="button" onClick={() => setPhone(!phone)} className="hidden rounded-lg border border-white/20 px-3 py-2 text-xs sm:block">{phone ? "Широкий экран" : "Посмотреть на телефоне"}</button>
          <button type="button" onClick={() => setSectionsOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10 lg:hidden" aria-expanded={sectionsOpen}>
            Разделы{hidden.length > 0 ? ` · скрыто ${hidden.length}` : ""}
          </button>
          <button type="button" onClick={() => setDesignOpen(true)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
            Цвета и шрифты
          </button>
          {introAvailable && (
            <button type="button" onClick={toggleIntro} disabled={saving} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10" aria-pressed={intro} title="Экран-заставка, который гость видит при открытии приглашения">
              Заставка: {intro ? "включена" : "выключена"}
            </button>
          )}
          <button type="button" onClick={() => setMusicOpen(true)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
            {music ? "♪ Музыка" : "♪ Добавить музыку"}
          </button>
          {visiblePhotos.length > 0 && <button type="button" onClick={() => setImagesOpen((open) => !open)} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Все фотографии: {visiblePhotos.length}</button>}
          <a href={previewHref} target="_blank" rel="noopener noreferrer" aria-disabled={saving || busy} onClick={(event) => { if (saving || busy) event.preventDefault(); }} className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-medium text-stone-900 aria-disabled:opacity-50">Открыть как гость ↗</a>
          </div>
        </div>
      </div>

      {!weddingReady && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-amber-100/10 px-4 py-3 text-sm text-amber-50 sm:px-5">
          <span>Начните с имён и даты — они сразу появятся на обложке, в «Где» и в обратном отсчёте. Всё остальное правится прямо на странице.</span>
          <button type="button" onClick={() => openWedding("names")} className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-medium text-stone-900">Указать</button>
        </div>
      )}

      {warningsOpen && warnings.length > 0 && (
        <ul className="list-disc space-y-1 border-b border-white/10 bg-stone-900/80 py-3 pr-4 pl-9 text-xs text-amber-100 sm:pr-5">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}

      {imagesOpen && (
        <div className="border-b border-white/10 bg-stone-900 px-4 py-4 text-white sm:px-5">
          <p className="text-sm font-medium">Фотографии в приглашении</p>
          <p className="mt-1 text-xs text-white/60">Здесь собраны фотографии всех разделов. Выберите карточку, загрузите свой снимок и сохраните. Фото из образца: {visiblePhotos.filter((photo) => displayedPhotoUrl(photo).startsWith("/media/invite-")).length}.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePhotos.map((photo) => (
              <button key={`${photo.blockId}:${photo.path}`} type="button" onClick={() => openPhotoSlot(photo)} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-2 text-left hover:border-amber-200">
                {displayedPhotoUrl(photo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayedPhotoUrl(photo)} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-stone-700 object-cover" />
                ) : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/30 text-2xl text-white/50">＋</span>}
                <span className="min-w-0"><strong className="block text-sm font-medium">{photo.label}</strong><span className="mt-1 block text-xs text-amber-200">{displayedPhotoUrl(photo).startsWith("/media/invite-") ? "Фото из образца · заменить" : photo.url ? "Свое фото · изменить" : "Добавить фото"}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {lastRemoved && <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-stone-900 px-4 py-2 text-xs text-white/70"><span>Элемент удалён</span><button type="button" disabled={saving} onClick={() => changeComponent(lastRemoved.blockId, lastRemoved.key, "restore")} className="rounded-lg px-3 py-2 font-medium text-amber-200 hover:bg-white/5 disabled:opacity-40">Отменить удаление</button></div>}
      <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className={`${sectionsOpen ? "block max-h-[60vh]" : "hidden"} border-b border-white/10 bg-[#211c19] lg:block lg:max-h-none lg:border-r lg:border-b-0`} aria-label="Разделы приглашения">
        <div className="lg:sticky lg:top-0 lg:h-[calc(78vh+3rem)]">
          <SectionsPanel
            sections={sections}
            components={components}
            onComponentAction={changeComponent}
            onScrollToComponent={(blockId, key) => frame.current?.contentWindow?.postMessage({ source: "invite-editor", kind: "scroll-component", blockId, path: key }, "*")}
            busy={saving || busy}
            onScrollTo={scrollToSection}
            onToggle={(id, visible) => runAction({ blockId: id, action: visible ? "show" : "hide" }, visible ? "Раздел снова на странице" : "Раздел скрыт — вернуть можно «глазом» в списке")}
            onMove={(id, index) => runAction({ blockId: id, action: "move-to", index }, "Порядок разделов сохранён")}
            onDuplicate={(id) => runAction({ blockId: id, action: "duplicate" }, "Копия раздела добавлена ниже")}
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
          title="Визуальный редактор приглашения"
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
          onAccent={(value) => saveDesign({ accent: value, fonts }, value ? "Цвет сохранён" : "Цвета как в шаблоне")}
          onFont={(from, to) => {
            const next = { ...fonts };
            if (!to || to === from) delete next[from];
            else next[from] = to;
            saveDesign({ accent, fonts: next }, "Шрифт сохранён");
          }}
          onReset={() => saveDesign({ accent: null, fonts: {} }, "Оформление как в шаблоне")}
        />
      )}

      {insertAfter !== undefined && (
        <TypePicker
          types={blockTypes}
          onClose={() => setInsertAfter(undefined)}
          onPick={(type) => {
            const afterId = insertAfter;
            setInsertAfter(undefined);
            runAction({ blockId: afterId ?? "", action: "insert-after", type }, "Раздел добавлен — нажмите на текст, чтобы заполнить");
          }}
        />
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setToDelete(null); }}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl">
            <p className="font-serif text-2xl text-stone-900">Удалить раздел?</p>
            <p className="mt-2 text-sm text-stone-600">«{toDelete.label}{toDelete.hint ? ` · ${toDelete.hint}` : ""}» исчезнет вместе с текстами и фотографиями. Если раздел просто не нужен сейчас — лучше скрыть его «глазом».</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setToDelete(null)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Отмена</button>
              <button type="button" onClick={() => { runAction({ blockId: toDelete.id, action: "hide" }, "Раздел скрыт"); setToDelete(null); }} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Скрыть</button>
              <button type="button" onClick={() => { runAction({ blockId: toDelete.id, action: "delete" }, "Раздел удалён"); setToDelete(null); }} className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTarget(null); }}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg text-stone-900">
                {target.kind === "image" ? "Заменить фотографию" : target.kind === "link" ? "Ссылка" : "Цвет палитры"}
              </h2>
              <button type="button" disabled={busy} onClick={() => setTarget(null)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">Закрыть</button>
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
                  <span className="mt-1 text-sm">Без фотографии</span>
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
                  <span className="text-2xl">＋</span><span className="mt-1">Загрузить свою</span>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
                </label>
                <p className="col-span-full text-xs leading-5 text-stone-500">
                  Фотографию можно убрать сейчас и вернуть позже: пустое место останется доступным в редакторе.
                </p>
                {draft && <div className="col-span-full"><PhotoControls src={draft} value={photoSettings} onChange={setPhotoSettings} ratio={photoRatio} /></div>}
                <p role="status" className="col-span-full text-sm text-stone-600">{notice}</p>
                <button type="button" disabled={busy} onClick={() => void commitPhoto()} className="col-span-full rounded-xl bg-stone-900 px-4 py-3 text-sm text-white disabled:opacity-50">{busy ? "Сохраняю…" : draft ? "Сохранить фотографию" : "Убрать фотографию"}</button>
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
                <p className="text-xs text-stone-500">Вставьте ссылку на карту целиком. Пустое поле убирает кнопку у гостей.</p>
                <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50">Сохранить</button>
              </form>
            )}

            {target.kind === "color" && (
              <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={(event) => { event.preventDefault(); void commit(draft); }}>
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(draft) ? draft : "#e8dbc8"} onChange={(event) => setDraft(event.target.value)} className="h-14 w-20 cursor-pointer rounded-lg border border-stone-300" />
                <input value={draft} onChange={(event) => setDraft(event.target.value)} className="w-32 rounded-lg border border-stone-300 px-3 py-2.5 font-mono text-base" />
                <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50">Сохранить</button>
              </form>
            )}
          </div>
        </div>
      )}

      <WeddingSheet open={weddingOpen} focus={weddingFocus} onClose={closeWedding}>
        {weddingForm}
      </WeddingSheet>
      {rsvpOpen && rsvpBuilder ? (
        <div role="dialog" aria-modal="true" aria-label="Анкета гостя" className="fixed inset-0 z-50 overflow-y-auto bg-stone-50">
          <div className="sticky top-0 z-10 border-b border-stone-200 bg-card/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">Анкета гостя</p>
                <p className="truncate text-xs text-stone-500">Вопросы сохраняются сразу и сразу появляются у гостей в приглашении.</p>
              </div>
              <button
                type="button"
                onClick={() => { setRsvpOpen(false); reload(); }}
                className="shrink-0 rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white"
              >
                Готово
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
                <h2 className="text-lg text-stone-900">Музыка приглашения</h2>
                <p className="mt-1 text-sm text-stone-500">Играет тихо после того, как гость открыл приглашение; в углу есть кнопка, чтобы выключить.</p>
              </div>
              <button type="button" disabled={busy} onClick={() => setMusicOpen(false)} className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100">Закрыть</button>
            </div>
            <ul className="mt-4 space-y-2">
              {songs.map((song) => (
                <li key={song.id} className={`flex items-center gap-3 rounded-xl border p-3 ${music === song.url ? "border-stone-900" : "border-stone-200"}`}>
                  <audio src={song.url} controls preload="none" className="h-9 min-w-0 flex-1" />
                  <button type="button" disabled={busy || music === song.url} onClick={() => void chooseMusic(song.url)} className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-40">
                    {music === song.url ? "Играет" : "Выбрать"}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border-2 border-dashed border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-500">
                ＋ Загрузить песню (MP3)
                <input ref={audioInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSong(file); }} />
              </label>
              {music && (
                <button type="button" disabled={busy} onClick={() => void chooseMusic("")} className="rounded-lg px-4 py-2.5 text-sm text-red-800 hover:bg-red-50">
                  Без музыки
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
