/**
 * Миниатюра шаблона «Винил»: заставка с пластинкой на розовых лучах —
 * то самое, что гость видит первым. Собрана теми же приёмами, что и сам
 * шаблон (лучи — повторяющийся конический градиент, дорожки — радиальный),
 * поэтому не разъедется с ним при правке цветов.
 */
export function VinylThumbnail() {
  return (
    <div className="relative grid h-56 place-items-center overflow-hidden bg-[#f7dbe8]">
      <div
        className="absolute inset-[-30%] opacity-80"
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 50% 50%, #f0c0d9 0deg 11deg, #f7dbe8 11deg 22deg)",
        }}
      />
      <div
        className="relative h-24 w-24 rounded-full shadow-[0_10px_24px_#00000033]"
        style={{
          background:
            "repeating-radial-gradient(circle at 50% 50%, #1d181c 0 2px, #332b31 2px 4px)",
        }}
      >
        <span className="absolute inset-[34%] rounded-full bg-[#e8794a]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f7dbe8]" />
      </div>
      <p className="relative mt-3 px-6 text-center text-[6px] uppercase leading-relaxed tracking-[0.24em] text-[#3a2630]">
        Нажмите на пластинку,
        <br />
        чтобы открыть приглашение
      </p>
      <p className="absolute bottom-3 left-0 right-0 text-center font-serif text-[15px] uppercase tracking-[0.06em] text-[#e8794a]">
        Миша &amp; Катя
      </p>
    </div>
  );
}
