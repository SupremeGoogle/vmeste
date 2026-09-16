import { FONT_STACKS, type InviteTheme } from "@/lib/invite-theme";

export function PromiseThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative flex h-[240px] flex-col items-center justify-end overflow-hidden px-5 pb-5 text-center"
      style={{ background: `${theme.card} url('/media/invite-promise/couple.webp') center 38% / cover`, color: theme.ink, fontFamily: FONT_STACKS[theme.headingFont] }}>
      <span className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#faf6f0] via-[#faf6f0e8] to-transparent" />
      <span className="absolute right-3 top-3 rounded-full border border-white/60 bg-white/70 px-2.5 py-1 font-sans text-[9px] tracking-wider">НОВЫЙ МАКЕТ</span>
      <span className="relative" style={{ fontSize: 8, letterSpacing: ".2em", textTransform: "uppercase" }}>Приглашение на свадьбу</span>
      <span className="relative" style={{ fontSize: 29, lineHeight: 1.2, marginTop: 9 }}>Анна <i style={{ color: theme.accent }}>&amp;</i> Михаил</span>
      <span className="relative" style={{ width: 28, height: 1, background: theme.accent, margin: "12px auto" }} />
      <span className="relative" style={{ fontSize: 9, letterSpacing: ".15em" }}>21 августа 2027</span>
    </div>
  );
}
