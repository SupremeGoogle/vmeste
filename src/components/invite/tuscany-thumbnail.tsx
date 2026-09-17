import type { InviteTheme } from "@/lib/invite-theme";

export function TuscanyThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative h-56 overflow-hidden bg-[#ead6bd]" style={{ color: theme.ink }}>
      <div className="absolute inset-x-0 top-0 h-[63%] rounded-bl-[45%] bg-[url('/media/invite-tuscany/couple.webp')] bg-cover bg-center" />
      <div className="absolute inset-x-[-10%] bottom-[-5%] h-[48%] rounded-[50%_50%_0_0/35%_35%_0_0] bg-[#f3e5d2] text-center shadow-[0_-8px_20px_#3d211a33]">
        <p className="mt-7 text-[6px] uppercase tracking-[0.24em] text-[#855238]">Два сердца · одна история</p>
        <p className="mt-1 font-serif text-[18px] uppercase leading-[0.95] tracking-[0.08em]">Оливия <span className="block text-[11px] italic text-[#9a6545]">&amp;</span> Даниэль</p>
        <p className="mt-2 text-[6px] uppercase tracking-[0.16em] text-[#6f4830]">15 · 11 · 2027</p>
      </div>
      <div className="absolute bottom-3 right-4 grid h-10 w-10 rotate-[-8deg] place-items-center rounded-full border-4 border-double border-[#b47b56] bg-[#673821] text-[6px] text-[#e6c6a6] shadow-md">O · D</div>
      <div className="absolute left-3 top-4 text-[6px] uppercase leading-relaxed tracking-[0.12em] text-white drop-shadow">Two hearts<br />A brighter tomorrow</div>
    </div>
  );
}
