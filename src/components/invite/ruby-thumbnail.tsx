import type { InviteTheme } from "@/lib/invite-theme";

export function RubyThumbnail({ theme }: { theme: InviteTheme }) {
  return (
    <div className="relative h-full overflow-hidden bg-[#f7eee5] p-3 text-center" style={{ color: theme.ink }}>
      <div className="absolute -left-3 top-3 h-20 w-12 rotate-12 rounded-full bg-[#8e1018]/20" />
      <div className="mx-auto h-24 w-20 overflow-hidden rounded-t-[45%] border border-[#d7bfb4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/invite-ruby/couple.webp" alt="" className="h-full w-full object-cover" />
      </div>
      <span className="mt-2 block text-[7px] uppercase tracking-[.24em] text-[#8e1018]">приглашение на свадьбу</span>
      <strong className="mt-1 block font-serif text-[22px] font-normal leading-[.9]">Элеонора<br /><i className="text-[#a72c33]">&amp;</i> Джеймс</strong>
      <span className="mt-2 block text-[7px] uppercase tracking-[.18em] text-[#76514d]">17 мая 2027</span>
      <span className="mx-auto mt-3 block rounded-full bg-[#86151c] px-3 py-1.5 text-[7px] text-white">Открыть приглашение →</span>
    </div>
  );
}
