import Image from "next/image";
import type { Lang } from "@/lib/i18n";

/** Пропорции файлов логотипа: ширина к высоте. */
const LOGO_RATIO = 552 / 256;
const MONOGRAM_RATIO = 445 / 467;

type Props = {
  size?: number;
  /**
   * Переключаться ли на светлую версию в тёмной теме (`data-theme="dark"`).
   * Титульной странице это не нужно: у неё всегда светлый фон.
   */
  adaptive?: boolean;
  /** Язык подписи логотипа для читалок: «Вместе» / «Vmeste». */
  lang?: Lang;
};

/**
 * Две картинки — винная и светлая, видна одна из них. Переключает CSS
 * (`.brand-on-light` / `.brand-on-dark` в globals.css), а не скрипт: тема
 * ставится до гидратации, и логотип не должен мигать при загрузке.
 */
function BrandImage({ src, light, alt, width, height, adaptive, priority }: {
  src: string; light: string; alt: string; width: number; height: number; adaptive: boolean; priority?: boolean;
}) {
  const style = { width, height, objectFit: "contain" as const, flexShrink: 0 };
  const image = <Image src={src} alt={alt} width={width} height={height} unoptimized priority={priority} style={style} className={adaptive ? "brand-on-light" : undefined} />;
  if (!adaptive) return image;
  return (
    <>
      {image}
      <Image src={light} alt={alt} width={width} height={height} unoptimized priority={priority} style={style} className="brand-on-dark" />
    </>
  );
}

/** Монограмма «В» — там, где места хватает только на знак. */
export function BrandMark({ size = 44, adaptive = true }: Props) {
  const width = Math.round(size * MONOGRAM_RATIO);
  return <BrandImage src="/media/brand/vmeste-monogram.png" light="/media/brand/vmeste-monogram-light.png" alt="" width={width} height={size} adaptive={adaptive} />;
}

/** Логотип целиком: монограмма и надпись «Вместе» — одна картинка, текстом надпись не дублируется. */
export function BrandLogo({ size = 44, adaptive = true, lang = "ru" }: Props) {
  const width = Math.round(size * LOGO_RATIO);
  return <BrandImage src="/media/brand/vmeste-logo.webp" light="/media/brand/vmeste-logo-light.webp" alt={lang === "en" ? "Vmeste" : "Вместе"} width={width} height={size} adaptive={adaptive} priority />;
}
