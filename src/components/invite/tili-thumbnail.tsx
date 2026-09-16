/** Миниатюра «Тили-тесто»: гирлянда, два полароида и имена — первый экран шаблона. */
export function TiliThumbnail() {
  const flags = ["#C09085", "#C8A87A", "#9EAD98", "#C0A898", "#C09085", "#C8A87A", "#9EAD98"];
  return (
    <div className="relative h-[240px] overflow-hidden bg-[#f8f1ea] text-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <div className="absolute inset-x-[6%] top-[10px] h-px bg-[#BFAF9F]" />
      <div className="absolute inset-x-0 top-[6px] flex justify-around px-4">
        {flags.map((color, index) => (
          <span
            key={index}
            className="block h-0 w-0"
            style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `12px solid ${color}` }}
          />
        ))}
      </div>
      <p className="pt-9 text-[15px] italic text-[#8B6914]" style={{ fontFamily: "'Playfair Display', serif" }}>тили ~ тили тесто</p>
      <div className="mt-3 flex justify-center gap-3">
        {["/media/invite-tili/bride-child.webp", "/media/invite-tili/groom-child.webp"].map((src, index) => (
          <div
            key={src}
            className="w-[78px] bg-[#FEFCF9] p-[6px] pb-4 shadow-[0_6px_18px_rgba(61,43,39,0.22)]"
            style={{ transform: `rotate(${index === 0 ? -4.5 : 3}deg)` }}
          >
            {/* Файлы шаблона лежат в public — размеры известны, но оптимизатор здесь не нужен. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="aspect-square w-full bg-[#f0f0f0] object-contain" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[17px] font-light uppercase tracking-[0.25em] text-[#8B6914]">Диана · Виктор</p>
    </div>
  );
}
