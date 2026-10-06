export const ROSERAIE_FONTS_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Great+Vibes&family=Jost:wght@300;400&display=swap" rel="stylesheet">';

export const ROSERAIE_CSS = `
body:has(.sheet.roseraie){margin:0;background:#fffefd;color:#4a4d44}
body:has(.sheet.roseraie) .bits-ambient,body:has(.sheet.roseraie) .bits-spotlight{display:none!important}
.sheet.roseraie{--rr-ink:#3e443b;--rr-muted:#8d8e85;--rr-gold:#ab9976;max-width:none;min-height:100vh;margin:0;padding:0;overflow:hidden;background:#fff;color:var(--rr-ink);box-shadow:none;font:400 18px/1.6 "Cormorant Garamond",Georgia,serif}
.roseraie .rr-section{position:relative;overflow:hidden;text-align:center}
.roseraie h1,.roseraie h2,.roseraie h3{font-weight:400}
.roseraie h2::after{display:none}
.roseraie p{margin:0}
.roseraie .rr-eyebrow{font:400 11px/1.5 "Jost",Arial,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#a19989}
.roseraie .rr-cover{height:100svh;min-height:650px;padding:0;background:#151a15;color:#fff}
.roseraie .rr-hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 48%}
.roseraie .rr-cover-shade{position:absolute;inset:0;background:linear-gradient(180deg,#11150eb5 0%,#171c1829 25%,#11191045 53%,#151c15ad 100%)}
.roseraie .rr-cover-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;width:100%;height:100%;padding:11vh 25px 7vh;text-shadow:0 2px 25px #0006}
.roseraie .rr-cover-kicker{font:400 10px/1.4 "Jost",Arial,sans-serif;letter-spacing:.6em;text-transform:uppercase;color:#f4eee5}
.roseraie .rr-cover h1{max-width:900px;margin:auto 0;color:#fff;font:400 clamp(90px,12vw,190px)/.9 "Great Vibes","Brush Script MT",cursive;letter-spacing:0;text-transform:none}
.roseraie .rr-verse{margin:0 auto 25px;max-width:380px;color:#f9f6f2;font:italic 18px/1.45 "Cormorant Garamond",Georgia,serif;white-space:pre-line}
.roseraie .rr-verse small{display:block;margin-top:10px;font:400 10px "Jost",Arial,sans-serif;letter-spacing:.35em;text-transform:uppercase}
.roseraie .rr-cover-date{color:#fff;font:400 11px "Jost",Arial,sans-serif;letter-spacing:.55em;text-transform:uppercase}
.roseraie .rr-down{position:absolute;z-index:2;bottom:15px;left:50%;transform:translateX(-50%);color:#fff;text-decoration:none;font:300 22px "Cormorant Garamond",serif;opacity:.8}
.roseraie .rr-music{position:fixed;z-index:12;top:24px;right:24px;display:flex;align-items:center;gap:9px;padding:9px 18px;border:1px solid #ffffff66;border-radius:999px;background:#3c3e3899;color:#fff;cursor:pointer;font:400 11px "Jost",sans-serif;letter-spacing:.18em}
.roseraie .rr-intro{position:fixed;z-index:900;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;transition:opacity .9s ease,visibility .9s ease}
.roseraie .rr-envelope{position:relative;display:block;width:min(390px,78vw);height:min(560px,76vh);padding:0;border:0;border-radius:5px;background:#1e281f url('/media/invite-roseraie/envelope.webp') center/cover no-repeat;box-shadow:0 5px 13px #0004;cursor:pointer;perspective:900px}
.roseraie .rr-envelope-face,.roseraie .rr-envelope-flap{position:absolute;inset:0;display:block;background:#1e281f url('/media/invite-roseraie/envelope.webp') center/cover no-repeat}
.roseraie .rr-envelope-face{border-radius:5px;clip-path:polygon(0 47%,50% 66%,100% 47%,100% 100%,0 100%);filter:brightness(.82)}
.roseraie .rr-envelope-flap{border-radius:5px;clip-path:polygon(0 0,100% 0,100% 48%,50% 68%,0 48%);transform-origin:50% 0;filter:brightness(1.03);transition:transform 1.1s cubic-bezier(.19,.65,.18,1)}
.roseraie .rr-seal{position:absolute;z-index:2;top:50%;left:50%;display:grid;place-items:center;width:86px;height:86px;transform:translate(-50%,-50%);border:5px double #c6a756;border-radius:50%;background:radial-gradient(circle at 28% 25%,#cbb263,#9d7e30 70%,#6f571c);color:#e7d38e;font:400 49px/1 "Cormorant Garamond",serif;box-shadow:0 4px 11px #0009,inset 0 0 0 2px #695313;transition:opacity .35s,transform .7s}
.roseraie .rr-intro-hint{position:absolute;bottom:4vh;color:#777a70;font:400 10px "Jost",Arial,sans-serif;letter-spacing:.3em;text-transform:uppercase}
.roseraie .rr-intro.rr-opening .rr-envelope-flap{transform:rotateX(160deg)}
.roseraie .rr-intro.rr-opening .rr-seal{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.roseraie .rr-intro.rr-opened{opacity:0;visibility:hidden;pointer-events:none}
html.ie-editing .roseraie .rr-intro{display:none}
.roseraie .rr-letter{padding:130px 24px 88px;background:#fff}
.roseraie .rr-monogram{position:relative;display:grid;place-items:center;width:85px;height:85px;margin:0 auto 28px;color:#b5a88f;font:400 29px/1 "Cormorant Garamond",serif}
.roseraie .rr-monogram::before,.roseraie .rr-monogram::after{content:"";position:absolute;width:85px;height:1px;background:#d8d0c0;transform:rotate(-29deg)}
.roseraie .rr-monogram::after{transform:rotate(29deg)}
.roseraie .rr-letter .rr-eyebrow{margin-bottom:18px}
.roseraie .rr-letter-copy{width:min(410px,100%);margin:0 auto;color:#797b74;font-size:21px;line-height:1.85;white-space:pre-line}
.roseraie .rr-letter h2{margin:36px auto 0;color:#6d6b5d;font:400 clamp(57px,8vw,91px)/1 "Great Vibes",cursive}
.roseraie .rr-letter-line{display:block;width:1px;height:84px;margin:52px auto 0;background:#ddd5c7}
.roseraie .rr-photos{padding:15px 24px 155px;background:#fff}
.roseraie .rr-photos .rr-eyebrow{margin-bottom:30px}
.roseraie .rr-photos-stack{position:relative;width:min(525px,100%);height:580px;margin:0 auto}
.roseraie .rr-photo{position:absolute;width:285px;margin:0;padding:11px 11px 35px;background:#fff;box-shadow:0 20px 35px #332a1f23;transform:rotate(-5deg)}
.roseraie .rr-photo-0{top:10px;left:20px;z-index:2}
.roseraie .rr-photo-1{top:148px;right:6px;transform:rotate(5deg)}
.roseraie .rr-photo img{display:block;width:100%;height:335px;object-fit:cover}
.roseraie .rr-photo figcaption{padding-top:11px;color:#8f8b81;font:italic 16px "Cormorant Garamond",serif}
.roseraie .rr-timeline{display:grid;grid-template-columns:1fr 1fr;align-items:center;min-height:700px;padding:70px max(5vw,28px);background:#fff}
.roseraie .rr-botanical{display:block;width:min(450px,100%);height:590px;margin:auto;object-fit:contain;opacity:.28}
.roseraie .rr-timeline-inner{width:min(420px,100%);margin:0 auto;text-align:left}
.roseraie .rr-timeline h2,.roseraie .rr-venue h2{margin:0 0 43px;color:#6c6d5f;text-align:center;font:400 clamp(59px,6vw,89px)/1 "Great Vibes",cursive}
.roseraie .rr-timeline ol{margin:0;padding:0;list-style:none}
.roseraie .rr-timeline li{display:grid;grid-template-columns:72px 1fr;gap:18px;min-height:62px;align-items:start;color:#67685f}
.roseraie .rr-timeline time{padding:3px 15px 0 0;border-right:1px solid #c8bdad;text-align:right;font:400 14px "Jost",Arial,sans-serif;letter-spacing:.12em}
.roseraie .rr-timeline li div{display:flex;flex-direction:column}
.roseraie .rr-timeline strong{font:400 22px/1.1 "Cormorant Garamond",Georgia,serif}
.roseraie .rr-timeline li span{color:#a09d94;font:300 11px/1.4 "Jost",Arial,sans-serif}
.roseraie .rr-add{padding:8px 15px;border:1px solid #d3c6ae;background:#fff;color:#65675a}
.roseraie .rr-venue{padding:80px 24px 150px;background:#fff}
.roseraie .rr-venue h2{margin-bottom:40px}
.roseraie .rr-venue-card{width:min(485px,100%);margin:0 auto;padding:15px 15px 38px;background:#fff;box-shadow:0 18px 55px #36342816}
.roseraie .rr-venue-card img{display:block;width:100%;height:245px;object-fit:cover;margin-bottom:29px}
.roseraie .rr-venue-kicker{color:#a39a87;font:400 10px "Jost",Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase}
.roseraie .rr-venue h3{margin:15px 0 0;color:#5c5f54;font-size:38px;line-height:1.1}
.roseraie .rr-venue-card p{color:#888a7f;font-size:19px;white-space:pre-line}
.roseraie .rr-venue-card .rr-venue-note{margin-top:12px;font-size:16px}
.roseraie .rr-venue-card a{display:inline-block;margin-top:25px;padding:11px 22px;border:1px solid #ded8ca;border-radius:999px;color:#767466;text-decoration:none;font:400 10px "Jost",Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase}
.roseraie .rr-last-photo{padding:35px 24px 35px;background:#fff}
.roseraie .rr-last-photo .rr-eyebrow{margin-bottom:20px}
.roseraie .rr-last-photo figure{position:relative;width:min(360px,100%);margin:0 auto;padding:12px 12px 16px;background:#fff;box-shadow:0 18px 38px #322d2225;transform:rotate(-3deg)}
.roseraie .rr-last-photo img{display:block;width:100%;height:430px;object-fit:cover}
.roseraie .rr-last-photo figcaption{position:absolute;right:20px;bottom:60px;left:20px;color:#fff;text-shadow:0 2px 10px #0009;font:400 42px/1.1 "Great Vibes",cursive}
.roseraie .rr-finale{padding:105px 24px 110px;background:#fff}
.roseraie .rr-finale-mark{display:block;margin-bottom:25px;color:#b7aa90;font:400 28px "Cormorant Garamond",serif}
.roseraie .rr-finale h2{max-width:700px;margin:18px auto 15px;color:#6d6d61;font:400 clamp(52px,7vw,89px)/1 "Great Vibes",cursive}
.roseraie .rr-finale p:not(.rr-eyebrow){color:#97998f;font-size:18px}
.roseraie .foot{margin:0;padding:28px 20px 40px;background:#fff;color:#99988d;text-align:center;font:400 10px/1.5 "Jost",Arial,sans-serif}
.roseraie .who{position:absolute;z-index:3;right:8px;top:8px;padding:4px 8px;background:#fffbdc;color:#626657;font:400 10px "Jost",sans-serif}
@media(max-width:700px){.roseraie .rr-cover{min-height:650px}.roseraie .rr-hero-image{object-position:53% center}.roseraie .rr-cover h1{font-size:clamp(67px,15vw,112px)}.roseraie .rr-cover-content{padding:10vh 16px 6vh}.roseraie .rr-cover-kicker,.roseraie .rr-cover-date{font-size:9px;letter-spacing:.35em}.roseraie .rr-letter{padding:95px 25px 50px}.roseraie .rr-letter-copy{font-size:18px}.roseraie .rr-letter-line{height:55px}.roseraie .rr-photos{padding-bottom:85px}.roseraie .rr-photos-stack{height:500px}.roseraie .rr-photo{width:min(56vw,245px)}.roseraie .rr-photo-0{left:1%}.roseraie .rr-photo-1{top:135px;right:1%}.roseraie .rr-photo img{height:270px}.roseraie .rr-timeline{grid-template-columns:1fr;min-height:0;padding:45px 28px 105px}.roseraie .rr-botanical{position:absolute;left:-120px;top:65px;width:320px;height:450px;margin:0;opacity:.12}.roseraie .rr-timeline-inner{position:relative;z-index:1;width:min(360px,100%);margin:0 auto}.roseraie .rr-timeline h2{margin-bottom:35px}.roseraie .rr-venue{padding:70px 20px 110px}.roseraie .rr-venue-card img{height:210px}.roseraie .rr-finale{padding-top:75px}}
@media(prefers-reduced-motion:reduce){.roseraie .rr-intro,.roseraie .rr-envelope-flap,.roseraie .rr-seal{transition:none}}
.roseraie .rr-wishlist h2{margin-bottom:1.25rem}
`.replace(/\n/g, "");
