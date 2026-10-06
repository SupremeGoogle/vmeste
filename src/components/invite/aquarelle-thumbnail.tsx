/** Miniature of the invitation cover. */
export function AquarelleThumbnail() {
  return (
    <div className="relative grid h-56 grid-cols-[.9fr_1fr] items-center overflow-hidden bg-[#faf3e9] p-3">
      <div className="flex flex-col justify-center pl-2">
        <span className="mb-4 h-px w-5 bg-[#7c1f1c]" />
        <span className="mb-2 text-[5px] font-semibold uppercase tracking-[.18em] text-[#2f6b5a]">Свадебное приглашение</span>
        <span className="font-serif text-[18px] uppercase leading-[1.15] text-[#46627d]">Александр</span>
        <span className="font-serif text-[12px] italic text-[#2f6b5a]">и</span>
        <span className="font-serif text-[23px] italic leading-none text-[#7c1f1c]">Ксюша</span>
        <span className="mt-5 text-[6px] uppercase tracking-wider text-[#7c1f1c]">20 ноября 2027</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/invite-aquarelle/couple.webp" alt="" className="h-[190px] w-full rotate-2 border-[5px] border-white object-cover shadow-md" />
    </div>
  );
}
