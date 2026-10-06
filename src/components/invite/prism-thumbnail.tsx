import type { InviteTheme } from "@/lib/invite-theme";

export function PrismThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative h-full overflow-hidden bg-[#101719] p-3 text-left" style={{ color: theme.ink }}>
      <div className="absolute -right-6 -top-8 h-28 w-16 rotate-[24deg] rounded-[45%_55%_60%_40%] border border-white/40 bg-gradient-to-br from-emerald-200/35 via-fuchsia-200/20 to-amber-200/35 shadow-[0_0_28px_rgba(188,232,222,.25)] backdrop-blur-sm" />
      <div className="relative h-24 overflow-hidden rounded-[18px] border border-white/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/invite-prism/couple.webp" alt="" className="h-full w-full object-cover object-[center_45%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101719] via-transparent to-transparent" />
      </div>
      <span className="relative mt-2 block text-[6px] uppercase tracking-[.28em] text-[#b8e5dc]">love, refracted</span>
      <strong className="relative mt-1 block font-serif text-[23px] font-normal leading-[.78] tracking-[-.06em] text-white">Лев и София</strong>
      <span className="relative mt-2 inline-block rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[6px] uppercase tracking-[.14em] text-white backdrop-blur">02 августа 2027</span>
      <div className="absolute bottom-0 left-0 h-12 w-full bg-[radial-gradient(circle_at_20%_100%,rgba(126,193,181,.32),transparent_42%),radial-gradient(circle_at_78%_100%,rgba(185,150,203,.28),transparent_38%)]" />
    </div>
  );
}

