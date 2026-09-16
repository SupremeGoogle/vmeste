export const EVERGREEN_CSS = `
body{background:#111812;color:var(--fg);font-size:17px;background-image:radial-gradient(circle at 15% 10%,#34463855,transparent 34%),radial-gradient(circle at 88% 55%,#25332966,transparent 38%),repeating-linear-gradient(120deg,#ffffff05 0 1px,transparent 1px 5px)}
.sheet.evergreen{max-width:38rem;background:var(--card);box-shadow:0 24px 100px #0008;overflow:hidden}
.evergreen [data-evergreen-block]{position:relative;margin:0;padding:4.5rem 2.5rem;overflow:hidden}
.evergreen .eg-cover{min-height:96svh;padding:0;display:flex;align-items:flex-end;color:#fff;background:#101710}
.eg-cover-media{position:absolute;inset:0}.eg-cover-media img{width:100%;height:100%;object-fit:cover;object-position:center 35%;display:block}
.eg-cover-media::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#10171018 20%,#10171080 63%,#101710f5 100%),linear-gradient(90deg,#10171022,#10171000)}
.eg-cover-copy{position:relative;z-index:2;width:100%;padding:7rem 2.4rem 3.2rem;text-align:left}
.eg-eyebrow,.eg-date{margin:0;font:500 .64rem/1.7 var(--sans);letter-spacing:.26em;text-transform:uppercase;color:#dcc28f}
.evergreen .eg-names{margin:.9rem 0 1.3rem;font:400 clamp(3.5rem,13vw,5.35rem)/.88 var(--serif);letter-spacing:-.055em;text-transform:none;color:#fff;max-width:10ch}
.eg-names .eg-person{display:block}.eg-names .eg-amp{display:inline;color:#c4a264;font-style:italic;font-size:.72em;padding-right:.04em}
.eg-cover-subtitle{max-width:25rem;margin:1.4rem 0 0;font-size:.78rem;line-height:1.8;letter-spacing:.13em;text-transform:uppercase;color:#eee7dc}
.eg-gold-line{display:block;width:2.8rem;height:1px;margin:1.5rem 0;background:#c4a264}
.evergreen .eg-intro{text-align:center;background:#f4f0e8;padding-top:5.5rem;padding-bottom:5.5rem}
.eg-intro h2,.eg-location h2,.eg-section-title{font:400 clamp(2rem,7vw,2.8rem)/1.15 var(--serif);letter-spacing:-.025em;text-transform:none;margin:0 auto 1.5rem;max-width:14ch}
.eg-intro .eg-copy{max-width:27rem;margin:0 auto;color:var(--muted);line-height:1.9;white-space:pre-line}
.evergreen .eg-gallery{padding:0;background:#172018;color:#f4f0e8}
.eg-location-head{padding:4rem 2.5rem 2.1rem;text-align:center}.eg-location-head h2{color:#f4f0e8;margin-bottom:0}
.eg-photo{position:relative;min-height:28rem;overflow:hidden}.eg-photo img{display:block;width:100%;height:100%;min-height:28rem;object-fit:cover;position:absolute;inset:0;transition:transform 1.2s ease}.eg-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#111812cc 0,transparent 48%)}
.eg-photo figcaption{position:absolute;z-index:2;left:2rem;right:2rem;bottom:2rem;text-align:left;color:#fff;font:.72rem/1.7 var(--sans);letter-spacing:.18em;text-transform:uppercase}
.evergreen .eg-venue{background:#f4f0e8;text-align:left;padding-top:3.6rem;padding-bottom:3.6rem}
.eg-label{font:.62rem/1.4 var(--sans);letter-spacing:.24em;text-transform:uppercase;color:var(--accent);margin:0 0 .7rem}
.eg-venue h2{font:400 2.15rem/1.15 var(--serif);margin:0 0 .8rem;text-align:left}.eg-address{margin:0;color:var(--muted);font:.72rem/1.7 var(--sans);letter-spacing:.14em;text-transform:uppercase}.eg-note{margin:1.7rem 0 0;padding-top:1.5rem;border-top:1px solid var(--line);line-height:1.8;white-space:pre-line}
.evergreen .eg-timeline{background:#ebe5da;text-align:left}.eg-timeline .eg-section-title{text-align:left;margin-left:0}.eg-schedule{list-style:none;padding:0;margin:2.5rem 0 0}.eg-schedule li{display:grid;grid-template-columns:4.3rem 1fr;gap:1.2rem;padding:1.15rem 0;border-top:1px solid #cfc5b5}.eg-schedule time{font:italic 1rem/1.4 var(--serif);color:var(--leaf)}.eg-schedule strong{display:block;font-weight:400;font-size:1.1rem}.eg-schedule small{display:block;margin-top:.2rem;color:var(--muted);font-size:.8rem}
.evergreen .eg-dress{background:#172018;color:#f2ede5;text-align:center}.eg-dress .eg-section-title{color:#fff}.eg-dress-copy{max-width:25rem;margin:0 auto;color:#c9c6bc;line-height:1.85;white-space:pre-line}.eg-palette{display:flex;justify-content:center;gap:.7rem;margin-top:2.2rem}.eg-palette i{display:block;width:2.65rem;height:2.65rem;border-radius:50%;border:1px solid #ffffff44;box-shadow:0 5px 20px #0004}
.evergreen .eg-rsvp{text-align:center;background:#f4f0e8}.eg-rsvp .eg-copy{max-width:25rem;margin:0 auto;color:var(--muted);line-height:1.85;white-space:pre-line}.eg-rsvp .cta{margin-top:2rem;display:inline-flex;min-height:3.4rem;align-items:center;padding:0 2rem;background:#1b2b20;color:#fff;border-radius:.2rem;font:500 .72rem var(--sans);letter-spacing:.13em;text-transform:uppercase}
.evergreen .eg-closing{text-align:center;min-height:26rem;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(#172018ef,#172018ef),url('/media/invite-evergreen/venue.webp') center/cover;color:#f4f0e8}.eg-closing h2{color:#fff}.eg-closing .eg-copy{max-width:24rem;margin:0 auto;color:#cec8bc;white-space:pre-line}.eg-closing .eg-gold-line{margin:1.8rem auto}
.evergreen .foot{background:#111812;color:#a9aa9d;padding:1.5rem;text-align:center;font:.65rem var(--sans);letter-spacing:.12em}
.eg-motion .evergreen [data-evergreen-block]{opacity:0;transform:translateY(24px);transition:opacity 1s ease,transform 1s ease}.eg-motion .evergreen [data-evergreen-block].eg-in{opacity:1;transform:none}.eg-motion .evergreen .eg-cover{opacity:1;transform:none}.eg-in .eg-photo img{transform:scale(1.025)}
@media(max-width:390px){.evergreen [data-evergreen-block]{padding-left:1.5rem;padding-right:1.5rem}.eg-cover-copy{padding-left:1.5rem;padding-right:1.5rem}.eg-location-head{padding-left:1.5rem;padding-right:1.5rem}.eg-palette{gap:.45rem}.eg-palette i{width:2.3rem;height:2.3rem}}
@media(prefers-reduced-motion:reduce){.eg-motion .evergreen [data-evergreen-block]{opacity:1;transform:none;transition:none}.eg-photo img{transition:none}}
`.replace(/\n/g, "");

