import { FONT_STACKS, type InviteTheme } from "@/lib/invite-theme";

export function SilkThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div
      className="relative h-[240px] overflow-hidden bg-[#f8e9e4]"
      style={{ color: theme.ink, fontFamily: FONT_STACKS[theme.headingFont] }}
    >
      <div className="absolute inset-y-0 left-0 w-[58%] bg-[url('/media/invite-silk/couple.webp')] bg-cover bg-center" />
      <div className="absolute -bottom-20 -right-14 h-[310px] w-[74%] rounded-[50%_0_0_42%] bg-[#fff8f2] shadow-[-12px_0_35px_rgba(91,48,47,.12)]" />
      <span className="absolute right-3 top-3 rounded-full border border-[#a84f49]/30 bg-white/75 px-2.5 py-1 font-sans text-[9px] tracking-wider text-[#8f3f3c]">
        НОВЫЙ МАКЕТ
      </span>
      <div className="absolute bottom-8 right-4 w-[48%] text-center">
        <span className="block text-[8px] uppercase tracking-[.2em] text-[#a84f49]">Приглашение</span>
        <span className="mt-2 block text-[26px] italic leading-[.92]">Этан<br /><span className="text-[#a84f49]">&amp;</span> Серафина</span>
        <span className="mx-auto mt-3 block h-px w-8 bg-[#a84f49]" />
        <span className="mt-2 block text-[8px] uppercase tracking-[.14em]">14 · 10 · 2027</span>
      </div>
    </div>
  );
}

