/**
 * Стили шаблона «Винил».
 *
 * Всё нарисовано разметкой и градиентами: пластинка на заставке, лучи
 * за ней, искорки, фестончатый край светлой карточки. Ни одного файла
 * с картинкой — приглашение открывают с телефона в дороге, и каждый
 * лишний запрос там стоит секунду.
 */
export const VINYL_FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Open+Sans:wght@300;400;600;700&display=swap&subset=cyrillic,latin">';

export const VINYL_CSS = `
.sheet.vinyl{--vp:#f7dbe8;--vp-deep:#f0c0d9;--vp-soft:#fbeaf1;--vcream:#f4f1ec;--vorange:#e8794a;--vink:#3a2630;--vmuted:#9a7f8c;
--vserif:"Playfair Display",Georgia,serif;--vsans:"Open Sans",-apple-system,"Segoe UI",sans-serif;
position:relative;max-width:none;padding:0;background:var(--vp);color:var(--vink);font-family:var(--vsans);overflow:hidden}
body:has(.sheet.vinyl){background:var(--vp,#f7dbe8)}
/* Общая подсветка за курсором на плоском розовом читается как пятно на бумаге. */
body:has(.sheet.vinyl) .bits-ambient,body:has(.sheet.vinyl) .bits-spotlight{display:none!important}
.vinyl [data-vinyl-block]{position:relative;margin:0;padding:5.5rem 1.6rem;text-align:center;overflow:hidden}
.vinyl h1,.vinyl h2{font-family:var(--vserif);font-weight:400;color:var(--vorange);text-transform:uppercase;letter-spacing:.07em}
.vinyl h2{margin:0 0 1.6rem;font-size:clamp(1.9rem,4.4vw,3.2rem);line-height:1.15}
.vinyl h2::before,.vinyl h2::after{display:none}
.vinyl-tag{margin:0 0 1rem;color:var(--vmuted);font:600 clamp(.7rem,1vw,.85rem)/1.5 var(--vsans);letter-spacing:.28em;text-transform:uppercase}
.vinyl-copy{max-width:36rem;margin:0 auto;color:var(--vink);font:400 clamp(1rem,1.25vw,1.15rem)/1.9 var(--vsans);white-space:pre-line}
.vinyl-mark{display:block;width:1.6rem;height:1.6rem;margin:0 auto 2.2rem;background:var(--vorange);
-webkit-mask:radial-gradient(circle at 50% 22%,#000 22%,transparent 23%),radial-gradient(circle at 22% 68%,#000 22%,transparent 23%),radial-gradient(circle at 78% 68%,#000 22%,transparent 23%);
mask:radial-gradient(circle at 50% 22%,#000 22%,transparent 23%),radial-gradient(circle at 22% 68%,#000 22%,transparent 23%),radial-gradient(circle at 78% 68%,#000 22%,transparent 23%)}
.vinyl-spark{position:absolute;width:1.5rem;height:1.5rem;background:#fff;opacity:.85;pointer-events:none;
-webkit-mask:radial-gradient(ellipse 50% 14% at 50% 50%,#000 60%,transparent 61%),radial-gradient(ellipse 14% 50% at 50% 50%,#000 60%,transparent 61%);
mask:radial-gradient(ellipse 50% 14% at 50% 50%,#000 60%,transparent 61%),radial-gradient(ellipse 14% 50% at 50% 50%,#000 60%,transparent 61%);
animation:vinyl-twinkle 3.4s ease-in-out infinite}
.vinyl-spark-a{left:8%;top:22%}.vinyl-spark-b{right:11%;top:38%;width:1rem;height:1rem;animation-delay:-1.2s}
.vinyl-spark-c{left:22%;bottom:16%;width:2rem;height:2rem;animation-delay:-2.3s}

.vinyl-cover{display:flex;align-items:center;justify-content:center;min-height:100svh;padding:6rem 1.6rem!important}
.vinyl-cover-copy{position:relative;z-index:3;max-width:40rem;margin:0 auto}
.vinyl-kicker{margin:0 0 1.6rem;color:var(--vink);font:600 clamp(.72rem,1.1vw,.92rem)/1.7 var(--vsans);letter-spacing:.28em;text-transform:uppercase}
.vinyl-names{margin:0;color:var(--vorange);font:400 clamp(2.8rem,9vw,7rem)/.95 var(--vserif);letter-spacing:.02em;text-transform:uppercase}
.vinyl-lead{margin:1.6rem 0 0;color:var(--vink);font:600 clamp(.72rem,1.05vw,.9rem)/1.8 var(--vsans);letter-spacing:.24em;text-transform:uppercase}
.vinyl-cover-date{display:inline-block;margin:1.8rem 0 0;padding:.6rem 1.5rem;border:1px solid var(--vorange);border-radius:999px;
color:var(--vorange);font:600 clamp(.72rem,1vw,.88rem) var(--vsans);letter-spacing:.2em;text-transform:uppercase}
/* Снимки живут в колонке вокруг текста, а не по краям экрана: на широком
   мониторе плитки, приклеенные к окну, читаются как случайный мусор по
   углам, а не как разложенные рядом с именами фотографии. */
.vinyl-tiles{position:absolute;inset:0;left:50%;z-index:1;width:min(100%,64rem);translate:-50%;pointer-events:none}
.vinyl-tile{position:absolute;margin:0;padding:0;border-radius:.6rem;background:transparent;box-shadow:0 18px 40px #b4718e33;overflow:hidden}
.vinyl-tile img,.vinyl-tile .ie-image-placeholder{display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit;
transform:translate3d(0,var(--vinyl-parallax,0px),0) scale(1.02)}
.vinyl-tile-1{left:0;top:9%;width:min(30%,16rem);aspect-ratio:3/4;rotate:-7deg}
.vinyl-tile-2{right:0;top:12%;width:min(32%,17rem);aspect-ratio:4/3;rotate:6deg}
.vinyl-tile-3{left:4%;bottom:8%;width:min(28%,15rem);aspect-ratio:4/5;rotate:4deg}
.vinyl-tile-4{right:5%;bottom:6%;width:min(30%,16rem);aspect-ratio:4/3;rotate:-5deg}
.vinyl-tile-5{left:50%;top:2%;width:min(24%,13rem);aspect-ratio:4/3;rotate:3deg;translate:-50%}
.vinyl-scroll{position:absolute;left:50%;bottom:2rem;z-index:3;width:1px;height:3.2rem;background:linear-gradient(var(--vorange),transparent);
transform:translateX(-50%);animation:vinyl-scroll 2.4s ease-in-out infinite}
.vinyl-ball{position:absolute;right:1rem;top:5rem;z-index:2;width:4.4rem;height:4.4rem;border-radius:50%;transform-origin:50% -120%;
background:repeating-conic-gradient(from 0deg,#d7dbe3 0 9deg,#aab2c0 9deg 18deg),radial-gradient(circle at 32% 26%,#fff,transparent 46%);
box-shadow:inset -9px -11px 20px #5f6675a8,inset 6px 6px 14px #ffffff80,0 14px 28px #b4718e33;
animation:vinyl-swing 6s ease-in-out infinite}
.vinyl-ball::before{content:'';position:absolute;left:50%;bottom:100%;width:1px;height:6.5rem;background:linear-gradient(#f7dbe800,#b78ca6)}
.vinyl-ball::after{content:'';position:absolute;inset:0;border-radius:50%;
background:repeating-linear-gradient(115deg,#ffffff00 0 8%,#ffffff70 9%,#ffffff00 11% 20%);mix-blend-mode:screen;
animation:vinyl-spin 9s linear infinite}

/*
 * Светлая карточка с фестончатым краем — «облако» на розовом.
 *
 * Край рисуется фоном, а не рамкой: четыре ряда полукругов по сторонам
 * плюс сплошная заливка внутри. Приветствие даёт верхнюю половину
 * карточки, отсчёт сразу под ним — нижнюю; стыка не видно, потому что
 * у них общий цвет и нулевой зазор, а гребёнка идёт только по внешним
 * сторонам. Если организатор унесёт отсчёт в другое место, обе половины
 * остаются самостоятельными карточками с ровным краем.
 */
.vinyl-hello{--s:3.2rem;--half:1.6rem;background:
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 0/var(--s) var(--s) round no-repeat,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 0/var(--s) var(--s) no-repeat round,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 100% 0/var(--s) var(--s) no-repeat round,
linear-gradient(var(--vcream),var(--vcream)) var(--half) var(--half)/calc(100% - var(--s)) calc(100% - var(--half)) no-repeat;margin:3.5rem 1.2rem 0!important;padding:6rem 2rem 3rem!important}
.vinyl-hello h2{color:var(--vorange)}
.vinyl-hello .vinyl-mark{width:7.2rem;height:1.5rem;margin-top:2.2rem;background:var(--vp-deep);
-webkit-mask:radial-gradient(circle at 50% 22%,#000 22%,transparent 23%) 0 0/2.4rem 100% repeat-x,radial-gradient(circle at 22% 68%,#000 22%,transparent 23%) 0 0/2.4rem 100% repeat-x,radial-gradient(circle at 78% 68%,#000 22%,transparent 23%) 0 0/2.4rem 100% repeat-x;
mask:radial-gradient(circle at 50% 22%,#000 22%,transparent 23%) 0 0/2.4rem 100% repeat-x,radial-gradient(circle at 22% 68%,#000 22%,transparent 23%) 0 0/2.4rem 100% repeat-x,radial-gradient(circle at 78% 68%,#000 22%,transparent 23%) 0 0/2.4rem 100% repeat-x}
/* Отсчёт сразу под приветствием — нижняя половина той же карточки. */
.vinyl-hello + section:not([data-vinyl-block]){margin:0 1.2rem 3.5rem;padding:1rem 2rem 4.5rem;
--s:3.2rem;--half:1.6rem;background:
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 100%/var(--s) var(--s) round no-repeat,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 0/var(--s) var(--s) no-repeat round,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 100% 0/var(--s) var(--s) no-repeat round,
linear-gradient(var(--vcream),var(--vcream)) var(--half) 0/calc(100% - var(--s)) calc(100% - var(--half)) no-repeat}

.vinyl-timing .vinyl-slots{max-width:62rem;margin:0 auto;padding:0;list-style:none;display:grid;gap:1.6rem}
/* Карточка тайминга — облачко: те же полукруги, что у «Дорогих гостей»,
   только по всем четырём сторонам. round подгоняет их число под ширину,
   чтобы у правого края не оставалось обрубка. */
.vinyl-slot{--s:2.6rem;--half:1.3rem;position:relative;padding:3.4rem 2.6rem;background:
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 0/var(--s) var(--s) round no-repeat,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 100%/var(--s) var(--s) round no-repeat,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 0 0/var(--s) var(--s) no-repeat round,
radial-gradient(circle at 50% 50%,var(--vcream) calc(var(--half) - 1px),transparent var(--half)) 100% 0/var(--s) var(--s) no-repeat round,
linear-gradient(var(--vcream),var(--vcream)) var(--half) var(--half)/calc(100% - var(--s)) calc(100% - var(--s)) no-repeat;
filter:drop-shadow(0 12px 22px #b4718e1f)}
.vinyl-slot time{display:block;color:var(--vorange);font:400 clamp(1.8rem,5vw,2.3rem) var(--vserif);letter-spacing:.04em}
.vinyl-slot strong{display:block;margin:1.4rem 0 .9rem;color:var(--vorange);font:400 clamp(1.15rem,3.6vw,1.6rem) var(--vserif);letter-spacing:.06em;text-transform:uppercase}
.vinyl-slot small{display:block;max-width:28rem;margin:0 auto;color:#6d5a63;font:400 1rem/1.65 var(--vsans)}
.vinyl-add{display:block;margin:1.4rem auto 0;padding:.7rem 1.2rem;border:1px dashed var(--vorange);border-radius:999px;background:transparent;color:var(--vorange);cursor:pointer;font:600 .65rem var(--vsans);letter-spacing:.14em;text-transform:uppercase}

.vinyl-palette{display:flex;flex-wrap:wrap;justify-content:center;gap:.7rem;margin-top:2.2rem}
.vinyl-palette i{display:block;width:4.6rem;height:5.6rem;border-radius:.9rem;background:var(--swatch);box-shadow:inset 0 2px 6px #ffffff40,0 10px 22px #a96a8829;
transform:translateY(14px);opacity:0;transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s}
.vinyl-in .vinyl-palette i{transform:none;opacity:1}
.vinyl-in .vinyl-palette i:nth-child(2){transition-delay:.08s}.vinyl-in .vinyl-palette i:nth-child(3){transition-delay:.16s}
.vinyl-in .vinyl-palette i:nth-child(4){transition-delay:.24s}.vinyl-in .vinyl-palette i:nth-child(5){transition-delay:.32s}

/* Снимки всегда одной строкой: сколько их, столько и колонок. Два
   портрета — два крупных кадра, четыре образа — ряд из четырёх, а не
   столбик, который на телефоне тянется на три экрана. */
.vinyl-mosaic{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:1.2rem;max-width:58rem;margin:0 auto}
.vinyl-mosaic figure{width:100%;max-width:18rem;justify-self:center}
/* Полоса снимков без заголовка примыкает к разделу над ней. */
.vinyl-gallery-bare{padding-top:0!important;margin-top:-2.5rem}
.vinyl-mosaic figure{margin:0;padding:0;border-radius:1rem;overflow:hidden;background:transparent;box-shadow:0 14px 32px #b4718e24;
transform:translateY(22px) rotate(var(--tilt,0deg));opacity:0;transition:transform .8s cubic-bezier(.2,.8,.2,1),opacity .8s}
.vinyl-mosaic figure:nth-child(odd){--tilt:-2.5deg}.vinyl-mosaic figure:nth-child(even){--tilt:2.5deg}
.vinyl-mosaic figure.vinyl-rise{transform:rotate(var(--tilt,0deg));opacity:1}
.vinyl-mosaic img,.vinyl-mosaic .ie-image-placeholder{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:1rem}
.vinyl-mosaic figcaption{padding:.8rem .2rem 0;color:var(--vmuted);font:600 .72rem var(--vsans);letter-spacing:.16em;text-transform:uppercase}

.vinyl-venue-photo{max-width:34rem;margin:0 auto 1.8rem;border-radius:1.4rem;overflow:hidden;box-shadow:0 20px 45px #ad6a8a33}
.vinyl-venue-photo img,.vinyl-venue-photo .ie-image-placeholder{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;
transform:translate3d(0,var(--vinyl-parallax,0px),0) scale(1.16)}
.vinyl-venue-name{margin:0;color:var(--vorange);font:400 clamp(1.7rem,2.6vw,2.2rem) var(--vserif);letter-spacing:.06em;text-transform:uppercase}
.vinyl-venue-address{margin:.6rem 0 1.4rem;color:var(--vmuted);font:600 .8rem/1.8 var(--vsans);letter-spacing:.16em;text-transform:uppercase;white-space:pre-line}
.vinyl-button{display:inline-block;margin-top:1.6rem;padding:.95rem 2.2rem;border:none;border-radius:999px;background:var(--vorange);
color:#fff;text-decoration:none;font:600 .8rem var(--vsans);letter-spacing:.18em;text-transform:uppercase;
box-shadow:0 14px 30px #e8794a45;transition:transform .25s,box-shadow .25s}
.vinyl-button:hover{transform:translateY(-2px);box-shadow:0 18px 38px #e8794a55}
.vinyl-button-big{padding:1.2rem 3.2rem;font-size:.88rem}
.vinyl-answer{margin:1.8rem 0 0;color:var(--vorange);font:400 1.2rem var(--vserif)}

.vinyl-closing{padding-bottom:7rem!important}
.vinyl-closing h2{font-size:clamp(1.9rem,7.5vw,3rem)}
.vinyl-disc-small{display:block;width:4.5rem;height:4.5rem;margin:2.4rem auto 0;border-radius:50%;
background:repeating-radial-gradient(circle at 50% 50%,#241d22 0 2px,#3a3036 2px 4px);
box-shadow:0 10px 24px #00000026;animation:vinyl-spin 6s linear infinite}
.vinyl-disc-small::after{content:'';position:absolute;left:50%;top:50%;width:1.6rem;height:1.6rem;margin:-.8rem 0 0 -.8rem;
border-radius:50%;background:var(--vorange);box-shadow:inset 0 0 0 .3rem #fff3}

.vinyl>section:not([data-vinyl-block]){padding:4.5rem 1.6rem;text-align:center}
.vinyl .countdown{gap:.6rem;justify-content:center}
.vinyl .countdown{gap:0;align-items:flex-start}
.vinyl .countdown div{min-width:5.4rem;padding:0 1.4rem}
.vinyl .countdown div+div{border-left:1px solid var(--vp-deep)}
.vinyl .countdown b{display:block;color:var(--vorange);font:400 clamp(2.4rem,7vw,3.6rem)/1 var(--vserif)}
.vinyl .countdown span{margin-top:.6rem;color:var(--vorange);font:400 .8rem var(--vsans);letter-spacing:.04em;text-transform:none}
.vinyl .foot,.vinyl .who{color:var(--vmuted);font-family:var(--vsans)}
.vinyl .links a{border-color:var(--vorange);color:var(--vorange)}

#vinyl-intro{position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;
background:var(--vp,#f7dbe8);cursor:pointer;transition:opacity .9s ease}
#vinyl-intro::before{content:'';position:absolute;inset:-30%;
background:repeating-conic-gradient(from 0deg at 50% 50%,var(--vp-deep,#f0c0d9) 0deg 11deg,var(--vp,#f7dbe8) 11deg 22deg);
opacity:.85;animation:vinyl-spin 90s linear infinite}
#vinyl-intro.vinyl-gone{opacity:0;pointer-events:none}
.vinyl-disc{position:relative;z-index:2;width:min(62vw,19rem);aspect-ratio:1;border-radius:50%;
background:repeating-radial-gradient(circle at 50% 50%,#1d181c 0 2px,#332b31 2px 4px);
box-shadow:0 30px 60px #0000003d,inset 0 0 0 1px #0006;transition:transform 1.1s cubic-bezier(.4,0,.2,1)}
.vinyl-disc::after{content:'';position:absolute;inset:34%;border-radius:50%;background:var(--vorange,#e8794a)}
.vinyl-disc svg{position:absolute;inset:38%;z-index:2;width:24%;height:24%}
.vinyl-disc-hole{position:absolute;left:50%;top:50%;z-index:3;width:.6rem;height:.6rem;margin:-.3rem 0 0 -.3rem;border-radius:50%;background:var(--vp,#f7dbe8)}
#vinyl-intro.vinyl-playing .vinyl-disc{animation:vinyl-spin 2.4s linear infinite}
#vinyl-intro.vinyl-gone .vinyl-disc{transform:scale(1.35)}
#vinyl-intro p{position:relative;z-index:2;max-width:18rem;margin:0;color:var(--vink,#3a2630);
font:600 .62rem/1.9 var(--vsans,sans-serif);letter-spacing:.24em;text-transform:uppercase;text-align:center;
animation:vinyl-hint 2.6s ease-in-out infinite}
.vinyl-music{position:fixed;right:1rem;top:1rem;z-index:60;display:grid;place-items:center;width:2.9rem;height:2.9rem;
border:none;border-radius:50%;background:#2a2228;color:#fff;cursor:pointer;box-shadow:0 10px 24px #00000030}
.vinyl-music i{display:block;width:1.1rem;height:1.1rem;background:#fff;
-webkit-mask:radial-gradient(circle at 30% 76%,#000 22%,transparent 23%),radial-gradient(circle at 78% 64%,#000 22%,transparent 23%),linear-gradient(#000,#000) 42% 8%/10% 70% no-repeat,linear-gradient(#000,#000) 70% 8%/10% 58% no-repeat,linear-gradient(#000,#000) 42% 8%/38% 14% no-repeat;
mask:radial-gradient(circle at 30% 76%,#000 22%,transparent 23%),radial-gradient(circle at 78% 64%,#000 22%,transparent 23%),linear-gradient(#000,#000) 42% 8%/10% 70% no-repeat,linear-gradient(#000,#000) 70% 8%/10% 58% no-repeat,linear-gradient(#000,#000) 42% 8%/38% 14% no-repeat}
.vinyl-music[aria-pressed="false"]{opacity:.55}

.vinyl-motion .vinyl [data-vinyl-block]{opacity:0;transform:translateY(26px);transition:opacity .9s ease,transform .9s cubic-bezier(.2,.8,.2,1)}
.vinyl-motion .vinyl .vinyl-cover,.vinyl-motion .vinyl .vinyl-in{opacity:1;transform:none}
.vinyl-slot{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.vinyl-slot.vinyl-rise{opacity:1;transform:none}

@keyframes vinyl-spin{to{transform:rotate(360deg)}}
@keyframes vinyl-twinkle{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:.95;transform:scale(1)}}
@keyframes vinyl-hint{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes vinyl-scroll{0%,100%{transform:translateX(-50%) scaleY(.4);transform-origin:top;opacity:.4}50%{transform:translateX(-50%) scaleY(1);opacity:1}}
@keyframes vinyl-swing{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}

@media(min-width:720px){.vinyl [data-vinyl-block]{padding:7rem 2.5rem}
.vinyl-timing .vinyl-slots{grid-template-columns:repeat(2,1fr)}}
/* Телефон: снимки расходятся к краям — вверх и вниз, — чтобы подписи
   обложки не ложились поверх фотографий. */
@media(max-width:480px){.vinyl-tile-1{left:-5%;top:4%;width:44%}.vinyl-tile-2{right:-5%;top:13%;width:42%}
.vinyl-tile-3{left:-4%;bottom:6%;width:44%}.vinyl-tile-4{right:-4%;bottom:15%;width:42%}.vinyl-tile-5{display:none}
.vinyl-cover{padding:7rem 1.3rem 9rem!important}
.vinyl-palette{flex-wrap:nowrap;gap:.45rem}.vinyl-palette i{flex:1 1 0;min-width:0;max-width:4.6rem;height:4.8rem;border-radius:.75rem}.vinyl-mosaic{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:.55rem}.vinyl-mosaic figure{max-width:none;border-radius:.7rem}.vinyl-mosaic figure:nth-child(odd){--tilt:-1.5deg}.vinyl-mosaic figure:nth-child(even){--tilt:1.5deg}.vinyl-mosaic img,.vinyl-mosaic .ie-image-placeholder{border-radius:.7rem}
.vinyl .countdown div{min-width:3.9rem;padding:.9rem .35rem}.vinyl .countdown b{font-size:1.6rem}}
@media(prefers-reduced-motion:reduce){.vinyl-spark,.vinyl-disc-small,.vinyl-scroll,.vinyl-ball,.vinyl-ball::after,#vinyl-intro::before,#vinyl-intro .vinyl-disc,#vinyl-intro p{animation:none}
.vinyl-motion .vinyl [data-vinyl-block],.vinyl-slot,.vinyl-mosaic figure,.vinyl-palette i{opacity:1;transform:none;transition:none}}
`.replace(/\n/g, "");

