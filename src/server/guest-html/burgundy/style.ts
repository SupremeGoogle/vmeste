export const BURGUNDY_FONTS_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">';

export const BURGUNDY_CSS = `
body:has(.sheet.burgundy){margin:0;background:#e9ddd7;color:#522d37}
body:has(.sheet.burgundy) .bits-ambient,body:has(.sheet.burgundy) .bits-spotlight{display:none!important}
.sheet.burgundy{--bw-wine:#672638;--bw-deep:#491725;--bw-gold:#c6a47b;--bw-cream:#fbf5ee;--bw-pink:#f1d8d6;--bw-text:#50313a;width:min(100%,620px);max-width:620px;min-height:100vh;margin:0 auto;padding:0;overflow:hidden;background:var(--bw-cream);color:var(--bw-text);box-shadow:0 15px 70px #3f20351c;font-family:"Cormorant Garamond",Georgia,serif;font-size:18px}
.burgundy .bw-section{position:relative;padding:88px 38px;text-align:center;overflow:hidden}
.burgundy .bw-kicker{display:block;margin:0 0 15px;color:#985f6b;font:400 10px/1.5 "Jost",Arial,sans-serif;letter-spacing:.33em;text-transform:uppercase}
.burgundy h1,.burgundy h2,.burgundy h3{color:var(--bw-wine);font-family:"Cormorant Garamond",Georgia,serif;font-weight:500}
.burgundy h2{max-width:480px;margin:0 auto 20px;font-size:clamp(43px,7vw,65px);line-height:.98}
.burgundy h2::after{display:none}
.burgundy p{margin:0 auto;line-height:1.55}
.burgundy .bw-cover{display:flex;align-items:flex-start;justify-content:center;min-height:100svh;padding:0;background:#eaded5}
.burgundy .bw-hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center}
.burgundy .bw-hero-copy{position:relative;z-index:1;width:100%;padding:clamp(120px,23vh,225px) 35px 0;text-align:center;text-shadow:0 1px 10px #fffaefbb}
.burgundy .bw-hero-copy .bw-kicker{color:#7c4550;font-size:11px;letter-spacing:.31em}
.burgundy .bw-cover h1{margin:8px auto 0;color:#72394a;font:400 clamp(62px,11vw,94px)/.95 "Great Vibes","Brush Script MT",cursive;letter-spacing:0;text-transform:none}
.burgundy .bw-hero-rule{display:block;margin:14px auto 6px;color:#a97a62;font-size:17px;letter-spacing:.3em}
.burgundy .bw-hero-title{color:#713f4c;font:500 22px/1.2 "Cormorant Garamond",Georgia,serif;letter-spacing:.08em}
.burgundy .bw-hero-date{margin-top:20px;color:#633946;font:500 20px/1.2 "Cormorant Garamond",Georgia,serif;letter-spacing:.2em;text-transform:uppercase}
.burgundy .bw-scroll-cue{position:absolute;z-index:2;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;text-decoration:none;font:400 35px/1 "Cormorant Garamond",serif;text-shadow:0 2px 8px #35131888;animation:bw-cue 2s ease-in-out infinite}
@keyframes bw-cue{50%{transform:translate(-50%,7px)}}
.burgundy .bw-envelope{position:fixed;z-index:900;inset:0;display:flex;align-items:center;justify-content:center;width:100%;height:100dvh;padding:0;border:0;background:#551b2b;cursor:pointer;overflow:hidden;transition:opacity .85s ease,visibility .85s ease}
.burgundy .bw-envelope-paper,.burgundy .bw-envelope-bottom,.burgundy .bw-envelope-top{position:absolute;inset:0;display:block;background:#551b2b url('/media/invite-burgundy/envelope.webp') center/cover no-repeat}
.burgundy .bw-envelope-paper{filter:brightness(.75)}
.burgundy .bw-envelope-bottom{clip-path:polygon(0 45%,50% 70%,100% 45%,100% 100%,0 100%);filter:brightness(.94);box-shadow:0 -5px 18px #1e060c99}
.burgundy .bw-envelope-top{clip-path:polygon(0 0,100% 0,100% 44%,50% 69%,0 44%);transform-origin:50% 0;filter:brightness(1.1);transition:transform 1.25s cubic-bezier(.18,.62,.22,1),filter 1.25s}
.burgundy .bw-envelope-seal{position:relative;z-index:3;display:grid;place-items:center;width:92px;height:92px;margin-top:13vh;border:3px double #d9c8ac;border-radius:50%;background:radial-gradient(circle at 30% 25%,#f8eadd,#d5bda4 70%,#b68f78);color:#8a4850;font:500 24px/1 "Cormorant Garamond",Georgia,serif;box-shadow:0 5px 15px #230a13a1, inset 0 0 0 4px #f8ead680;transition:opacity .45s,transform .65s}
.burgundy .bw-envelope-caption{position:absolute;z-index:4;bottom:7vh;color:#ddc3ac;font:400 11px "Jost",Arial,sans-serif;letter-spacing:.25em;text-transform:uppercase}
.burgundy .bw-envelope.bw-opening .bw-envelope-top{transform:rotateX(165deg);filter:brightness(.75)}
.burgundy .bw-envelope.bw-opening .bw-envelope-seal{opacity:0;transform:scale(.7)}
.burgundy .bw-envelope.bw-opened{opacity:0;visibility:hidden;pointer-events:none}
html.ie-editing .burgundy .bw-envelope{display:none}
.burgundy .bw-letter{padding:110px 42px 105px;background:linear-gradient(180deg,#f8eee9,#fffaf5 32%,#f8efe9)}
.burgundy .bw-letter::before,.burgundy .bw-countdown::before,.burgundy .bw-timeline::before,.burgundy .bw-venue::before,.burgundy .bw-dress::before{content:"";position:absolute;top:-20px;left:-2%;width:104%;height:35px;background:var(--bw-cream);clip-path:polygon(0 65%,6% 36%,12% 65%,18% 42%,24% 63%,30% 35%,36% 63%,42% 43%,48% 62%,54% 40%,60% 61%,66% 37%,72% 60%,78% 42%,84% 64%,90% 39%,96% 65%,100% 43%,100% 100%,0 100%)}
.burgundy .bw-letter .bw-flower-mark{display:block;margin-bottom:25px;color:#a55f72;font-size:31px}
.burgundy .bw-letter h2{font-size:clamp(45px,8vw,65px)}
.burgundy .bw-letter>p:not(.bw-kicker){max-width:440px;font-size:21px;white-space:pre-line}
.burgundy .bw-letter-swan{margin-top:40px;color:#8a4054;font:400 58px/1 "Great Vibes",cursive}
.burgundy .bw-countdown{padding:85px 25px 96px;background:#fffaf5}
.burgundy .bw-countdown h2{font-size:clamp(39px,7vw,58px)}
.burgundy .bw-clock{display:flex;justify-content:center;gap:0;width:min(490px,100%);margin:48px auto 0}
.burgundy .bw-clock>div{flex:1;min-width:0;border-right:1px solid #cbaea7}
.burgundy .bw-clock>div:last-child{border:0}
.burgundy .bw-clock strong{display:block;color:#772e44;font:500 clamp(40px,10vw,66px)/1 "Cormorant Garamond",serif;font-variant-numeric:tabular-nums}
.burgundy .bw-clock span{display:block;margin-top:7px;color:#8b6e71;font:400 10px "Jost",sans-serif;letter-spacing:.11em;text-transform:uppercase}
.burgundy .bw-divider{display:block;margin-top:42px;color:#a86b6c;font-size:26px}
.burgundy .bw-timeline{padding:95px 26px 110px;background:#f3e4e2}
.burgundy .bw-section-flower{display:block;margin-bottom:19px;color:#9a4c62;font-size:32px}
.burgundy .bw-timeline h2{margin-bottom:42px}
.burgundy .bw-timeline ol{position:relative;width:min(500px,100%);margin:0 auto;padding:0;list-style:none}
.burgundy .bw-timeline ol::before{content:"";position:absolute;top:15px;bottom:20px;left:39%;width:1px;background:#b89091}
.burgundy .bw-timeline li{position:relative;display:grid;grid-template-columns:34% 10% 1fr;align-items:start;min-height:93px;text-align:left}
.burgundy .bw-timeline time{padding:0 15px 0 0;text-align:right;color:#813950;font:500 32px/1 "Cormorant Garamond",serif;font-variant-numeric:tabular-nums}
.burgundy .bw-timeline-dot{position:relative;z-index:1;width:23px;margin:-3px auto 0;color:#a4576a;background:#f3e4e2;text-align:center;font-size:19px;line-height:24px}
.burgundy .bw-timeline li h3{margin:-1px 0 3px;font-size:25px;line-height:1}
.burgundy .bw-timeline li p{color:#7c6568;font:300 12px/1.5 "Jost",sans-serif}
.burgundy .bw-add{padding:8px 16px;border:1px solid #b89091;background:transparent;color:#71394a}
.burgundy .bw-venue{padding:100px 28px 90px;background:#fffaf5}
.burgundy .bw-venue-note{max-width:400px;margin:0 auto 34px!important;font-size:21px}
.burgundy .bw-venue-image{display:block;width:100%;height:295px;object-fit:cover;object-position:center;margin:0 auto 28px;border:8px solid #f8ece3;box-shadow:0 7px 22px #60433724}
.burgundy .bw-venue h3{margin:0 auto 7px;font-size:36px}
.burgundy .bw-address{color:#735e60;font-size:19px;white-space:pre-line}
.burgundy .bw-map-frame{width:100%;height:270px;margin:32px auto 0;overflow:hidden;border:7px solid #f8ece3;box-shadow:0 4px 15px #6043371a}
.burgundy .bw-map-frame iframe{display:block;width:100%;height:100%;border:0}
.burgundy .bw-map{display:flex;align-items:center;justify-content:center;gap:7px;width:max-content;max-width:100%;margin:31px auto 0;padding:12px 24px;border:1px solid #a66070;color:#6e3045;text-decoration:none;font:400 11px "Jost",sans-serif;letter-spacing:.12em;text-transform:uppercase}
.burgundy .bw-map-pin{color:#9c4a5c;font-size:15px}
.burgundy .bw-dress{padding:100px 42px 40px;background:#f1dedb}
.burgundy .bw-dress>p:not(.bw-kicker){max-width:430px;font-size:21px}
.burgundy .bw-palette{display:flex;justify-content:center;gap:12px;margin:35px auto 0}
.burgundy .bw-palette span{display:block;width:43px;height:43px;border-radius:50%;border:3px solid #fff9f4;box-shadow:0 2px 7px #32142022;cursor:pointer}
.burgundy .bw-fashion{padding:0 14px 60px;background:#f1dedb}
.burgundy .bw-fashion .bw-kicker{margin-bottom:10px}
.burgundy .bw-fashion img{display:block;width:min(560px,100%);max-height:450px;object-fit:contain;margin:0 auto}
.burgundy .bw-fashion-caption{display:block;color:#997c7a;font:400 13px "Cormorant Garamond",serif}
.burgundy .bw-finale{padding:115px 30px 150px;background:#571e30 url('/media/invite-burgundy/envelope.webp') center/cover no-repeat;color:#f8ebdf}
.burgundy .bw-finale::before{content:"";position:absolute;inset:14px;border:1px solid #d1ad85a1;pointer-events:none}
.burgundy .bw-finale .bw-kicker{color:#d7b897}
.burgundy .bw-finale h2{color:#f8e8de;font:400 clamp(47px,9vw,72px)/1.1 "Great Vibes",cursive}
.burgundy .bw-finale p{font-size:21px}
.burgundy .bw-finale-ornament{display:block;margin-bottom:26px;color:#d9b685;font-size:36px}
.burgundy .foot{margin:0;padding:24px 20px 35px;background:#501b2c;color:#dec5b5;text-align:center;font:400 10px/1.5 "Jost",sans-serif}
.burgundy .foot a{color:inherit}
.burgundy .who{position:absolute;z-index:5;right:8px;top:8px;padding:4px 8px;background:#f8efe9df;color:#653949;font:400 10px "Jost",sans-serif}
@media(max-width:520px){.burgundy .bw-section{padding-left:22px;padding-right:22px}.burgundy .bw-cover{min-height:100svh;padding:0}.burgundy .bw-hero-image{object-position:center}.burgundy .bw-hero-copy{padding:24vh 20px 0}.burgundy .bw-cover h1{font-size:clamp(56px,15vw,82px)}.burgundy .bw-hero-title{font-size:18px}.burgundy .bw-hero-date{font-size:17px}.burgundy .bw-letter{padding-top:90px;padding-bottom:80px}.burgundy .bw-letter>p:not(.bw-kicker),.burgundy .bw-venue-note,.burgundy .bw-dress>p:not(.bw-kicker){font-size:18px}.burgundy .bw-clock strong{font-size:clamp(34px,10vw,54px)}.burgundy .bw-clock span{font-size:8px}.burgundy .bw-timeline li{grid-template-columns:34% 10% 1fr;min-height:86px}.burgundy .bw-timeline time{font-size:27px}.burgundy .bw-timeline li h3{font-size:22px}.burgundy .bw-timeline ol::before{left:39%}.burgundy .bw-venue-image{height:220px}.burgundy .bw-dress{padding-bottom:30px}.burgundy .bw-fashion img{max-height:330px}}
@media(prefers-reduced-motion:reduce){.burgundy .bw-envelope,.burgundy .bw-envelope-top,.burgundy .bw-envelope-seal,.burgundy .bw-scroll-cue{animation:none;transition:none}}
`.replace(/\n/g, "");
