/**
 * Стили шаблона «Акварель».
 *
 * Бумага собрана из мягких радиальных пятен и едва заметного зерна —
 * без единого файла. Зерно нарисовано SVG-шумом прямо в `background`:
 * одна строка вместо запроса за текстурой.
 */
export const AQUARELLE_FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Open+Sans:wght@300;400;600&family=Marck+Script&display=swap&subset=cyrillic,latin">';

/** Зерно бумаги: SVG-шум как data-URI. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.055'/%3E%3C/svg%3E\")";

export const AQUARELLE_CSS = `
.sheet.aquarelle{--ap:#f7e9dc;--apaper:#fdf5ea;--aink:#46627d;--awine:#7c1f1c;--agreen:#2f6b5a;--amuted:#9c8672;--aribbon:#e6b9bd;
--aserif:"Playfair Display",Georgia,serif;--ascript:"Marck Script","Playfair Display",cursive;--asans:"Open Sans",-apple-system,"Segoe UI",sans-serif;
position:relative;max-width:none;padding:0;background:var(--ap);color:var(--aink);font-family:var(--asans);overflow:hidden}
body:has(.sheet.aquarelle){background:#f7e9dc}
/* Акварельные разводы рисует сам шаблон — чужое пятно за курсором лишнее. */
body:has(.sheet.aquarelle) .bits-ambient,body:has(.sheet.aquarelle) .bits-spotlight{display:none!important}
.aq-wash{position:absolute;inset:0;z-index:0;pointer-events:none;
background:radial-gradient(60% 40% at 12% 8%,#f3d9c0aa,transparent 70%),radial-gradient(50% 35% at 88% 18%,#f7dfd3aa,transparent 72%),
radial-gradient(55% 30% at 20% 52%,#efd3b8a0,transparent 70%),radial-gradient(60% 32% at 85% 68%,#f2d9c7a8,transparent 72%),
radial-gradient(70% 40% at 45% 96%,#eed2b6a0,transparent 70%),${GRAIN}}
.aquarelle [data-aq-block]{position:relative;z-index:1;margin:0;padding:4.5rem 1.6rem;text-align:center}
.aquarelle h1,.aquarelle h2{font-family:var(--aserif);font-weight:400;color:var(--awine);text-transform:uppercase;letter-spacing:.09em}
.aquarelle h2{margin:0 0 1.2rem;font-size:clamp(1.5rem,5.6vw,2.1rem);line-height:1.25}
.aquarelle h2::before,.aquarelle h2::after{display:none}
.aq-tag{margin:0 0 .7rem;color:var(--agreen);font:600 .58rem/1.6 var(--asans);letter-spacing:.3em;text-transform:uppercase}
.aq-copy{max-width:30rem;margin:0 auto;color:#5d4f45;font:300 .95rem/1.9 var(--asans);white-space:pre-line}
.aq-ribbon{display:block;width:min(17rem,74%);height:auto;margin:0 auto 1.6rem}
.aq-star{position:absolute;width:1.3rem;height:1.3rem;color:#9db6cc;opacity:.75;animation:aq-twinkle 4s ease-in-out infinite}
.aq-star-a{left:12%;top:26%;color:#c8a24a}.aq-star-b{right:14%;top:31%;animation-delay:-1.4s}
.aq-star-c{left:20%;top:44%;width:.9rem;height:.9rem;animation-delay:-2.6s}
/* На узком экране имена занимают всю ширину — звёздочка садилась на букву. */
@media(max-width:480px){.aq-star-c{left:6%;top:auto;bottom:18%}}

.aq-cover{padding-top:6rem!important}
.aq-names{margin:0;font-size:clamp(2rem,9vw,3.4rem);line-height:1.1}
.aq-groom{color:var(--aink)}
.aq-and{color:var(--aink);font-size:.8em}
.aq-bride{display:inline-block;color:var(--awine);font-family:var(--ascript);font-size:1.45em;font-weight:400;letter-spacing:0;text-transform:none;line-height:.9;vertical-align:-.12em}
.aq-kicker{margin:1.4rem 0 0;color:var(--agreen);font:600 .6rem/1.8 var(--asans);letter-spacing:.26em;text-transform:uppercase}
.aq-cover-date{margin:1.6rem 0 0;color:var(--awine);font:400 1.5rem var(--aserif);letter-spacing:.14em;text-transform:uppercase}

.aq-note h2{font-size:clamp(1.4rem,5.2vw,1.9rem)}
.aq-venue-name{margin:1.4rem 0 .4rem;color:var(--awine);font:400 1.6rem var(--aserif);letter-spacing:.12em;text-transform:uppercase}
.aq-venue-address{margin:0 0 1.2rem;color:var(--amuted);font:400 .78rem/1.8 var(--asans);letter-spacing:.08em;white-space:pre-line}
.aq-arch{margin:0 auto;padding:.5rem;max-width:22rem;border:1px solid #e0cdb6;border-radius:11rem 11rem .6rem .6rem;background:var(--apaper);box-shadow:0 14px 34px #a67c5726}
.aq-arch img,.aq-arch .ie-image-placeholder{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10.5rem 10.5rem .3rem .3rem}
.aq-arch figcaption{padding:.6rem .2rem .1rem;color:var(--amuted);font:600 .55rem var(--asans);letter-spacing:.2em;text-transform:uppercase}
.aq-arches{display:grid;gap:1.2rem;justify-items:center;max-width:34rem;margin:0 auto}
.aq-arches .aq-arch{opacity:0;transform:translateY(20px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.8,.2,1)}
.aq-arches .aq-arch.aq-rise{opacity:1;transform:none}

.aq-slots{max-width:32rem;margin:0 auto;padding:0;list-style:none;text-align:left}
.aq-slots li{display:grid;grid-template-columns:4.6rem 1fr;gap:1rem;align-items:baseline;padding:1.1rem 0;border-bottom:1px solid #e3d0ba;
opacity:0;transform:translateY(14px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.aq-slots li.aq-rise{opacity:1;transform:none}
.aq-slots li:last-child{border-bottom:none}
.aq-slots time{color:var(--awine);font:400 1.15rem var(--aserif);letter-spacing:.06em}
.aq-slots strong{display:block;color:var(--aink);font:600 .68rem var(--asans);letter-spacing:.2em;text-transform:uppercase}
.aq-slots small{display:block;margin-top:.4rem;color:#6b5c50;font:300 .82rem/1.7 var(--asans)}
.aq-add{display:block;margin:1.4rem auto 0;padding:.6rem 1.2rem;border:1px solid var(--awine);border-radius:999px;background:transparent;color:var(--awine);cursor:pointer;font:600 .6rem var(--asans);letter-spacing:.16em;text-transform:uppercase}

.aq-palette{display:flex;flex-wrap:wrap;justify-content:center;gap:.8rem;margin-top:1.8rem}
.aq-palette i{display:block;width:2.6rem;height:2.6rem;border:1px solid #ffffffb0;border-radius:50%;background:var(--swatch);box-shadow:0 8px 18px #a67c5726}

.aq-button{display:inline-block;margin-top:1.6rem;padding:.85rem 2.4rem;border:1px solid var(--awine);border-radius:999px;background:transparent;
color:var(--awine);text-decoration:none;font:600 .62rem var(--asans);letter-spacing:.22em;text-transform:uppercase;transition:background .3s,color .3s}
.aq-button:hover{background:var(--awine);color:#fdf5ea}
.aq-answer{margin:1.6rem 0 0;color:var(--awine);font:400 1.15rem var(--aserif)}
.aq-closing h2{font-size:clamp(1.9rem,8vw,3rem);letter-spacing:.12em}
.aq-closing{padding-bottom:6rem!important}

.aquarelle>section:not([data-aq-block]){position:relative;z-index:1;padding:4rem 1.6rem;text-align:center}
.aquarelle .countdown{gap:.6rem;justify-content:center}
.aquarelle .countdown div{min-width:4.4rem;padding:1rem .5rem;border:1px solid #e3d0ba;border-radius:.6rem;background:#fdf5eab3}
.aquarelle .countdown b{display:block;color:var(--awine);font:400 1.9rem var(--aserif)}
.aquarelle .countdown span{color:var(--agreen);font:600 .52rem var(--asans);letter-spacing:.18em;text-transform:uppercase}
.aquarelle .foot,.aquarelle .who{position:relative;z-index:1;color:var(--amuted);font-family:var(--asans)}
.aquarelle .links a{border-color:var(--awine);color:var(--awine)}

#aq-intro{position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6rem;
padding:2rem 1.5rem;background:#f7e9dc;cursor:pointer;transition:opacity .9s ease}
#aq-intro::before{content:'';position:absolute;inset:0;
background:radial-gradient(60% 40% at 15% 10%,#f3d9c0,transparent 70%),radial-gradient(55% 35% at 85% 20%,#f7dfd3,transparent 72%),
radial-gradient(60% 40% at 50% 92%,#eed2b6,transparent 70%),${GRAIN}}
#aq-intro.aq-gone{opacity:0;pointer-events:none}
.aq-intro-names{position:relative;z-index:2;margin:0;color:var(--awine,#7c1f1c);font:400 clamp(1.7rem,7.5vw,2.6rem)/1.15 var(--aserif,serif);
letter-spacing:.09em;text-transform:uppercase;text-align:center}
.aq-intro-names .aq-bride{font-family:var(--ascript,cursive)}
.aq-intro-names .aq-groom,.aq-intro-names .aq-and{color:var(--aink,#46627d)}
.aq-envelope{position:relative;z-index:2;width:min(78vw,23rem);aspect-ratio:1.42;perspective:900px;transition:transform 1s cubic-bezier(.4,0,.2,1)}
#aq-intro.aq-gone .aq-envelope{transform:translateY(-6%) scale(1.06)}
.aq-env-body{position:absolute;inset:0;border-radius:.5rem;overflow:hidden;box-shadow:0 18px 40px #a67c5740;
background:repeating-linear-gradient(90deg,#e3edf5 0 .62rem,#fbfdff .62rem 1.24rem)}
.aq-env-body::after{content:'';position:absolute;inset:0;border:1px solid #cfdbe6;border-radius:.5rem}
.aq-env-letter{position:absolute;left:6%;right:6%;top:8%;height:74%;border-radius:.3rem;background:#fdf7ee;box-shadow:0 8px 18px #00000014;
transform:translateY(22%);opacity:0;transition:transform 1s cubic-bezier(.2,.8,.2,1) .25s,opacity .6s .25s}
#aq-intro.aq-gone .aq-env-letter{transform:translateY(-16%);opacity:1}
.aq-env-flap{position:absolute;left:0;right:0;top:0;height:58%;transform-origin:top center;transform-style:preserve-3d;
transition:transform 1s cubic-bezier(.4,0,.2,1);z-index:3}
#aq-intro.aq-gone .aq-env-flap{transform:rotateX(-168deg)}
.aq-env-flap svg{display:block;width:100%;height:100%}
.aq-seal{position:absolute;left:50%;top:60%;z-index:4;width:22%;aspect-ratio:1;margin-left:-11%;
border-radius:50%;background:radial-gradient(circle at 50% 42%,#fdf3e6,#f0dcc6 62%,#e2c8ad);
box-shadow:0 6px 14px #a67c5738;display:grid;place-items:center;transition:opacity .5s}
.aq-seal::after{content:'';width:52%;height:52%;border-radius:50%;border:1px dashed #c78f93;background:#f6dfe0}
#aq-intro.aq-gone .aq-seal{opacity:0}
#aq-intro p{position:relative;z-index:2;max-width:17rem;margin:0;color:#8a7461;
font:400 .68rem/1.9 var(--asans,sans-serif);letter-spacing:.14em;text-align:center;animation:aq-hint 2.6s ease-in-out infinite}

.aq-motion .aquarelle [data-aq-block]{opacity:0;transform:translateY(22px);transition:opacity .9s ease,transform .9s cubic-bezier(.2,.8,.2,1)}
.aq-motion .aquarelle .aq-cover,.aq-motion .aquarelle .aq-in{opacity:1;transform:none}

@keyframes aq-twinkle{0%,100%{opacity:.3;transform:scale(.85)}50%{opacity:.9;transform:scale(1)}}
@keyframes aq-hint{0%,100%{opacity:.55}50%{opacity:1}}

@media(min-width:720px){.aquarelle [data-aq-block]{padding:6rem 2.5rem}.aq-arches{grid-template-columns:repeat(3,1fr);align-items:start}}
@media(prefers-reduced-motion:reduce){.aq-star,#aq-intro p{animation:none}
.aq-motion .aquarelle [data-aq-block],.aq-slots li,.aq-arches .aq-arch{opacity:1;transform:none;transition:none}}

/* A photographic opening and a varied editorial rhythm replace the drawn envelope. */
.sheet.aquarelle{--ap:#f4eadf;--apaper:#fffaf4;--aline:#d9c9b9}
.aquarelle [data-aq-block]{box-sizing:border-box;padding:6rem max(1.5rem,calc((100vw - 1180px)/2));text-align:left}
.aquarelle h2{font-size:clamp(1.8rem,3.2vw,3rem);line-height:1.16}
.aq-tag,.aq-eyebrow{margin:0 0 1.1rem;color:var(--agreen);font:600 .68rem/1.6 var(--asans);letter-spacing:.29em;text-transform:uppercase}
.aq-copy{max-width:35rem;margin:0;color:#655a4f;font-size:clamp(.9rem,1.2vw,1.03rem)}
.aq-cover{display:grid;grid-template-columns:1fr .96fr;align-items:center;gap:5vw;min-height:min(820px,100svh);padding-top:6rem!important;background:#f8f0e6}
.aq-cover-copy{max-width:34rem;padding:4rem 0 6rem}
.aq-cover-copy::before{content:'';display:block;width:3.5rem;height:1px;margin-bottom:2.5rem;background:var(--awine)}
.aq-names{margin:0;font-size:clamp(3.3rem,5.7vw,6.7rem);line-height:1.02;letter-spacing:.035em}
.aq-groom{display:block;color:var(--aink)}
.aq-and{display:block;padding:.3rem 0 .1rem 2rem;color:var(--agreen);font:400 .45em var(--ascript);text-transform:none;letter-spacing:0}
.aq-bride{display:block;margin-left:1.7rem;color:var(--awine);font:400 1.15em/.95 var(--ascript);letter-spacing:0;text-transform:none}
.aq-kicker{margin:2.5rem 0 0;font-size:.67rem}
.aq-cover-date{margin:1.2rem 0 0;font-size:clamp(1.4rem,2vw,2rem)}
.aq-cover .aq-copy{margin-top:1.2rem}
.aq-cover-photo{position:relative;width:100%;height:min(660px,75svh);margin:0;padding:.75rem;background:#fffaf3;box-shadow:0 22px 55px #503e3326;transform:rotate(2deg)}
.aq-cover-photo::after{content:'';position:absolute;left:-1.7rem;bottom:2.2rem;width:5.5rem;height:15rem;background:linear-gradient(90deg,#caa8a5b5,#e9c7c1dd 45%,#b78583aa);opacity:.72;transform:rotate(25deg);pointer-events:none}
.aq-cover-photo img{display:block;width:100%;height:100%;object-fit:cover}
.aq-cover-index{position:absolute;left:max(1.5rem,calc((100vw - 1180px)/2));bottom:1.65rem;color:#9b8677;font:600 .58rem var(--asans);letter-spacing:.22em;text-transform:uppercase}
.aq-note-intro{display:grid;grid-template-columns:.34fr 1fr;align-items:center;gap:1rem 4rem;min-height:420px;background:#fffaf4}
.aq-note-intro::before{content:'02';grid-row:1/3;align-self:start;color:#dfc4b4;font:400 clamp(5rem,12vw,11rem)/1 var(--aserif)}
.aq-note-intro h2{grid-column:2;align-self:end;margin:0}
.aq-note-intro .aq-copy{grid-column:2;align-self:start;max-width:39rem;font:400 clamp(1.15rem,1.8vw,1.65rem)/1.7 var(--aserif)}
.aq-note-detail{display:inline-flex;vertical-align:top;flex-direction:column;justify-content:center;width:50%;min-height:340px;padding:5rem max(2rem,calc((100vw - 1180px)/2))!important;background:#f6e8df}
.aq-note-detail + .aq-note-detail{background:#e6e9df}
.aq-note-detail h2{font-size:clamp(1.9rem,2.5vw,2.8rem)}
.aq-note-detail .aq-copy{max-width:27rem}
.aq-venue{display:grid;grid-template-columns:.88fr 1fr;align-items:center;gap:6vw;background:#e9e7da}
.aq-venue-content{grid-column:1;grid-row:1}
.aq-venue>.aq-arch{grid-column:2;grid-row:1;width:100%;max-width:none;margin:0;transform:rotate(-2deg)}
.aq-venue-name{margin:2rem 0 .55rem;font-size:clamp(1.3rem,1.9vw,2rem)}
.aq-venue-address{color:var(--agreen)}
.aq-arch{box-sizing:border-box;padding:.75rem;border-radius:0;background:#fffaf4;box-shadow:0 18px 45px #63534725}
.aq-arch img,.aq-arch .ie-image-placeholder{aspect-ratio:4/5;border-radius:0}
.aq-button{border-radius:0;background:var(--awine);color:#fffaf4}
.aq-button:hover{background:transparent;color:var(--awine)}
.aq-timing{background:#fffaf4}
.aq-timing>.aq-tag,.aq-timing>h2{text-align:center}
.aq-slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.1rem;max-width:1180px;margin:3rem auto 0}
.aq-slots li{display:block;min-height:225px;padding:2rem 1.3rem 1.8rem;border:1px solid #e5d5c6;background:#fcf7ef}
.aq-slots li:nth-child(even){margin-top:2rem;background:#f1eee5}
.aq-slots li:last-child{border-bottom:1px solid #e5d5c6}
.aq-slots time{display:block;margin-bottom:2.1rem;font-size:2.1rem}
.aq-slots strong{color:var(--agreen);font-size:.69rem;letter-spacing:.14em}
.aq-slots small{font-size:.78rem}
.aq-dress{display:grid;grid-template-columns:1fr .9fr;column-gap:5rem;align-items:center;background:#e3e9e3}
.aq-dress .aq-tag,.aq-dress h2,.aq-dress .aq-copy{grid-column:1}
.aq-dress .aq-palette{grid-column:2;grid-row:1/span 3}
.aq-palette{gap:1rem;max-width:360px;margin:auto}
.aq-palette i{width:4rem;height:4rem;border:.4rem solid #fffaf4;border-radius:0;transform:rotate(12deg)}
.aq-palette i:nth-child(even){transform:translateY(1.3rem) rotate(-8deg)}
.aq-gallery{background:#fffaf4;text-align:center!important}
.aq-arches{grid-template-columns:1.04fr .8fr 1fr;align-items:center;gap:1.6rem;max-width:1040px;margin:3rem auto 0}
.aq-arches .aq-arch{width:100%;max-width:none;margin:0}
.aq-arches .aq-arch:nth-child(2){margin-top:5rem}.aq-arches .aq-arch:nth-child(3){margin-top:1rem}
.aq-arches .aq-arch.aq-rise{transform:rotate(-2deg)}
.aq-arches .aq-arch:nth-child(2).aq-rise{transform:rotate(3deg)}
.aq-arches .aq-arch:nth-child(3).aq-rise{transform:rotate(-1deg)}
.aq-rsvp{background:#f1e2dc;text-align:center!important}.aq-rsvp .aq-copy{margin:auto}
.aq-closing{min-height:330px;background:#f8f0e6;text-align:center!important}.aq-closing .aq-copy{margin:auto;color:var(--agreen);font-family:var(--aserif);font-size:1.2rem}
.aquarelle>section:not([data-aq-block]){background:#f8f0e6}
#aq-intro{display:grid;grid-template-columns:1.15fr .85fr;grid-template-rows:1fr;align-items:stretch;justify-items:stretch;gap:0;padding:0;background:#faf3e9;transition:opacity .7s ease}
#aq-intro::before{display:none}
.aq-intro-photo{background:#e5d7c8 url('/media/invite-aquarelle/stationery-intro.webp') center/cover no-repeat}
.aq-intro-copy{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:clamp(2rem,6vw,7rem);background:${GRAIN},#faf3e9}
.aq-intro-overline{margin-bottom:2rem;color:var(--agreen,#2f6b5a);font:600 .66rem var(--asans,sans-serif);letter-spacing:.28em;text-transform:uppercase}
.aq-intro-names{text-align:left;font-size:clamp(2.7rem,5vw,5.5rem);line-height:1.05;letter-spacing:.04em}
.aq-intro-names .aq-and{padding:.35rem 0 0 1.2rem}
.aq-intro-names .aq-bride{margin-left:1rem}
.aq-intro-rule{width:3.5rem;height:1px;margin:2.4rem 0;background:#7c1f1c}
.aq-intro-button{display:flex;justify-content:space-between;gap:2.5rem;min-width:14rem;padding:1rem 1.15rem;background:var(--awine,#7c1f1c);color:#fffaf4;font:600 .65rem var(--asans,sans-serif);letter-spacing:.12em;text-transform:uppercase}
.aq-intro-button span{font-size:1rem;line-height:.7}
.aq-intro-copy p{margin:1rem 0 0;font-size:.7rem;animation:none}
@media(max-width:900px){.aquarelle [data-aq-block]{padding:4.5rem 2rem}.aq-cover{gap:2rem;min-height:680px}.aq-slots{grid-template-columns:repeat(2,minmax(0,1fr))}.aq-slots li:nth-child(even){margin-top:0}.aq-note-detail{padding:4rem 2rem!important}.aq-venue{gap:2rem}}
@media(max-width:640px){#aq-intro{grid-template-columns:1fr;grid-template-rows:51svh 1fr}.aq-intro-photo{background-position:center 52%}.aq-intro-copy{padding:1.8rem 2rem;justify-content:center}.aq-intro-overline{margin-bottom:.7rem}.aq-intro-names{font-size:clamp(2.4rem,9vw,4rem)}.aq-intro-names .aq-groom,.aq-intro-names .aq-and,.aq-intro-names .aq-bride{display:inline;margin:0;padding:0}.aq-intro-rule{margin:1.2rem 0}.aq-intro-copy p{display:none}
.aquarelle [data-aq-block]{padding:4rem 1.4rem}.aq-cover{display:flex;flex-direction:column-reverse;gap:0;min-height:auto;padding-top:1.2rem!important}.aq-cover-photo{width:min(100%,460px);height:auto;aspect-ratio:1.12;transform:rotate(1deg)}.aq-cover-copy{align-self:stretch;padding:3rem .2rem 2.5rem}.aq-cover-copy::before{margin-bottom:1.3rem}.aq-names{font-size:clamp(3.5rem,14vw,5rem)}.aq-cover-index{display:none}.aq-note-intro{display:block;min-height:auto}.aq-note-intro::before{display:block;font-size:5rem}.aq-note-intro h2{margin-top:-1.2rem}.aq-note-detail{display:flex;width:100%;min-height:auto;padding:4rem 1.4rem!important}.aq-venue{display:flex;flex-direction:column-reverse;gap:2.6rem}.aq-venue>.aq-arch{width:min(100%,460px)}.aq-venue-content{width:100%}.aq-dress{display:block}.aq-palette{justify-content:flex-start;margin:2rem 0 1rem}.aq-palette i{width:3.3rem;height:3.3rem}.aq-arches{grid-template-columns:1fr 1fr;gap:.7rem}.aq-arches .aq-arch:nth-child(2){margin-top:3rem}.aq-arches .aq-arch:nth-child(3){grid-column:1/3;width:62%;margin:-1.5rem auto 0}.aq-arch{padding:.35rem}.aq-arch figcaption{font-size:.5rem}.aq-slots{gap:.6rem}.aq-slots li{min-height:205px;padding:1.25rem .9rem}.aq-slots time{margin-bottom:1.3rem;font-size:1.7rem}.aq-slots strong{font-size:.59rem}.aq-slots small{font-size:.72rem}}
@media(max-width:390px){.aq-slots{grid-template-columns:1fr}.aq-slots li{min-height:auto}.aq-intro-copy{padding:1.4rem}.aq-intro-button{padding:.8rem 1rem}}
@media(prefers-reduced-motion:reduce){#aq-intro{transition:none}}
`.replace(/\n/g, "");

export const AQUARELLE_EDITOR_CSS = `
html.ie-editing .aquarelle [data-aq-block],html.ie-editing .aq-slots li,html.ie-editing .aq-arches .aq-arch{opacity:1;transform:none;transition:none}
`.replace(/\n/g, "");
