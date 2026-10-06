export const KRASKI_FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Marck+Script&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">';

export const KRASKI_CSS = `
.sheet.kraski{--kl-ink:#161616;--kl-soft:#545454;--kl-serif:"Cormorant Garamond",Georgia,serif;--kl-sans:"Montserrat","Segoe UI",sans-serif;--kl-script:"Marck Script",cursive;max-width:none;min-height:100vh;margin:0;padding:0;overflow:hidden;background:#fff;color:var(--kl-ink);box-shadow:none;font:300 16px/1.65 var(--kl-sans)}
body:has(.sheet.kraski){margin:0;background:#fff}
body:has(.sheet.kraski) .bits-ambient,body:has(.sheet.kraski) .bits-spotlight{display:none!important}
.kl-section{position:relative;box-sizing:border-box;margin:0;padding:100px 24px;text-align:center;background:#fff;overflow:hidden}
.kl-section *{box-sizing:border-box}
.kl-section h2{margin:0 0 45px;font:500 clamp(38px,4.6vw,57px)/1.1 var(--kl-serif);letter-spacing:0!important;text-transform:none!important;color:var(--kl-ink)}
.kl-section h2::before,.kl-section h2::after{display:none!important}
.kl-section p{margin:0;font:300 16px/1.7 var(--kl-sans);color:#424242}
.kl-cover{display:grid;grid-template-columns:57% 43%;min-height:720px;height:min(850px,100vh);padding:0}
.kl-cover-photo{position:relative;overflow:hidden;clip-path:polygon(0 0,100% 0,100% 90%,96% 93%,91% 91%,85% 95%,79% 94%,73% 96%,67% 93%,59% 95%,52% 94%,47% 97%,39% 96%,32% 98%,29% 92%,23% 91%,17% 89%,12% 88%,5% 90%,0 88%)}
.kl-cover-photo img,.kl-cover-photo .ie-image-placeholder{display:block;width:100%;height:100%;object-fit:cover;object-position:center 56%}
.kl-cover-copy{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:38px 32px 70px}
.kl-names{position:relative;margin:0 0 32px;font:400 clamp(60px,6vw,94px)/.84 var(--kl-serif);letter-spacing:.045em;text-transform:uppercase}
.kl-names>span{display:block}.kl-names i{position:relative;z-index:0;display:block;height:.24em;margin:-.02em 0 .05em;color:#d6d6d6;font:400 clamp(64px,7vw,112px)/.55 var(--kl-script);text-transform:none;letter-spacing:0}
.kl-cover h1{margin:0 0 23px;font:500 clamp(28px,2.8vw,39px)/1.1 var(--kl-serif);text-transform:none}
.kl-rule{display:block;width:74px;height:1px;margin:0 auto 25px;background:#111}
.kl-intro{max-width:440px;margin:0 auto!important}
.kl-date{margin:22px auto 20px!important;font:500 22px var(--kl-sans)!important;letter-spacing:.12em}
.kl-after{max-width:410px;margin-top:0!important}
.kl-scroll{margin-top:25px;color:#111;text-decoration:none;font:300 34px/1 var(--kl-serif)}
.kl-program{padding:95px 24px 85px}
.kl-program h2{margin-bottom:55px}
.kl-program ol{max-width:615px;margin:0 auto;padding:0;list-style:none;text-align:left}
.kl-program li{position:relative;display:grid;grid-template-columns:100px 80px 1fr;align-items:center;gap:18px;min-height:165px}
.kl-program time{align-self:start;padding-top:34px;font:600 29px/1 var(--kl-serif)}
.kl-icon{width:54px;height:54px;color:#141414;justify-self:center}
.kl-program h3{margin:0 0 17px;font:500 23px/1.2 var(--kl-serif)}
.kl-program li p{line-height:1.65}
.kl-add{margin:30px auto 0;padding:9px 16px;border:1px solid #aaa;background:#fff;font:400 13px var(--kl-sans)}
.kl-countdown-section,.kl-closing{height:690px;padding:0;background:#4e4e4e;color:#fff;clip-path:polygon(0 3%,5% 2%,10% 1%,15% 2%,20% 1%,28% 1%,35% 2%,42% 1%,49% 2%,56% 1%,63% 2%,70% 1%,77% 2%,84% 1%,92% 2%,100% 3%,100% 97%,94% 99%,87% 98%,79% 99%,70% 98%,61% 99%,53% 98%,43% 99%,34% 98%,24% 99%,16% 98%,8% 99%,0 97%)}
.kl-photo-wide,.kl-photo-shade{position:absolute;inset:0}
.kl-photo-wide img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 42%}
.kl-photo-shade{background:linear-gradient(180deg,#1112,#1115 70%,#1117)}
.kl-countdown-copy{position:absolute;inset:auto 20px 78px;z-index:1;text-align:center}
.kl-countdown-copy h2{margin:0 0 25px;color:#fff;font-size:42px}
.kl-countdown{display:flex;justify-content:center;gap:0}
.kl-countdown>div{min-width:120px;padding:0 24px;border-right:1px solid #fff8}
.kl-countdown>div:last-child{border:0}
.kl-countdown strong{display:block;font:400 63px/1 var(--kl-serif);font-variant-numeric:tabular-nums}
.kl-countdown span{display:block;font:300 14px var(--kl-sans)}
.kl-stem{display:block;width:1px;height:72px;margin:0 auto 55px;background:#aaa}
.kl-venue{padding-top:75px;padding-bottom:35px}
.kl-venue h2{margin-bottom:36px}
.kl-venue-note,.kl-venue-name,.kl-venue-address{max-width:500px;margin:0 auto!important}
.kl-venue-name{margin-top:14px!important;font-weight:400!important}
.kl-venue-address{margin-top:18px!important}
.kl-venue-photo{width:min(600px,100%);margin:45px auto 0}
.kl-venue-photo img,.kl-venue-photo .ie-image-placeholder{display:block;width:100%;aspect-ratio:1.58;object-fit:cover}
.kl-map-section{display:grid;grid-template-columns:minmax(240px,370px) minmax(450px,650px);align-items:center;justify-content:center;gap:55px;padding:55px 28px 85px}
.kl-map-copy{text-align:left}.kl-map-copy h2{margin:0 0 16px;font-size:43px}.kl-map-copy p{max-width:330px}
.kl-map{display:block;position:relative;overflow:hidden;color:#333;text-decoration:none;background:#c9e7f4}
.kl-map-art{display:block;width:100%;aspect-ratio:16/9}
.kl-map>span{position:absolute;right:12px;bottom:12px;padding:7px 10px;background:#fff;border:1px solid #ddd;font:500 12px var(--kl-sans)}
.kl-detail{padding:10px 24px 40px}
.kl-detail:first-of-type{padding-top:90px}
.kl-detail h2{margin:0 0 28px}
.kl-detail>p{max-width:570px;margin:0 auto}
.kl-tilde{display:block;margin:35px auto 0;font:500 37px/.7 var(--kl-serif)}
.kl-dress{padding:70px 24px 120px}
.kl-dress .kl-stem{margin-bottom:50px}
.kl-dress h2{margin-bottom:38px}
.kl-dress>p{max-width:530px;margin:0 auto}
.kl-swatches{display:flex;justify-content:center;gap:15px;margin:50px auto 0}
.kl-swatches span{display:block;width:82px;height:78px;background:var(--paint);clip-path:polygon(5% 21%,20% 18%,28% 7%,69% 6%,74% 14%,97% 11%,83% 19%,92% 28%,87% 39%,99% 42%,85% 50%,95% 59%,81% 64%,93% 74%,70% 81%,84% 91%,26% 94%,12% 86%,18% 77%,4% 70%,14% 57%,1% 47%,10% 36%)}
.kl-rsvp{padding:75px 24px 100px}
.kl-rsvp .kl-stem{margin-bottom:50px}
.kl-rsvp h2{margin-bottom:22px}
.kl-rsvp-intro{max-width:540px;margin:0 auto 45px!important}
.kl-form{max-width:550px;margin:0 auto;padding:0;text-align:left;font-family:var(--kl-sans)}
.kl-form fieldset{margin:0 0 42px;padding:0;border:0}
.kl-form legend,.kl-field>span{display:block;margin-bottom:6px;padding:0;color:#292929;font:500 20px var(--kl-sans)}
.kl-form small{display:block;margin:0 0 13px;color:#777;font:400 16px var(--kl-serif)}
.kl-form fieldset>label{display:block;margin:4px 0;color:#6a6a6a;font:300 16px/1.5 var(--kl-sans);cursor:pointer}
.kl-form input[type=radio],.kl-form input[type=checkbox]{width:19px;height:19px;margin:0 6px 0 0;vertical-align:-4px;accent-color:#111}
.kl-field{display:block;margin-bottom:42px}
.kl-field input{width:100%;padding:8px 0 12px;border:0;border-bottom:1px solid #a0a0a0;border-radius:0;outline:0;background:transparent;color:#222;font:300 16px var(--kl-sans)}
.kl-form button{display:block;min-width:220px;margin:43px auto 0;padding:18px 40px;border:0;border-radius:0;background:#000;color:#fff;cursor:pointer;font:500 14px var(--kl-sans);letter-spacing:.02em;text-transform:uppercase}
.kl-form button:hover{background:#333}
.kl-result,.kl-error{max-width:550px;margin:0 auto 24px!important;text-align:center}.kl-error{color:#9e453d!important}
.kl-closing{height:660px;clip-path:polygon(0 18%,6% 14%,11% 6%,17% 8%,22% 3%,30% 8%,38% 7%,46% 10%,54% 7%,62% 11%,72% 12%,80% 18%,87% 15%,95% 23%,100% 28%,100% 100%,0 100%)}
.kl-closing .kl-photo-wide img{object-position:center 44%}
.kl-closing-copy{position:absolute;inset:auto 20px 90px;z-index:1}
.kl-closing-date{color:#fff!important;font:500 clamp(65px,9vw,120px)/.95 var(--kl-serif)!important;letter-spacing:.03em}
.kl-closing-copy h2{margin:24px auto 0;color:#fff;font:500 22px var(--kl-sans);letter-spacing:.15em;text-transform:uppercase!important}
.kraski .foot{margin:0;padding:25px 24px 40px;background:#fff;color:#666;font:300 13px var(--kl-sans)}
.kraski .links{background:#fff;padding:18px 24px}
.kraski .links a{background:#fff;border-color:#ccc;color:#111}
.kraski .who{position:absolute;top:12px;right:12px;z-index:5;margin:0;padding:5px 10px;background:#fffe;color:#777;font:300 12px var(--kl-sans)}
@media(max-width:800px){
.kl-cover{display:block;height:auto;min-height:0}.kl-cover-photo{height:560px;clip-path:polygon(0 0,100% 0,100% 94%,91% 96%,84% 94%,76% 98%,68% 95%,58% 98%,48% 95%,39% 99%,29% 95%,19% 98%,9% 94%,0 96%)}.kl-cover-copy{min-height:580px;padding:35px 25px 60px}.kl-map-section{grid-template-columns:1fr;gap:25px}.kl-map-copy{text-align:center}.kl-map-copy p{margin:auto}.kl-program li{grid-template-columns:85px 60px 1fr;gap:10px}.kl-program ol{max-width:600px}.kl-program time{font-size:25px}.kl-icon{width:45px;height:45px}}
@media(max-width:550px){
.kl-section{padding-left:20px;padding-right:20px}.kl-section h2{font-size:40px}.kl-section p{font-size:14px}.kl-cover-photo{height:470px}.kl-cover-copy{min-height:535px}.kl-names{font-size:67px}.kl-cover h1{font-size:31px}.kl-date{font-size:19px!important}.kl-program{padding:75px 20px}.kl-program h2{margin-bottom:30px}.kl-program li{grid-template-columns:66px 42px 1fr;gap:8px;min-height:135px}.kl-program time{font-size:21px;padding-top:27px}.kl-icon{width:38px;height:38px}.kl-program h3{font-size:20px;margin-bottom:9px}.kl-program li p{font-size:13px}.kl-countdown-section{height:560px}.kl-countdown-copy{bottom:68px}.kl-countdown-copy h2{font-size:35px}.kl-countdown>div{min-width:0;width:25%;padding:0 4px}.kl-countdown strong{font-size:42px}.kl-countdown span{font-size:10px}.kl-venue{padding-top:45px}.kl-stem{height:45px;margin-bottom:30px}.kl-map-section{padding-top:40px}.kl-map-copy h2{font-size:36px}.kl-detail{padding-bottom:20px}.kl-swatches{gap:4px;margin-top:30px}.kl-swatches span{width:60px;height:60px}.kl-rsvp{padding-top:45px}.kl-form legend,.kl-field>span{font-size:18px}.kl-closing{height:490px}.kl-closing-date{font-size:50px!important}.kl-closing-copy h2{font-size:14px}}
@media(prefers-reduced-motion:reduce){.kl-section{scroll-behavior:auto}}
`.replace(/\n/g, "");
