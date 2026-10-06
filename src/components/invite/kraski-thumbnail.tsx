export function KraskiThumbnail() {
  return (
    <div className="flex h-56 overflow-hidden bg-white">
      <div className="h-full w-[56%] bg-cover bg-center" style={{ backgroundImage: "url('/media/invite-kraski/hero.webp')" }} />
      <div className="flex w-[44%] flex-col items-center justify-center px-2 text-center text-[#161616]">
        <p className="font-serif text-[17px] uppercase leading-none">Данил</p>
        <p className="-mt-0.5 font-serif text-[13px] italic text-stone-300">и</p>
        <p className="-mt-0.5 font-serif text-[17px] uppercase leading-none">Камила</p>
        <p className="mt-3 font-serif text-[10px]">Дорогие гости!</p>
        <span className="my-2 h-px w-7 bg-black" />
        <p className="text-[5px] leading-relaxed">Мы рады пригласить вас на свадьбу</p>
        <p className="mt-2 text-[7px] tracking-widest">20/11/2027</p>
      </div>
    </div>
  );
}
