import type { InviteTheme } from "@/lib/invite-theme";

export function ConstellationThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative h-full overflow-hidden bg-[#07101f] p-3 text-center" style={{ color: theme.ink }}>
      <div className="absolute left-1/2 top-3 h-24 w-24 -translate-x-1/2 rounded-full border border-[#d5ad6c]/45 shadow-[0_0_24px_rgba(213,173,108,.18)]" />
      <div className="relative mx-auto h-24 w-[84px] overflow-hidden rounded-t-[45%] border border-white/15">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/invite-constellation/couple.webp" alt="" className="h-full w-full object-cover" />
      </div>
      <span className="mt-2 block text-[6px] uppercase tracking-[.28em] text-[#d5ad6c]">под одним небом</span>
      <strong className="mt-1 block font-serif text-[22px] font-normal leading-[.85]">Александр <i className="text-[#d5ad6c]">&amp;</i> Ева</strong>
      <span className="mt-2 inline-block rounded-full border border-white/20 px-2 py-1 text-[6px] uppercase tracking-[.15em] text-slate-300">21 июня 2027</span>
      <div className="absolute bottom-2 left-3 right-3 h-px bg-gradient-to-r from-transparent via-[#d5ad6c] to-transparent" />
    </div>
  );
}
