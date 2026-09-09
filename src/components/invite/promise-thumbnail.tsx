import { FONT_STACKS, type InviteTheme } from "@/lib/invite-theme";

export function PromiseThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative flex h-[240px] flex-col items-center justify-end overflow-hidden px-5 pb-5 text-center"
      style={{ background: `${theme.card} url('/media/invite-promise/garden.webp') center 28% / cover`, color: theme.ink, fontFamily: FONT_STACKS[theme.headingFont] }}>
      <span className="absolute right-3 top-3 rounded-full border border-white/60 bg-white/70 px-2.5 py-1 font-sans text-[9px] tracking-wider">НОВЫЙ МАКЕТ</span>
      <span style={{ fontSize: 8, letterSpacing: ".2em", textTransform: "uppercase" }}>Приглашение на свадьбу</span>
      <span style={{ fontSize: 29, lineHeight: 1.2, marginTop: 9 }}>Анна <i style={{ color: theme.accent }}>&amp;</i> Михаил</span>
      <span style={{ width: 28, height: 1, background: theme.accent, margin: "12px auto" }} />
      <span style={{ fontSize: 9, letterSpacing: ".15em" }}>21 августа 2027</span>
    </div>
  );
}
