import { FONT_STACKS, type InviteTheme } from "@/lib/invite-theme";

export function EvergreenThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div
      className="relative flex h-[240px] flex-col justify-end overflow-hidden bg-[#172018] text-left"
      style={{ color: "#f4f0e8", fontFamily: FONT_STACKS[theme.headingFont] }}
    >
      <div className="absolute inset-y-0 left-0 w-[58%] bg-[url('/media/invite-evergreen/couple.webp')] bg-cover bg-[center_35%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#172018]/30 to-[#172018]" />
      <span className="absolute right-3 top-3 rounded-full border border-[#b89a66]/60 bg-[#172018]/75 px-2.5 py-1 font-sans text-[9px] tracking-wider text-[#ddc18d]">
        НОВЫЙ МАКЕТ
      </span>
      <div className="relative ml-[42%] px-5 pb-6">
        <span className="block text-[8px] uppercase tracking-[.26em] text-[#c2a875]">Приглашение</span>
        <span className="mt-3 block text-[27px] leading-[.95]">Александр<br /><i className="text-[#b8975e]">&amp;</i> Елизавета</span>
        <span className="mt-4 block h-px w-8 bg-[#b8975e]" />
        <span className="mt-3 block text-[9px] tracking-[.16em]">18 · 10 · 2027</span>
      </div>
    </div>
  );
}
