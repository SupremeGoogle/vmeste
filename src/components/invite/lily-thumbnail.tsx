/**
 * Миниатюра шаблона «Лилия»: белая полоса с именами, волна и оливковая
 * полоса под ней — то, чем шаблон отличается от остальных с первого
 * взгляда. Волна нарисована теми же градиентами, что и в самом шаблоне.
 */
export function LilyThumbnail() {
  return (
    <div className="relative h-56 overflow-hidden bg-white">
      <div className="px-4 pt-7 text-center">
        <p className="font-serif text-[15px] uppercase leading-none tracking-[0.06em] text-[#4e5744]">Александр</p>
        <p className="mt-1 text-[7px] uppercase tracking-[0.3em] text-[#7d8a72]">и</p>
        <p className="mt-0.5 font-serif text-[26px] italic leading-none text-[#4e5744]">Ксюша</p>
        <p className="mt-3 text-[6px] uppercase tracking-[0.24em] text-[#013131]">Приглашают вас на свою свадьбу</p>
      </div>
      <div
        className="absolute inset-x-0 bottom-[84px] h-5"
        style={{
          background:
            "radial-gradient(circle at 100% 0, transparent 10px, #4e5744 11px) 0 0/20px 100% repeat-x, radial-gradient(circle at 0 100%, #4e5744 10px, transparent 11px) 10px 0/20px 100% repeat-x",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[84px] bg-[#4e5744] px-5 pt-4 text-center">
        <p className="font-serif text-[15px] italic text-[#f4f2ea]">Наша история</p>
        <p className="mt-1 text-[6px] leading-relaxed text-[#cfd6c2]">
          Мы одновременно потянулись за последним попкорном
        </p>
      </div>
    </div>
  );
}