/**
 * В редакторе анимации появления выключены: раздел, который «ещё не
 * доехал», нельзя править — его просто не видно.
 */
export const VINYL_EDITOR_CSS = `
html.ie-editing .vinyl [data-vinyl-block],html.ie-editing .vinyl-slot,html.ie-editing .vinyl-mosaic figure,html.ie-editing .vinyl-palette i{opacity:1;transform:none;transition:none}
html.ie-editing .vinyl-scroll,html.ie-editing .vinyl-music{display:none}
.vinyl-intro-preview{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;min-height:30rem;padding:3rem 1.5rem;background:var(--vp,#f7dbe8);border-bottom:2px dashed #c79a55}
.vinyl-intro-preview .vinyl-disc{width:min(50vw,14rem)}
.vinyl-intro-preview p{max-width:18rem;margin:0;color:var(--vink,#3a2630);font:600 .62rem/1.9 var(--vsans,sans-serif);letter-spacing:.24em;text-transform:uppercase;text-align:center}
.vinyl-intro-preview small{position:absolute;top:.75rem;left:50%;translate:-50% 0;padding:.3rem .7rem;border-radius:.4rem;background:#fff8ee;color:#8b6914;font:500 12px/1.3 system-ui,sans-serif;white-space:nowrap}
`.replace(/\n/g, "");