export const EVERGREEN_EDITOR_CSS = `
html.eg-editing body{padding:0;background:#263228}.eg-editing .sheet.evergreen{box-shadow:none}.eg-editing .evergreen [data-evergreen-block]{opacity:1;transform:none;overflow:visible}
[data-inline-edit],[data-image-edit]{cursor:pointer;outline:1px dashed transparent;outline-offset:6px;transition:outline-color .18s,background .18s}
[data-inline-edit]:hover,[data-inline-edit]:focus{outline-color:#d7b779;background:#fff3}
[data-inline-edit][contenteditable=true]{outline:2px solid #d7b779;background:#fff4;cursor:text}
[data-image-edit]:hover{outline:3px solid #d7b779;outline-offset:-3px}
.eg-edit-badge{position:absolute;z-index:20;right:.75rem;top:.75rem;display:flex;gap:.35rem;opacity:0;transform:translateY(-4px);transition:.18s}
[data-evergreen-block]:hover>.eg-edit-badge{opacity:1;transform:none}.eg-edit-badge button{border:1px solid #ffffff40;background:#111812e8;color:#fff;padding:.45rem .6rem;border-radius:.35rem;font:600 .65rem var(--sans);cursor:pointer;box-shadow:0 4px 16px #0004}
.eg-edit-tip{position:fixed;z-index:50;left:50%;bottom:1rem;transform:translateX(-50%);padding:.65rem 1rem;border-radius:999px;background:#111812ed;color:#fff;font:600 .68rem var(--sans);letter-spacing:.04em;box-shadow:0 8px 30px #0006;pointer-events:none}
`;
