/**
 * Стили шаблона «Тили-тесто» — вёрстка перенесена из репозитория-образца
 * (SupremeGoogle/wedding, `style.css`) без изменений в размерах, цветах,
 * шрифтах и анимациях. Убрано только то, чего на странице больше нет:
 * видео-заставка, квест жениха, блок Телеграма и слайдер нарядов.
 *
 * Страница шаблона собирается без общих стилей приглашения: у образца те
 * же имена классов (`.polaroid`, `.cal-card`, `.d`), и общие правила
 * исказили бы вёрстку.
 */
export const TILI_FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Dancing+Script:wght@400;500;600;700&family=Inter:wght@300;400;500&family=Alex+Brush&family=Marck+Script&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">';

export const TILI_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--cream:#f8f1ea;--paper:#F7F3EE;--beige:#E8DBC8;--taupe:#BFAF9F;--rose:#E8C4C0;--rose-d:#C09893;--rose-l:#F3E1DE;--brown:#8B6914;--deep:#2A1D0D;--sage:#9EAD80;--green:#5E7A40;--green-d:#3D5A28;--gold:#C8A87A;--gold-l:#F5EAD5;
--serif:'Cormorant Garamond',Georgia,serif;--script:'Dancing Script','Marck Script',cursive;--display:'Alex Brush','Marck Script',cursive;--body:'Cormorant Garamond',Georgia,serif;--modern:'Montserrat',sans-serif}
html{scroll-behavior:smooth}
body{background:#f8f1ea;color:var(--deep);font-family:var(--serif);overflow-x:hidden;-webkit-font-smoothing:antialiased}
input,button,textarea,select,label{font-family:var(--serif)!important}
img{max-width:100%}
.msg-main-photo{position:relative;z-index:2;transition:all .5s ease}
.msg-canvas{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;border-radius:2px}
.msg-main-photo:hover{transform:scale(1.04) rotate(-1deg);box-shadow:0 20px 50px rgba(61,43,39,.18)}

.cover{position:fixed;inset:0;z-index:1000;background:#f8f1ea;display:none;align-items:center;justify-content:center;cursor:pointer;transition:opacity .6s ease,visibility .6s ease}
.tili-js .cover{display:flex}
.cover::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at center,rgba(255,255,255,1) 0%,rgba(255,255,255,.94) 32%,rgba(255,255,255,.42) 62%,rgba(255,255,255,0) 84%);opacity:0;z-index:20;pointer-events:none;transform:scale(.98);filter:blur(0)}
.cover.flash-end::after{animation:envelopeFlash .9s cubic-bezier(.22,1,.36,1)}
@keyframes envelopeFlash{0%{opacity:0;transform:scale(.97);filter:blur(1px)}22%{opacity:1;transform:scale(1.015);filter:blur(0)}58%{opacity:.45;transform:scale(1.03);filter:blur(1px)}100%{opacity:0;transform:scale(1.045);filter:blur(2px)}}
.cover.is-open{opacity:0;visibility:hidden;pointer-events:none}
.cover-inner{text-align:center;display:flex;flex-direction:column;align-items:center;gap:22px}
.cover-envelope{display:block;width:min(560px,92vw);max-height:78vh;object-fit:contain;transition:transform .8s cubic-bezier(.22,1,.36,1)}
.cover.opening .cover-envelope{transform:scale(1.05)}.cover-env{position:relative;display:block;width:min(560px,92vw);transition:transform .8s cubic-bezier(.22,1,.36,1)}.cover-env .cover-envelope{width:100%;max-height:none;transform:none!important}.cover.opening .cover-env{transform:scale(1.05)}.cover-names{position:absolute;left:50.4%;top:35.5%;transform:translate(-50%,-50%);width:46%;text-align:center;font-family:var(--serif);font-style:italic;font-weight:400;font-size:calc(min(560px,92vw)*.066);line-height:1.12;letter-spacing:.01em;color:#9c7f52;white-space:nowrap;pointer-events:none}
.cover-hint{font-family:var(--serif);font-size:1.2rem;font-weight:500;font-style:italic;color:var(--brown);letter-spacing:.05em;animation:hintPulse 2s ease-in-out infinite}
@keyframes hintPulse{0%,100%{opacity:.6}50%{opacity:1}}

.hero-intro-text{font-family:var(--serif);color:var(--deep);margin:60px auto;line-height:1.8;font-size:1.6rem;max-width:720px;text-align:center}
.hero-intro-text p{margin-bottom:14px}
.intro-ital{font-style:italic;font-size:2.4rem;font-weight:500;margin-bottom:20px!important}

.leaf{position:absolute;pointer-events:none;border-radius:50% 0 50% 0;opacity:.35;z-index:0;filter:blur(1px)}
.leaf-1{width:120px;height:180px;background:#6B8C5C;top:60px;left:-40px;transform:rotate(-30deg)}
.leaf-2{width:80px;height:140px;background:#7A9E6A;top:40px;right:-30px;transform:rotate(40deg)}
.leaf-3{width:100px;height:160px;background:#5E7A50;top:800px;left:-50px;transform:rotate(-20deg)}
.leaf-4{width:90px;height:150px;background:#6B8C5C;top:820px;right:-40px;transform:rotate(25deg)}
.leaf-5{width:110px;height:170px;background:#7A9E6A;top:1600px;left:-35px;transform:rotate(-35deg)}
.leaf-6{width:85px;height:145px;background:#5E7A50;top:1650px;right:-45px;transform:rotate(30deg)}

.main-content{position:relative;opacity:1;transition:opacity .8s ease;overflow-x:hidden}
.tili-js .main-content{opacity:0}
.tili-js .main-content.visible{opacity:1}

.section-tag{font-family:var(--body);font-size:.9rem;letter-spacing:.35em;color:var(--taupe);text-transform:uppercase;margin-bottom:48px;position:relative}
.section-tag::before{content:'— ';color:var(--rose)}
.section-tag::after{content:' —';color:var(--rose)}
.tili-js .reveal{opacity:0;transform:translateY(48px);transition:opacity .85s cubic-bezier(.22,1,.36,1),transform .85s cubic-bezier(.22,1,.36,1)}
.tili-js .reveal.visible{opacity:1;transform:translateY(0)}

.hero{position:relative;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 20px 60px;overflow:hidden;z-index:1}
.hero>*{position:relative;z-index:2}
.hero>.bunting{position:absolute}
.tili-js .fade-in-hero{opacity:0;transform:translateY(30px);transition:opacity .8s ease,transform .8s ease}
.tili-js .fade-in-hero.show{opacity:1;transform:translateY(0)}
.delay-1{transition-delay:.25s!important}.delay-2{transition-delay:.5s!important}.delay-3{transition-delay:.75s!important}

.bunting{position:absolute;top:0;left:0;right:0;height:50px;display:flex;align-items:flex-start;justify-content:space-around;padding:0 20px}
.bunting-rope{position:absolute;top:14px;left:4%;right:4%;height:1.5px;background:linear-gradient(90deg,transparent,var(--taupe) 15%,var(--taupe) 85%,transparent)}
.flag{display:block;width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-top:22px solid var(--taupe);margin-top:4px;animation:flagSway 4s ease-in-out infinite alternate}
.f1{border-top-color:#C09085;animation-delay:0s}.f2{border-top-color:#C8A87A;animation-delay:.4s}.f3{border-top-color:#9EAD98;animation-delay:.8s}.f4{border-top-color:#C0A898;animation-delay:1.2s}.f5{border-top-color:#C09085;animation-delay:1.6s}.f6{border-top-color:#C8A87A;animation-delay:2s}.f7{border-top-color:#9EAD98;animation-delay:2.4s}.f8{border-top-color:#C0A898;animation-delay:2.8s}.f9{border-top-color:#C09085;animation-delay:3.2s}
@keyframes flagSway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}

.hero-rhyme{font-family:'Playfair Display',serif;font-size:clamp(1.7rem,5vw,2.5rem);font-style:italic;letter-spacing:.02em;color:var(--brown);margin-bottom:44px}
.polaroids{display:flex;gap:28px;justify-content:center;margin-bottom:32px;flex-wrap:nowrap}
.polaroid{background:#FEFCF9;padding:20px 20px 60px;box-shadow:0 12px 48px rgba(61,43,39,.22),0 2px 12px rgba(61,43,39,.12);border-radius:2px;max-width:300px;flex:1 1 0;min-width:0;cursor:default;position:relative;transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .3s}
.polaroid-left{transform:rotate(-4.5deg)}
.polaroid-right{transform:rotate(3deg)}
.polaroid:hover{transform:rotate(0deg) scale(1.06) translateY(-6px);box-shadow:0 20px 60px rgba(61,43,39,.20);z-index:5}
.polaroid-img{width:100%;aspect-ratio:1/1;height:auto;background:#f0f0f0;display:flex;align-items:center;justify-content:center;margin-bottom:15px;border-radius:1px;overflow:hidden}
.polaroid-img img{width:100%;height:100%;object-fit:contain;background:#f0f0f0}
.polaroid-caption{font-family:'Playfair Display',serif;font-size:.78rem;font-style:italic;letter-spacing:.01em;color:var(--brown);line-height:1.6;text-align:center}

.hero-names{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;margin-top:20px}
.hero-name{display:flex;align-items:baseline}
.name-cap{font-family:var(--serif);font-size:clamp(2.5rem,8vw,5.5rem);font-weight:300;text-transform:uppercase;letter-spacing:.25em;color:var(--brown);line-height:1.4}

.message-section{position:relative;padding:30px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;z-index:1;overflow:hidden}
.msg-polaroids{display:flex;gap:32px;justify-content:center;margin-bottom:20px;flex-wrap:nowrap}
.msg-polaroids .polaroid{max-width:320px}
.msg-polaroids .polaroid-img{width:100%;height:auto;aspect-ratio:1/1}
.msg-pol-1{transform:rotate(-3deg)}
.msg-pol-2{transform:rotate(2deg)}

.calendar-section{background:var(--cream);padding:100px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:40px;position:relative;z-index:1}
.cal-card{background:#fff;border-radius:40px;padding:60px 48px;box-shadow:0 20px 80px rgba(61,43,39,.08);width:min(600px,100%);margin-bottom:60px}
.cal-title{font-family:var(--serif);font-size:3.5rem;font-weight:300;color:var(--deep);text-transform:uppercase;letter-spacing:.1em;margin-bottom:40px}
.cal-month{font-family:var(--serif);font-size:2rem;text-transform:uppercase;color:var(--deep);margin-bottom:32px;letter-spacing:.05em}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:12px 4px}
.dn{font-family:var(--body);font-size:1rem;font-weight:500;letter-spacing:.1em;color:var(--taupe);text-transform:uppercase;padding:12px 0;text-align:center}
.d{font-family:var(--serif);font-size:1.4rem;font-weight:400;color:var(--deep);padding:12px 2px;text-align:center;border-radius:50%;transition:background .2s,color .2s}
.d-marked{border:1px solid var(--deep);color:var(--deep)!important;font-weight:500}
.cal-message{font-family:var(--serif);font-size:1.25rem;color:var(--deep);margin-top:50px;line-height:1.6;opacity:.85}
.big-date-wrap{text-align:center;margin-top:40px}
.big-date{font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(3rem,12vw,6.5rem);color:var(--deep);line-height:1;letter-spacing:.02em}

.countdown-section{background:linear-gradient(135deg,#F8EFE6 0%,#F0E4D8 100%);padding:80px 24px;text-align:center;position:relative;z-index:1}
.countdown-label{font-family:var(--body);font-size:.74rem;letter-spacing:.22em;color:var(--taupe);text-transform:uppercase;margin-bottom:32px}
.countdown{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
.cd-item{display:flex;flex-direction:column;align-items:center;min-width:68px}
.cd-num{font-family:var(--modern);font-weight:400;font-size:clamp(2.4rem,8vw,4.8rem);color:var(--brown);line-height:1}
.cd-num.tick{animation:tickAnim .25s ease}
@keyframes tickAnim{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}
.cd-unit{font-family:var(--body);font-size:.85rem;letter-spacing:.12em;color:var(--taupe);text-transform:uppercase;margin-top:8px}
.cd-colon{font-family:var(--display);font-size:clamp(2.2rem,7vw,4rem);color:var(--rose);margin-bottom:20px;line-height:1}
.cd-done{font-family:var(--script);font-size:2rem;color:var(--brown)}

.location-section{background:var(--paper);padding:100px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:40px;position:relative;z-index:1}
.loc-card{background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 16px 60px rgba(61,43,39,.10);width:min(500px,100%);margin:0 auto;display:flex;flex-direction:column;transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s}
.loc-img-wrap{width:100%;height:300px;overflow:hidden}
.loc-photo{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.loc-card:hover .loc-photo{transform:scale(1.05)}
.loc-card:hover{transform:translateY(-8px);box-shadow:0 24px 72px rgba(61,43,39,.15)}
.loc-detail{padding:28px 28px 36px;text-align:center;width:100%}
.loc-type{font-family:var(--body);font-size:.68rem;letter-spacing:.28em;color:var(--taupe);text-transform:uppercase;margin-bottom:8px}
.loc-name{font-family:'Playfair Display',serif;font-size:1.55rem;font-style:italic;color:var(--brown);margin-bottom:8px}
.location-section .section-tag,.dresscode-section .section-tag,.rsvp-section .section-tag{font-size:1.02rem}
.loc-addr{font-size:.88rem;color:var(--taupe);margin-bottom:24px;line-height:1.6;white-space:pre-line}
.loc-note{font-size:.95rem;color:var(--brown);margin:-8px 0 20px;line-height:1.6;white-space:pre-line}
.map-btn{display:inline-block;padding:11px 28px;border:1.5px solid var(--taupe);border-radius:40px;font-size:.78rem;letter-spacing:.12em;color:var(--brown);text-decoration:none;transition:all .3s ease}
.map-btn:hover{background:var(--brown);color:#fff;border-color:var(--brown)}

.timing-section{background-color:var(--cream);background-image:radial-gradient(circle at 20% 30%,rgba(61,43,39,.035) 0 1px,transparent 1.5px),radial-gradient(circle at 75% 65%,rgba(255,255,255,.55) 0 1px,transparent 1.5px);background-size:18px 18px,23px 23px;padding:120px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1}
.timeline{position:relative;max-width:400px;width:100%;margin-top:0}
.timing-title{font-family:var(--serif);font-size:clamp(2.5rem,8vw,4.5rem);font-weight:500;text-transform:uppercase;letter-spacing:.15em;color:var(--deep);margin-bottom:60px}
.tl-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;margin-bottom:80px}.tl-item .ie-remove-detail{right:calc(50% - 92px);top:4px}
.tl-time{font-family:var(--serif);font-size:2.4rem;font-style:italic;font-weight:500;color:var(--brown);text-align:center;padding-right:0}
.tl-icon{margin-bottom:12px}
.tl-img{width:80px;height:80px;object-fit:contain;filter:grayscale(1) contrast(1.1);opacity:.8;transition:transform .4s ease,opacity .3s}
.tl-item:hover .tl-img{transform:translateY(-5px);opacity:1}
.tl-label{font-family:var(--body);font-size:1.2rem;font-weight:600;letter-spacing:.18em;color:var(--deep);text-transform:uppercase;text-align:center}
.tl-note{font-family:var(--script);font-size:1.1rem;font-weight:500;color:var(--brown);margin-top:5px}

.dresscode-section{background:var(--paper);padding:100px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:28px;position:relative;z-index:1}
.dc-cursive{font-family:var(--script);font-size:clamp(2rem,6vw,3rem);color:var(--rose-d);margin-bottom:-10px}
.dc-text{font-family:var(--serif);font-size:clamp(1rem,3vw,1.3rem);font-style:italic;color:var(--brown);line-height:1.8;white-space:pre-line}
.dc-swatches{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:32px}
.dc-reference{width:100%;max-width:600px;margin:32px auto 0;padding:0}
.dc-ref-img{width:100%;height:auto;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.1);border:none}
.swatch{width:54px;height:54px;border-radius:50%;box-shadow:0 4px 16px rgba(61,43,39,.14);transition:transform .3s ease,box-shadow .3s;cursor:default}
.swatch:hover{transform:scale(1.18) translateY(-4px);box-shadow:0 10px 28px rgba(61,43,39,.20)}

.wishes-section{background:linear-gradient(135deg,var(--deep) 0%,#2D1F1B 100%);padding:100px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:32px;position:relative;z-index:1}
.wishes-section .section-tag{color:var(--gold-l)}
.wishes-section .section-tag::before,.wishes-section .section-tag::after{color:var(--rose)}
.wishes-static{width:min(720px,100%);display:flex;flex-direction:column;gap:32px}
.ws-title{font-family:var(--serif);font-size:clamp(1.6rem,5vw,2.4rem);color:var(--gold-l);font-style:italic}
.ws-text{font-family:var(--serif);font-size:clamp(1.3rem,4.5vw,1.8rem);font-style:italic;color:rgba(255,255,255,.88);line-height:1.9;text-align:center}
.wishes-body p+p{margin-top:32px}

.rsvp-section{background:var(--paper);padding:100px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:24px;position:relative;z-index:1}
.rsvp-intro{font-family:var(--serif);font-size:1.6rem;font-style:italic;color:var(--brown)}
.rsvp-sub{font-family:var(--serif);font-size:1.15rem;color:var(--taupe);max-width:36rem;white-space:pre-line}
.rsvp-form{background:#fff;border-radius:28px;padding:56px 48px;box-shadow:0 24px 72px rgba(61,43,39,.12);width:min(720px,100%);display:flex;flex-direction:column;gap:36px;text-align:left}
.fg{display:flex;flex-direction:column;gap:14px}
.fl{font-family:var(--body);font-size:1.1rem;letter-spacing:.16em;color:var(--taupe);text-transform:uppercase}
.fi{border:none;border-bottom:2px solid var(--beige);background:transparent;padding:16px 6px;font-family:var(--serif);font-size:1.3rem;color:var(--deep);outline:none;transition:border-color .3s;width:100%;border-radius:0}
.fi:focus{border-bottom-color:var(--rose)}
.fi::placeholder{color:var(--taupe);font-style:italic}
.fi[readonly]{color:var(--brown)}
.radio-group,.check-group{display:flex;flex-direction:column;gap:12px}
.check-group{flex-direction:row;flex-wrap:wrap}
.rl,.cl{display:flex;align-items:center;gap:16px;font-family:var(--serif);font-size:1.4rem;color:var(--brown);cursor:pointer;user-select:none;padding:8px 0}
.cl{margin-right:18px}
.rl input,.cl input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.rc,.cc{width:20px;height:20px;border:1.5px solid var(--taupe);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .2s,background .2s}
.cc{border-radius:4px}
.rl input:checked+.rc,.cl input:checked+.cc{border-color:var(--rose);background:var(--rose)}
.rl input:checked+.rc::after{content:'';width:8px;height:8px;border-radius:50%;background:#fff}
.cl input:checked+.cc::after{content:'✓';color:#fff;font-size:11px}
.rl input:focus-visible+.rc,.cl input:focus-visible+.cc{outline:2px solid var(--rose-d);outline-offset:2px}
.submit-btn{background:linear-gradient(135deg,var(--rose) 0%,var(--rose-d) 100%);color:#fff;border:none;border-radius:40px;padding:15px 48px;font-family:var(--body);font-size:.84rem;letter-spacing:.14em;cursor:pointer;align-self:center;box-shadow:0 8px 32px rgba(154,110,104,.4);transition:transform .3s,box-shadow .3s}
.submit-btn:disabled{opacity:.7;cursor:not-allowed}
.submit-btn:not(:disabled):hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(154,110,104,.5)}
.rsvp-note{font-family:var(--serif);font-size:1.05rem;font-style:italic;color:var(--rose-d);text-align:center}
.rsvp-success{display:none;flex-direction:column;align-items:center;gap:20px;background:#fff;border-radius:24px;padding:60px 40px;box-shadow:0 20px 60px rgba(61,43,39,.10);width:min(540px,100%)}
.rsvp-success.show{display:flex;animation:fadeUp .6s cubic-bezier(.22,1,.36,1)}
.success-emoji{font-size:5rem;animation:bounceIn .6s cubic-bezier(.22,1,.36,1)}
@keyframes bounceIn{from{transform:scale(0)}to{transform:scale(1)}}
.rsvp-success p{font-family:var(--serif);font-size:1.15rem;font-style:italic;color:var(--brown);text-align:center;line-height:1.8;white-space:pre-line}
.rsvp-again{background:none;border:0;color:var(--taupe);font-size:1rem;text-decoration:underline;cursor:pointer}

.site-footer{background:var(--deep);padding:60px 24px 40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative;z-index:1}
.footer-love{font-family:var(--script);font-size:1.4rem;color:var(--taupe)}
.footer-names{font-family:var(--display);font-size:clamp(2.5rem,8vw,4rem);color:var(--gold-l);letter-spacing:.02em}
.footer-links{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-top:18px}
.footer-links a{color:var(--taupe);font-size:1rem;letter-spacing:.08em}
.footer-date{font-size:.8rem;letter-spacing:.15em;color:rgba(255,255,255,.35);margin-top:16px}

@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

.music-toggle{position:fixed;bottom:30px;right:30px;width:50px;height:50px;border-radius:50%;background:#fff;border:none;box-shadow:0 8px 24px rgba(61,43,39,.15);cursor:pointer;z-index:100;display:flex;align-items:center;justify-content:center;font-size:1.4rem;transition:all .3s ease;opacity:0;visibility:hidden}
.music-toggle.visible{opacity:1;visibility:visible}
.music-toggle:hover{transform:scale(1.1);background:var(--rose-l)}
.music-toggle.playing{animation:musicPulse 2s linear infinite}
@keyframes musicPulse{0%{box-shadow:0 0 0 0 rgba(232,196,192,.4)}70%{box-shadow:0 0 0 15px rgba(232,196,192,0)}100%{box-shadow:0 0 0 0 rgba(232,196,192,0)}}

.tili-banner{position:relative;z-index:5;margin:0;padding:14px 20px;background:var(--brown);color:#fff;text-align:center;font-size:1.1rem}
.tili-guest{position:relative;z-index:5;padding:28px 20px 0;text-align:center;font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;color:var(--taupe)}

@media (max-width:768px){
.rsvp-form{padding:40px 28px;width:min(600px,100%)}
.loc-card{max-width:100%}
.name-cap{font-size:clamp(2rem,8vw,4rem);line-height:1.1}
.msg-polaroids{gap:14px;padding:0 8px}
.msg-polaroids .polaroid{flex:1 1 calc(50% - 7px);max-width:min(45vw,250px);padding:12px 12px 20px}
}
@media (max-width:480px){
.calendar-section{padding:70px 14px;gap:24px}
.cal-card{width:min(360px,100%);padding:34px 18px;border-radius:28px;margin-bottom:34px}
.cal-title{font-size:2.4rem;margin-bottom:24px}
.cal-month{font-size:1.5rem;margin-bottom:20px}
.cal-grid{gap:8px 2px}
.dn{font-size:.8rem;padding:8px 0}
.d{font-size:1.12rem;padding:8px 2px}
.rsvp-form{padding:24px 16px}
.fi{font-size:1rem;padding:12px 2px}
.fl{font-size:.7rem}
.rl,.cl{font-size:.95rem}
.msg-polaroids,.polaroids{gap:10px;flex-wrap:nowrap;padding:0 6px;margin-bottom:12px}
.msg-polaroids .polaroid{flex:1 1 calc(50% - 5px);max-width:min(46vw,210px);padding:10px 10px 16px}
.msg-polaroids .polaroid-img{width:100%;height:auto;aspect-ratio:1/1}
.hero .polaroid-caption{font-size:.95rem;line-height:1.45;margin-top:8px}
.msg-polaroids .polaroid-caption{font-size:.9rem!important;margin-top:6px}
.hero-rhyme{font-size:clamp(1.85rem,7vw,2.25rem)}
.name-cap{font-size:clamp(1.2rem,7vw,1.8rem);line-height:1.1}
.hero-names{gap:8px;flex-direction:column}
.rsvp-intro{font-size:1rem;margin-bottom:15px}
.section-tag{font-size:.6rem;margin-bottom:15px}
.location-section .section-tag,.dresscode-section .section-tag,.rsvp-section .section-tag{font-size:.72rem}
.cd-colon{font-size:1.5rem}
.cd-item{min-width:48px}
.cd-num{font-size:2.2rem}
.tl-time{font-size:1.9rem}
}
@media (prefers-reduced-motion:reduce){.tili-js .reveal,.tili-js .fade-in-hero{transition:none}.flag,.cover-hint,.music-toggle.playing{animation:none}}

.ie-editing .tili-js .main-content,.ie-editing .main-content{opacity:1}
.ie-editing .reveal,.ie-editing .fade-in-hero{opacity:1!important;transform:none!important}
.ie-editing .cover{display:none!important}
.ie-editing body{overflow:auto!important}
.ie-editing .polaroid:hover,.ie-editing .loc-card:hover,.ie-editing .msg-main-photo:hover{transform:none}
.ie-editing .polaroid-left{transform:rotate(-4.5deg)}.ie-editing .polaroid-right{transform:rotate(3deg)}
.ie-editing .msg-pol-1{transform:rotate(-3deg)}.ie-editing .msg-pol-2{transform:rotate(2deg)}
.ie-editing .music-toggle{opacity:1;visibility:visible}
`.replace(/\n/g, "");
