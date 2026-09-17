import type { InviteTheme } from "@/lib/invite-theme";

export function PearlThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative h-56 overflow-hidden bg-[#f4f2ed] p-3 text-center" style={{ color: theme.ink }}>
      <div className="absolute -left-5 top-8 h-24 w-16 rotate-12 rounded-[70%_30%] border border-[#bfc3ba] opacity-60" />
      <div className="absolute -right-6 top-16 h-28 w-20 -rotate-12 rounded-[30%_70%] border border-[#bfc3ba] opacity-60" />
      <p className="relative z-10 m-0 text-[6px] uppercase tracking-[0.28em] text-[#7d8278]">A love story</p>
      <div className="relative z-10 mx-auto mt-2 h-28 w-24 overflow-hidden rounded-[48%_48%_44%_44%/34%_34%_58%_58%] border-2 border-white bg-[url('/media/invite-pearl/couple.webp')] bg-cover bg-center shadow-md ring-1 ring-[#cbc9c1]" />
      <p className="relative z-10 mt-2 font-serif text-[17px] italic leading-none">Анна <span className="text-[#aaa79e]">&amp;</span> Михаил</p>
      <span className="relative z-10 mx-auto mt-2 block h-1.5 w-1.5 rotate-45 border border-[#aaa99f]" />
      <p className="relative z-10 mt-2 text-[7px] uppercase tracking-[0.18em] text-[#777a73]">14 · 06 · 2027</p>
      <div className="absolute inset-x-4 bottom-3 h-1.5 rounded-full bg-gradient-to-r from-[#dedbd3] via-[#9ea69c] to-[#6d786b] opacity-70" />
    </div>
  );
}
