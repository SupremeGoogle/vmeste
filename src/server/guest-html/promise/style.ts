/** Included only for the promise template, after the common theme controls. */
export const PROMISE_CSS = `
body{font-size:17px;background-color:var(--bg);background-image:radial-gradient(ellipse at 15% 10%,#fff8 0,transparent 60%),repeating-linear-gradient(96deg,#66513d04 0 1px,transparent 1px 4px)}
.sheet{max-width:38rem;position:relative;overflow:clip;padding:0;background-color:var(--card);box-shadow:0 16px 90px #49372c15}
.sheet>section{padding:3.25rem 2.5rem;margin:0;position:relative;z-index:1;overflow-wrap:anywhere}
.sheet h2{font-size:clamp(1.6rem,5.6vw,2.05rem);font-weight:400;line-height:1.22;letter-spacing:-.025em;margin-bottom:1.65rem}
.sheet h2::after{width:2rem;background:var(--accent);opacity:.5;margin-top:1.1rem}
.sheet .pre{line-height:1.9;font-size:1rem}
.sheet .small{font-size:.9rem}
.sheet .who{font-size:.65rem;letter-spacing:.2em;padding:1.2rem;background:var(--card)}
.sheet .promise-cover{padding:0;min-height:780px;min-height:min(900px,96svh);display:flex;flex-direction:column;justify-content:flex-end;isolation:isolate;text-align:center;background:var(--card);overflow:hidden}
.promise-scene{position:absolute;inset:0;z-index:-2;background:url('/media/invite-promise/garden.webp') center top/cover no-repeat;transform-origin:50% 25%;animation:promise-bloom 2.8s ease-out both}
.promise-cover::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,var(--card) 0%,transparent 38%);pointer-events:none}
.promise-cover-copy{padding:20rem 2.5rem 1.5rem;position:relative;z-index:2}
.promise-kicker{max-width:19rem;margin:0 auto 1.2rem;font-size:.63rem;letter-spacing:.24em;text-transform:uppercase;line-height:1.9;color:var(--fg)}
.sheet .promise-names{margin:0;font-size:clamp(3.3rem,12.5vw,5.4rem);font-weight:400;letter-spacing:-.055em;line-height:1.05;text-transform:none;overflow-wrap:anywhere}
.promise-names>span{display:block}
.promise-names .promise-amp{font-style:italic;font-size:.68em;line-height:.95;color:var(--accent);margin:.08em 0 .13em;font-weight:400}
.sheet .promise-subtitle{max-width:20rem;font-size:.67rem;line-height:1.9;letter-spacing:.17em;text-transform:uppercase;margin:1.75rem auto 0;color:var(--muted)}
.promise-date{font-size:1.05rem;letter-spacing:.13em;margin:1.75rem auto 0;display:table;padding:1rem 1.3rem;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.promise-sprig{width:92px;height:54px;color:var(--leaf);display:block;margin:1.5rem auto .3rem;transform-origin:25% 80%;animation:promise-sway 7s ease-in-out infinite alternate}
.sheet .promise-with-photo{min-height:0}
.promise-with-photo .promise-scene{background-size:100% auto}
.promise-portrait{position:relative;z-index:1;margin:7rem 3.4rem 0;aspect-ratio:4/4.6;border-radius:48% 48% .2rem .2rem;overflow:hidden;box-shadow:0 12px 45px #49372c15}
.sheet .promise-portrait img{display:block;width:100%;height:100%;object-fit:cover;margin:0;padding:0;border:0;max-width:100%;animation:promise-bloom 2.8s ease-out both}
.promise-with-photo .promise-cover-copy{padding-top:2.3rem}
.promise-framed .promise-portrait{border:6px solid var(--card);outline:1px solid var(--line)}
.promise-petals{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3}
.promise-petals i{position:absolute;top:-4%;left:15%;width:10px;height:16px;background:linear-gradient(145deg,#f7e6dd,#d5ac9b66);border-radius:75% 0 80% 20%;animation:promise-petal 15s linear infinite;opacity:0}
.promise-petals i:nth-child(2){left:70%;animation-delay:3s;animation-duration:19s;width:8px}
.promise-petals i:nth-child(3){left:35%;animation-delay:8s;animation-duration:17s}
.promise-petals i:nth-child(4){left:85%;animation-delay:1s;animation-duration:22s;width:7px}
.promise-petals i:nth-child(5){left:55%;animation-delay:11s;animation-duration:20s}
.promise-petals i:nth-child(6){left:5%;animation-delay:5s;animation-duration:18s;width:6px}
[data-promise-block=TEXT]:not([data-promise-closing]){padding-top:3.8rem;padding-bottom:3.8rem}
[data-promise-block=COUNTDOWN]{background:linear-gradient(110deg,transparent,#e2cec333,transparent)}
.sheet .countdown{gap:1.25rem}
.sheet .countdown>div{min-width:0;flex:1;max-width:6rem;position:relative}
.sheet .countdown>div+div::before{content:':';position:absolute;left:-.7rem;top:.1rem;font-size:1.7rem;color:var(--line)}
.sheet .countdown b{font-size:clamp(2.3rem,9vw,3.5rem);letter-spacing:-.045em;color:var(--accent)}
.sheet .countdown span{font-size:.58rem;letter-spacing:.18em;margin-top:.7rem}
.sheet .cal-card{background:transparent;border:1px solid var(--line);border-radius:12rem 12rem .5rem .5rem;padding:2rem 1.75rem 1.5rem;max-width:20rem;margin:0 auto}
.sheet .cal-month{font-size:1rem;letter-spacing:.08em;text-transform:none}
.sheet .cal-grid{gap:.2rem}
.sheet .d-marked{background:var(--accent);color:var(--card);border-radius:50%;box-shadow:0 0 0 4px var(--card),0 0 0 5px var(--line)}
.sheet .big-date{font-size:1.9rem;letter-spacing:.12em;font-weight:400;color:var(--accent)}
.promise-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;align-items:start}
.promise-photos figure{margin:0;min-width:0}
.promise-photos figure:nth-child(even){padding-top:2.25rem}
.promise-photo-window{overflow:hidden;border-radius:8rem 8rem .35rem .35rem;background:var(--bg)}
.promise-photo-window img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;display:block;transition:transform 1.2s cubic-bezier(.2,.65,.3,1)}
.promise-photos figcaption{text-align:center;font-style:italic;color:var(--muted);font-size:.86rem;line-height:1.6;padding:1rem .2rem 0}
.promise-single{grid-template-columns:1fr}
.promise-single .promise-photo-window{border-radius:var(--radius)}
.promise-single img{aspect-ratio:3/2;object-position:50% 30%}
.sheet [data-promise-block=VENUE]{margin:0 2.5rem;padding:2rem 1.5rem;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(145deg,#e2cec326,transparent)}
[data-promise-block=VENUE]>.center:not(.pre){font-family:var(--serif);font-style:italic;font-size:1.65rem;margin-bottom:.7rem}
.sheet .links{padding:0;gap:.7rem}
.sheet .links a{background:var(--line);border:0;color:var(--fg);font-size:.8rem;padding:.9rem 1.3rem;letter-spacing:.04em;transition:transform .25s,box-shadow .25s}
.sheet .links a::after{content:' ↗';padding-left:.6rem}
.sheet .timeline{margin-top:2.2rem}
.sheet .timeline li{position:relative;display:grid;grid-template-columns:2.6rem 3.5rem minmax(0,1fr);gap:.9rem;margin:0;padding:0 0 2.2rem;align-items:start;text-align:left}
.sheet .timeline li:last-child{padding-bottom:0}
.sheet .timeline li::before{content:'';position:absolute;left:1.3rem;top:2.6rem;bottom:.1rem;width:1px;background:var(--line);transform-origin:top}
.sheet .timeline li:last-child::before{display:none}
.sheet .timeline li:not(:has(.tico)){grid-template-columns:3.5rem minmax(0,1fr);padding-left:3.5rem}
.sheet .timeline li:not(:has(.tico))::after{content:'';position:absolute;width:.4rem;height:.4rem;left:1.1rem;top:.7rem;border-radius:50%;background:var(--accent)}
.sheet .timeline .tico{width:2.6rem;height:2.6rem;margin:0;padding:.55rem;background:var(--line);border-radius:50%;color:var(--accent);flex:none}
.sheet .timeline time{font-family:var(--sans);font-size:.77rem;padding:.55rem 0 0;letter-spacing:.02em;text-align:left;display:block}
.sheet .timeline .what{padding:.4rem 0 0;border:0;margin:0;font-size:1rem;line-height:1.5;text-transform:none;letter-spacing:0}
.sheet .timeline .note{font-size:.85rem;margin-top:.4rem;line-height:1.6}
.sheet [data-promise-block=DRESSCODE]{margin:0 2.5rem;padding:2.5rem 1.5rem;border:1px solid var(--line);border-radius:var(--radius)}
.sheet .palette{gap:.65rem;flex-wrap:wrap;margin-top:1.8rem}
.sheet .swatch{width:2.9rem;height:2.9rem;border:3px solid var(--card);outline:1px solid var(--line);box-shadow:0 4px 12px #49372c0a;transition:transform .3s}
.sheet [data-promise-block=RSVP_FORM]{padding-top:4rem;padding-bottom:4rem;background:radial-gradient(ellipse at center,#e2cec350,transparent 72%)}
.sheet .cta,.sheet .submit{color:var(--fg);background:var(--line);border:1px solid transparent;box-shadow:0 5px 25px #966c5c12;transition:transform .25s,box-shadow .25s;letter-spacing:.06em;font-size:.9rem}
.sheet .cta::after{content:' →';padding-left:1rem}
.sheet [data-promise-closing]{padding:4.5rem 2.5rem 6.5rem;background:linear-gradient(var(--card),transparent 65%),url('/media/invite-promise/garden.webp') center 25%/cover no-repeat}
.sheet [data-promise-closing] h2{font-style:italic;font-size:2.5rem}
.sheet [data-promise-closing] .pre{font-size:.8rem;letter-spacing:.06em;text-shadow:0 1px 10px var(--card)}
.sheet [data-promise-closing] .promise-sprig{margin:0 auto 1.5rem}
.sheet .foot{padding:1.7rem 1.5rem;background:var(--card);font-size:.77rem}
.sheet form{padding:2rem 2.5rem 2.5rem}
.sheet form fieldset:first-child{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.sheet form fieldset:first-child legend{grid-column:1/-1}
.sheet .choice{font-size:.95rem;line-height:1.5;padding:1.1rem;background:transparent;transition:background .25s,border-color .25s}
.sheet .choice:has(input:checked){background:var(--line);border-color:var(--accent)}
.sheet input[type=radio]{accent-color:var(--accent);flex-shrink:0}
.sheet .field input,.sheet .field textarea{background:transparent;font-size:1rem}
.sheet a:focus-visible,.sheet button:focus-visible,.sheet input:focus-visible,.sheet textarea:focus-visible{outline:2px solid var(--accent);outline-offset:5px}
.promise-progress{position:fixed;left:0;right:0;top:0;height:2px;background:var(--accent);transform:scaleX(0);transform-origin:left;z-index:30;pointer-events:none}
.promise-motion [data-promise-block]{opacity:0;transform:translateY(24px);transition:opacity 1s ease,transform 1.1s cubic-bezier(.2,.65,.3,1)}
.promise-motion [data-promise-block].promise-seen{opacity:1;transform:none}
.promise-motion .promise-cover .promise-cover-copy>*{opacity:0;transform:translateY(14px);transition:opacity 1.2s,transform 1.2s}
.promise-motion .promise-cover.promise-seen .promise-cover-copy>*{opacity:1;transform:none}
.promise-motion .promise-cover-copy>:nth-child(2){transition-delay:.15s}
.promise-motion .promise-cover-copy>:nth-child(3){transition-delay:.3s}
.promise-motion .promise-cover-copy>:nth-child(4){transition-delay:.45s}
.promise-motion .promise-cover-copy>:nth-child(5){transition-delay:.6s}
.promise-motion .timeline li,.promise-motion .swatch{opacity:0;transform:translateY(12px);transition:opacity .8s,transform .8s}
.promise-motion .promise-seen .timeline li,.promise-motion .promise-seen .swatch{opacity:1;transform:none}
.promise-motion .timeline li:nth-child(2),.promise-motion .swatch:nth-child(2){transition-delay:.12s}
.promise-motion .timeline li:nth-child(3),.promise-motion .swatch:nth-child(3){transition-delay:.24s}
.promise-motion .timeline li:nth-child(4),.promise-motion .swatch:nth-child(4){transition-delay:.36s}
.promise-motion .swatch:nth-child(5){transition-delay:.48s}
@keyframes promise-bloom{from{transform:scale(1.07);opacity:.55}to{transform:scale(1);opacity:1}}
@keyframes promise-sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes promise-petal{0%{opacity:0;transform:translate3d(0,0,0) rotate(0)}10%{opacity:.6}80%{opacity:.4}100%{opacity:0;transform:translate3d(45px,1000px,0) rotate(260deg)}}
@media(hover:hover){.sheet .cta:hover,.sheet .submit:hover,.sheet .links a:hover{transform:translateY(-3px);box-shadow:0 9px 25px #966c5c25}.promise-photo-window:hover img{transform:scale(1.045)}.sheet .swatch:hover{transform:translateY(-5px)}}
@media(min-width:48rem){body{padding:2.5rem 1rem}.sheet{border:1px solid #fff8;border-radius:2px}}
@media(max-width:380px){.sheet>section{padding:2.7rem 1.4rem}.sheet .promise-cover{min-height:720px}.promise-cover-copy{padding:18rem 1.4rem 1.5rem}.promise-portrait{margin:6rem 2rem 0}.sheet [data-promise-block=VENUE],.sheet [data-promise-block=DRESSCODE]{margin-left:1.4rem;margin-right:1.4rem}.sheet .timeline li{gap:.6rem;grid-template-columns:2.4rem 3rem minmax(0,1fr)}.sheet form{padding-left:1.4rem;padding-right:1.4rem}.sheet form fieldset:first-child{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.sheet *,.sheet *::before,.sheet *::after{animation:none!important;transition:none!important}.promise-petals{display:none}.promise-motion [data-promise-block],.promise-motion .promise-cover .promise-cover-copy>*,.promise-motion .timeline li,.promise-motion .swatch{opacity:1;transform:none}}
@media print{body{padding:0}.sheet{box-shadow:none;max-width:100%}.promise-petals,.promise-progress{display:none}.sheet *{animation:none!important;transition:none!important}.promise-motion [data-promise-block],.promise-motion .promise-cover .promise-cover-copy>*,.promise-motion .timeline li,.promise-motion .swatch{opacity:1;transform:none}.sheet>section{break-inside:avoid}}
`.replace(/\n/g, "");
