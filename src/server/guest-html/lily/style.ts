/**
 * Стили шаблона «Лилия».
 *
 * Сдержанная оливковая палитра, бумажная временная линия и карточки
 * пожеланий. Размеры и сетки подстраиваются под ширину приглашения.
 *
 * Размеры сняты с образца при ширине окна 1280: имена 77/125 px,
 * заголовки разделов 60 px, текст 17 px. Здесь они записаны через
 * clamp, чтобы на телефоне не пришлось листать одно слово.
 */
export const LILY_FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Open+Sans:wght@300;400;600&family=Marck+Script&display=swap&subset=cyrillic,latin">';

export const LILY_CSS = `
.sheet.lily{--lg:#4e5744;--lg-deep:#3f4738;--lw:#fffdfa;--lcream:#f5f3ed;--link:#354033;--lmuted:#7d8a72;
--lserif:"Playfair Display",Georgia,serif;--lscript:"Marck Script","Playfair Display",cursive;--lsans:"Open Sans",-apple-system,"Segoe UI",sans-serif;
position:relative;max-width:none;padding:0;background:var(--lw);color:var(--link);font-family:var(--lsans);overflow:hidden}
body:has(.sheet.lily){background:var(--lg,#4e5744)}
body:has(.sheet.lily) .bits-ambient,body:has(.sheet.lily) .bits-spotlight{display:none!important}

.lily-sec{position:relative;margin:0;padding:clamp(3.5rem,7vw,6rem) 1.5rem;text-align:center;overflow:hidden}
.lily-light{background:var(--lw);color:var(--link)}
.lily-green{background:var(--lg);color:#f4f2ea}
.lily-green .lily-script,.lily-green .lily-copy,.lily-green .lily-tag{color:#f4f2ea}
.lily-script{margin:0 0 1.4rem;font-family:var(--lscript);font-weight:400;font-size:clamp(2.4rem,5.2vw,3.75rem);
line-height:1.05;letter-spacing:0;text-transform:none;color:var(--lg)}
.lily-script::before,.lily-script::after{display:none}
.lily-tag{margin:0 0 .8rem;color:var(--lmuted);font:600 .78rem/1.6 var(--lsans);letter-spacing:.26em;text-transform:uppercase}
.lily-copy{max-width:40rem;margin:0 auto;color:inherit;font:300 clamp(1.02rem,1.2vw,1.12rem)/1.95 var(--lsans);white-space:pre-line}

/*
 * Волна между полосами: цвет — той полосы, что начинается ниже.
 *
 * Форма задана маской с полукругами, а не градиентами: из градиентов
 * выходит гребёнка с прямыми боками, а нужна именно синусоида. Маска
 * одна на оба цвета — цвет даёт фон под ней.
 *
 * Волна заезжает на низ верхней полосы: в вырезах маски должна быть
 * видна именно она, а не белый фон страницы — иначе переход с зелёного
 * на светлое выходил плоским, с полоской-швом.
 */
.lily-wave{display:block;position:relative;z-index:1;height:2.5rem;margin:-2.5rem 0 -1px;background:var(--band);
-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 40'%3E%3Cpath d='M0 20a20 20 0 0 1 40 0 20 20 0 0 0 40 0V40H0Z' fill='%23000'/%3E%3C/svg%3E") 0 0/5rem 2.5rem repeat-x;
mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 40'%3E%3Cpath d='M0 20a20 20 0 0 1 40 0 20 20 0 0 0 40 0V40H0Z' fill='%23000'/%3E%3C/svg%3E") 0 0/5rem 2.5rem repeat-x}
.lily-wave-green{--band:var(--lg)}
.lily-wave-light{--band:var(--lw)}

.lily-flower{position:absolute;width:clamp(9rem,16vw,15rem);height:auto;opacity:.5;pointer-events:none}
.lily-green .lily-flower{color:#cfd6c2;opacity:.35}
.lily-light .lily-flower{color:var(--lg);opacity:.32}
.lily-flower-cover{left:-3rem;bottom:-2rem;rotate:-8deg}
.lily-flower-side{right:-3.5rem;top:-2rem;rotate:14deg}

.lily-cover{padding-top:clamp(4rem,8vw,7rem)}
.lily-cover-grid{position:relative;z-index:2;display:grid;gap:2.5rem;align-items:center;max-width:70rem;margin:0 auto}
.lily-cover-copy{text-align:center}
.lily-names{margin:0;font-family:var(--lserif);font-weight:400;line-height:1;color:var(--lg)}
.lily-groom{display:block;font-size:clamp(2.2rem,5.2vw,4.8rem);letter-spacing:.04em;text-transform:uppercase}
.lily-amp{display:block;margin:.1em 0;font-family:var(--lsans);font-size:clamp(.8rem,1.2vw,1rem);font-weight:300;
letter-spacing:.3em;text-transform:uppercase;color:var(--lmuted)}
.lily-bride{display:block;font-family:var(--lscript);font-size:clamp(3rem,8.5vw,7.8rem);line-height:.95;text-transform:none}
.lily-kicker{margin:1.8rem 0 0;color:var(--link);font:300 clamp(.82rem,1.1vw,1.06rem)/1.7 var(--lsans);
letter-spacing:.24em;text-transform:uppercase}
.lily-cover-date{margin:1.2rem 0 0;color:var(--lg);font:400 clamp(1.3rem,2.4vw,1.9rem) var(--lscript)}
.lily-cover-photo{margin:0;border-radius:1.4rem;overflow:hidden;box-shadow:0 22px 50px #2d3a2426}
.lily-cover-photo img,.lily-cover-photo .ie-image-placeholder{display:block;width:100%;aspect-ratio:4/5;object-fit:cover}

.lily-venue-name{margin:.6rem 0 .4rem;color:inherit;font:400 clamp(1.7rem,3.4vw,2.6rem) var(--lscript)}
.lily-venue-address{margin:0 0 2rem;color:var(--lmuted);font:300 1rem/1.8 var(--lsans);white-space:pre-line}
.lily-photo{margin:0 auto;border-radius:1.4rem;overflow:hidden;background:var(--lcream);box-shadow:0 20px 44px #2d3a2420}
.lily-photo img,.lily-photo .ie-image-placeholder{display:block;width:100%;object-fit:cover}
.lily-venue .lily-photo{max-width:52rem;margin-bottom:2rem}
.lily-venue .lily-photo img{aspect-ratio:16/10}
.lily-venue .lily-copy{margin-top:1.4rem}

.lily-slots{position:relative;z-index:2;max-width:44rem;margin:2.5rem auto 0;padding:0;list-style:none;display:grid;gap:2.6rem}
.lily-slots li{position:relative;opacity:0;transform:translateY(16px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.8,.2,1)}
.lily-slots li.lily-rise{opacity:1;transform:none}
.lily-slots time{display:block;font:400 clamp(1.9rem,3.4vw,2.6rem) var(--lscript);color:inherit}
.lily-slots strong{display:block;margin:.4rem 0 .6rem;font:300 clamp(1rem,1.6vw,1.2rem) var(--lsans);
letter-spacing:.22em;text-transform:uppercase}
.lily-slots small{display:block;max-width:32rem;margin:0 auto;font:300 .98rem/1.8 var(--lsans);opacity:.85}
.lily-add{display:block;margin:2rem auto 0;padding:.7rem 1.3rem;border:1px solid currentColor;border-radius:999px;
background:transparent;color:inherit;cursor:pointer;font:600 .7rem var(--lsans);letter-spacing:.18em;text-transform:uppercase}

.lily-palette{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;margin-top:2.2rem}
.lily-palette i{display:block;width:3.4rem;height:3.4rem;border-radius:50%;background:var(--swatch);box-shadow:0 10px 22px #2d3a241f}

.lily-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:1.6rem;max-width:54rem;margin:0 auto}
.lily-grid .lily-photo{width:100%;opacity:0;transform:translateY(18px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.8,.2,1)}
.lily-grid .lily-photo.lily-rise{opacity:1;transform:none}
.lily-grid img,.lily-grid .ie-image-placeholder{aspect-ratio:3/4}
.lily-grid figcaption{padding:.8rem .4rem;font:300 .95rem var(--lsans);letter-spacing:.2em;text-transform:uppercase;color:var(--lmuted)}
.lily-gallery-bare{padding-top:0}

.lily-button{display:inline-block;margin-top:1.8rem;padding:1rem 2.8rem;border:1px solid var(--lg);border-radius:999px;
background:transparent;color:var(--lg);text-decoration:none;font:600 .8rem var(--lsans);letter-spacing:.2em;text-transform:uppercase;
transition:background .3s,color .3s}
.lily-button:hover{background:var(--lg);color:#fff}
.lily-button-light{border-color:#f4f2ea;color:#f4f2ea}
.lily-button-light:hover{background:#f4f2ea;color:var(--lg)}
.lily-answer{margin:1.8rem 0 0;font:400 1.4rem var(--lscript)}
.lily-closing .lily-script{font-size:clamp(3rem,7vw,6.25rem)}
.lily-closing{padding-bottom:clamp(5rem,9vw,8rem)}

.lily-plain{padding:clamp(3rem,6vw,5rem) 1.5rem}
.lily-green .countdown b{color:#f4f2ea}
.lily-green .countdown span{color:#cfd6c2}
.lily .countdown{gap:0;justify-content:center;margin-top:2rem}
.lily .countdown div{min-width:5.2rem;padding:0 1.3rem}
.lily .countdown div+div{border-left:1px solid #c8cfbe}
.lily .countdown b{font:400 clamp(2.2rem,4.2vw,3.2rem)/1 var(--lserif);color:var(--lg)}
.lily .countdown span{margin-top:.7rem;font:300 .95rem var(--lsans);letter-spacing:.04em;text-transform:none;color:var(--lmuted)}
.lily .foot{background:var(--lg);color:#c8cfbe;margin:0;padding:0 1.5rem 3rem;font-family:var(--lsans)}
.lily .links{background:var(--lg);padding-bottom:1.5rem}
.lily .links a{border-color:#c8cfbe;color:#f4f2ea;background:transparent}

.lily-music{position:fixed;right:1.1rem;top:1.1rem;z-index:60;display:grid;place-items:center;width:3rem;height:3rem;
border:none;border-radius:50%;background:var(--lg,#4e5744);color:#f4f2ea;cursor:pointer;box-shadow:0 10px 24px #2d3a2440}
.lily-music svg{width:1.2rem;height:1.2rem}
.lily-music[aria-pressed="false"]{opacity:.65}

.lily-motion .lily .lily-sec{opacity:0;transform:translateY(20px);transition:opacity .9s ease,transform .9s cubic-bezier(.2,.8,.2,1)}
.lily-motion .lily .lily-cover,.lily-motion .lily .lily-in{opacity:1;transform:none}

@media(min-width:900px){
.lily-cover-grid{grid-template-columns:1.15fr .85fr;gap:3.5rem;text-align:left}
.lily-cover-copy{text-align:left}
.lily-cover-photo img{aspect-ratio:3/4}
}

/* A continuous botanical paper layout instead of scalloped full-width bands. */
.lily .lily-timing{padding:clamp(3rem,6vw,5rem) 1.5rem 2.5rem;background:var(--lcream);color:var(--lg-deep)}
.lily-timing .lily-script{font-family:var(--lserif);font-size:clamp(2rem,4vw,3rem);line-height:1.2;margin-bottom:1rem;letter-spacing:-.035em}
.lily-timing .lily-flower{right:max(-1.5rem,calc((100% - 64rem)/2));top:1rem;width:14rem;opacity:.08}
.lily-timing .lily-tag{font-size:.7rem;letter-spacing:.22em;color:#8c927d}
.lily-slots{display:grid;grid-template-columns:minmax(0,1fr);gap:0;max-width:48rem;margin:2.5rem auto 0;padding:1rem clamp(1.25rem,4vw,3rem);border:1px solid #e5e6da;border-radius:1.5rem;background:#fffdfa;box-shadow:0 15px 40px #4e574408;text-align:left}
.lily-slots li{display:grid;grid-template-columns:5.5rem 1.75rem minmax(0,1fr);align-items:start;gap:1rem;padding:1.4rem 0;min-width:0}
.lily-slots li+li{border-top:1px solid #eeeee5}
.lily-slots time{padding-top:.12rem;font:400 1.6rem/1.4 var(--lserif);font-style:italic;color:#737e5f;letter-spacing:-.05em}
.lily-timeline-point{position:relative;align-self:stretch;display:block;min-height:2rem}
.lily-timeline-point::before{content:"";position:absolute;top:.85rem;left:50%;width:.5rem;height:.5rem;border:1px solid #929b7c;border-radius:50%;background:#f6f4ee;transform:translateX(-50%);box-shadow:0 0 0 5px #f4f3ed}
.lily-timeline-point::after{content:"";position:absolute;top:1.8rem;bottom:-2rem;left:50%;width:1px;background:linear-gradient(#d0d6c3,transparent)}
.lily-slots li:last-child .lily-timeline-point::after{display:none}
.lily-timeline-content{min-width:0}
.lily-slots strong{margin:0 0 .45rem;font:400 1.25rem/1.5 var(--lserif);letter-spacing:0;text-transform:none;color:var(--lg-deep)}
.lily-slots small{margin:0;max-width:32rem;font:400 .88rem/1.85 var(--lsans);color:#7a8071;opacity:1;overflow-wrap:anywhere}
.lily-details{padding:1.5rem 1.5rem clamp(3rem,6vw,5rem);background:var(--lcream);color:var(--lg-deep)}
.lily-details-intro{text-align:center;max-width:48rem;margin:0 auto 2rem}
.lily-details-intro h2{margin:0;font:400 clamp(1.8rem,3.6vw,2.5rem)/1.25 var(--lserif);letter-spacing:-.035em;color:var(--lg)}
.lily-details-intro .lily-tag{font-size:.7rem}
.lily-details-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;max-width:64rem;margin:0 auto}
.lily .lily-detail-card{position:relative;min-width:0;padding:2rem 1.5rem;text-align:left;border:1px solid #e5e6da;border-radius:1.25rem;background:#fffdfa}
.lily-detail-icon{width:2rem;height:2rem;margin-bottom:1.75rem;color:#929b7c}
.lily-detail-card .lily-tag{font-size:.65rem;letter-spacing:.22em;margin:0 0 .6rem;color:#8d9581}
.lily-detail-title{margin:0 0 1rem;font:400 clamp(1.35rem,2.2vw,1.7rem)/1.3 var(--lserif);color:var(--lg-deep);letter-spacing:-.02em}
.lily-detail-card .lily-copy{margin:0;font:400 .88rem/1.9 var(--lsans);color:#7a8071;overflow-wrap:anywhere}
@media(max-width:700px){
.lily-slots{padding:.5rem 1.15rem;border-radius:1.2rem;margin-top:1.8rem}
.lily-slots li{grid-template-columns:3.5rem 1rem minmax(0,1fr);gap:.65rem;padding:1.3rem 0}
.lily-slots time{font-size:1.25rem}
.lily-slots strong{font-size:1.1rem}
.lily-slots small{font-size:.82rem;line-height:1.8}
.lily-details-grid{grid-template-columns:minmax(0,1fr);gap:.75rem;max-width:32rem}
.lily .lily-detail-card{padding:1.35rem 1.4rem}
.lily-detail-icon{float:right;width:1.7rem;height:1.7rem;margin:0 0 .5rem 1rem}
.lily-detail-title{font-size:1.45rem;margin-bottom:.7rem}
.lily-detail-card .lily-copy{font-size:.85rem}
.lily-details-intro{margin-bottom:1.5rem}
}
@media(max-width:430px){
.lily-slots li{grid-template-columns:3.1rem minmax(0,1fr);column-gap:.75rem;row-gap:.3rem;padding:1rem 0}
.lily-slots time{grid-column:1;grid-row:1;padding:0;font-size:1.1rem}
.lily-timeline-point{display:none}
.lily-timeline-content{display:contents}
.lily-slots strong{grid-column:2;grid-row:1;margin:0}
.lily-slots small{grid-column:1 / -1;grid-row:2}
}
@media(prefers-reduced-motion:reduce){
.lily-motion .lily .lily-sec,.lily-slots li,.lily-grid .lily-photo{opacity:1;transform:none;transition:none}
}
`.replace(/\n/g, "");

export const LILY_EDITOR_CSS = `
html.ie-editing .lily .lily-sec,html.ie-editing .lily-slots li,html.ie-editing .lily-grid .lily-photo{opacity:1;transform:none;transition:none}
html.ie-editing .lily-music{display:none}
`.replace(/\n/g, "");
