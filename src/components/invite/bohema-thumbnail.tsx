export function BohemaThumbnail() {
  return (
    <div className="relative h-56 overflow-hidden bg-[#fbf8ea]" style={{ backgroundImage: "url('/media/invite-bohema/landscape.webp')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute left-1/2 top-5 h-64 w-44 -translate-x-1/2 rounded-[48%_48%_30%_30%/31%_31%_7%_7%] border border-[#293222] bg-[#fbf8ea] text-center">
        <div className="absolute -left-4 -top-3 h-16 w-52 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: "url('/media/invite-bohema/floral-garland.webp')" }} />
        <div className="pt-20">
          <p className="font-serif text-[24px] uppercase leading-none text-[#293222]">Николай</p>
          <p className="-mt-1 pl-5 font-serif text-[31px] italic leading-none text-[#a57a34]">и Диана</p>
          <p className="mt-3 px-3 text-[6px] uppercase tracking-[.05em] text-[#555b4c]">Приглашают вас на свадьбу</p>
          <p className="mt-3 font-serif text-[12px] uppercase text-[#a57a34]">20 ноября 2027</p>
        </div>
      </div>
    </div>
  );
}
