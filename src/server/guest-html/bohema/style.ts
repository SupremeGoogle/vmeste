export const BOHEMA_FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Marck+Script&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">';

export const BOHEMA_CSS = `
.sheet.bohema{--bo-paper:#fbf8ea;--bo-ink:#293222;--bo-gold:#a57a34;--bo-sans:"Montserrat","Segoe UI",sans-serif;--bo-serif:"Cormorant Garamond",Georgia,serif;--bo-script:"Marck Script",cursive;max-width:none;min-height:100vh;margin:0;padding:0;overflow:hidden;background:var(--bo-paper);color:var(--bo-ink);box-shadow:none;font-family:var(--bo-sans);font-size:16px;line-height:1.65}
body:has(.sheet.bohema){margin:0;background:var(--bo-paper)}
body:has(.sheet.bohema) .bits-ambient,body:has(.sheet.bohema) .bits-spotlight{display:none!important}
.bo-section{position:relative;box-sizing:border-box;margin:0;padding:90px 24px;text-align:center;background:var(--bo-paper);overflow:hidden}
.bo-section *{box-sizing:border-box}
.bo-garland{display:block;width:min(590px,92vw);height:auto;max-height:210px;object-fit:contain;margin:0 auto 20px;pointer-events:none}
.bo-heading{margin:0 auto 50px!important;text-align:center;color:var(--bo-ink);line-height:.92;font-weight:400;text-transform:none!important;letter-spacing:0!important}
.bo-heading::before,.bo-heading::after{display:none!important}
.bo-heading span{display:block;font-family:var(--bo-serif);font-size:clamp(43px,5.4vw,68px);text-transform:uppercase;letter-spacing:-.045em}
.bo-heading em{display:block;margin-top:-5px;padding-left:35px;color:var(--bo-gold);font:400 clamp(55px,7vw,92px)/.86 var(--bo-script);text-transform:none}
.bo-cover{min-height:880px;padding:42px 24px 125px;background:#eee8d9;isolation:isolate}
.bo-cover-picture{position:absolute;inset:0;z-index:-2;background:url('/media/invite-bohema/landscape.webp') center 48%/cover no-repeat}
.bo-cover-custom{display:block;width:100%;height:100%;object-fit:cover}
.bo-cover::after{content:"";position:absolute;inset:auto 0 0;height:35%;z-index:-1;background:linear-gradient(transparent,var(--bo-paper))}
.bo-arch{position:relative;width:min(620px,calc(100vw - 40px));min-height:705px;margin:25px auto 0;padding:220px 35px 80px;border:2px solid var(--bo-ink);border-radius:49% 49% 42% 42%/33% 33% 10% 10%;background:var(--bo-paper);box-shadow:0 0 0 7px #fbf8ea77}
.bo-arch .bo-garland{position:absolute;top:-53px;left:50%;width:min(610px,100vw);max-height:none;margin:0;transform:translateX(-50%)}
.bo-arch-copy{position:relative;z-index:1}
.bo-names{margin:0 auto 44px;color:var(--bo-ink);font-family:var(--bo-serif);font-weight:400;line-height:.87;text-transform:none;letter-spacing:0}
.bo-name-first{display:block;font-size:clamp(62px,9vw,83px);text-transform:uppercase;letter-spacing:-.05em}
.bo-name-and{display:block;margin:10px 0 0 -245px;font:400 61px/.8 var(--bo-serif)}
.bo-name-second{display:block;margin:-47px 0 0 80px;color:var(--bo-gold);font:400 clamp(70px,11vw,110px)/1 var(--bo-script)}
.bo-kicker,.bo-subtitle{max-width:440px;margin:0 auto;color:#505547;font:300 16px/1.65 var(--bo-sans);text-transform:uppercase}
.bo-date{margin:43px auto 36px;color:var(--bo-gold);font:500 clamp(29px,4vw,41px)/1.1 var(--bo-serif);text-transform:uppercase}
.bo-cover-image-edit{position:absolute;left:1rem;bottom:1rem;padding:.4rem .8rem;background:#fff;color:#333}
.bo-program{padding-top:50px}
.bo-program .bo-garland{margin-bottom:12px}
.bo-list{max-width:650px;margin:0 auto;padding:0;list-style:none;text-align:left}
.bo-list li{position:relative;margin:0 0 38px}
.bo-list h3,.bo-text h3{margin:0 0 6px;color:var(--bo-ink);font:500 clamp(25px,3vw,35px)/1.1 var(--bo-serif);text-transform:uppercase}
.bo-list p,.bo-text p{margin:0;color:#62675c;font:300 16px/1.7 var(--bo-sans)}
.bo-list time{font:inherit}
.bo-add{border:1px solid var(--bo-gold);background:transparent;padding:.65rem 1rem;color:var(--bo-ink)}
.bo-flourish{margin:75px auto 0;color:var(--bo-gold);font-size:34px}
.bo-countdown-section{padding-top:20px;padding-bottom:110px}
.bo-countdown-title{margin:0 0 30px;font:400 25px var(--bo-serif)}
.bo-countdown{display:flex;justify-content:center;gap:0}
.bo-countdown>div{min-width:110px;padding:0 16px;border-right:1px solid #cfc6ad}
.bo-countdown>div:last-child{border:0}
.bo-countdown b{display:block;color:var(--bo-gold);font:400 clamp(42px,6vw,70px)/1 var(--bo-serif);font-variant-numeric:tabular-nums}
.bo-countdown span{display:block;margin-top:8px;color:#65695d;font:300 14px var(--bo-sans)}
.bo-venue{padding-top:60px}
.bo-venue .bo-heading{margin-bottom:55px!important}
.bo-small,.bo-address,.bo-intro{max-width:580px;margin:0 auto;color:#6d7067;font:300 16px/1.75 var(--bo-sans)}
.bo-venue-name{margin:17px auto 8px;color:var(--bo-gold);font:400 clamp(43px,6vw,68px)/1.1 var(--bo-script)}
.bo-address{margin-bottom:45px}
.bo-venue-photo{width:min(500px,100%);margin:0 auto 40px;overflow:hidden;border-radius:48px}
.bo-venue-photo img,.bo-venue-photo .ie-image-placeholder{display:block;width:100%;aspect-ratio:1.53;object-fit:cover}
.bo-venue .bo-intro{margin-bottom:34px}
.bo-button{display:inline-block;min-width:230px;padding:13px 25px;border:1px solid #62675c;border-radius:18px;background:#fff;color:var(--bo-ink);font:400 14px var(--bo-sans);text-decoration:none;text-transform:uppercase;transition:background .2s,color .2s}
.bo-button:hover{background:var(--bo-ink);color:#fff}
.bo-text{max-width:none;padding-top:25px;padding-bottom:25px}
.bo-text>h3,.bo-text>p{max-width:650px;margin-left:auto;margin-right:auto;text-align:left}
.bo-text>p{white-space:pre-line}
.bo-detail:first-of-type{padding-top:90px}
.bo-detail .bo-heading{margin-bottom:42px!important}
.bo-detail+.bo-detail{padding-top:12px}
.bo-organizer{padding-top:110px;padding-bottom:100px}
.bo-organizer .bo-heading{margin-bottom:38px!important}
.bo-organizer h3{display:none}
.bo-organizer>p{max-width:560px;text-align:center}
.bo-closing{padding:70px 24px 150px}
.bo-closing>p{text-align:center}
.bo-goodbye{margin-top:35px!important;color:var(--bo-gold)!important;font:400 75px/1 var(--bo-script)!important}
.bo-dress{padding-top:145px;padding-bottom:45px}
.bo-overline{margin:0 0 6px;color:var(--bo-ink);font:400 25px var(--bo-serif);text-transform:uppercase;letter-spacing:.15em}
.bo-dress .bo-garland{margin-bottom:38px}
.bo-dress .bo-heading{margin-bottom:40px!important}
.bo-palette{display:flex;justify-content:center;gap:10px;margin:32px auto}
.bo-palette span{display:block;width:51px;height:51px;border-radius:50%;border:1px solid #a9a391}
.bo-looks{padding:15px 0 90px}
.bo-looks figure{margin:0 auto 65px}
.bo-looks figcaption{margin:0 0 24px;color:#77776f;font:400 53px/1 var(--bo-script)}
.bo-looks figure img,.bo-looks figure .ie-image-placeholder{display:block;width:min(1150px,100%);height:auto;max-height:400px;object-fit:cover;margin:0 auto}
.bo-looks .bo-garland{filter:grayscale(1) sepia(.4);opacity:.7}
.bo-rsvp{padding-top:50px;padding-bottom:100px}
.bo-rsvp .bo-heading{margin-bottom:35px!important}
.bo-rsvp .bo-intro{margin-bottom:35px}
.bo-form{max-width:570px;margin:0 auto;padding:0;text-align:left;font-family:var(--bo-sans)}
.bo-form fieldset{margin:0 0 32px;padding:0;border:0}
.bo-form legend,.bo-input-label>span{display:block;margin:0 0 12px;color:var(--bo-ink);font:400 17px/1.5 var(--bo-sans)}
.bo-form small{display:block;margin:-7px 0 12px;color:#8b8a7c;font:300 13px/1.5 var(--bo-sans)}
.bo-form fieldset>label,.bo-drinks label{display:block;margin:10px 0;color:#555b51;font:300 16px var(--bo-sans);cursor:pointer}
.bo-form input[type=radio],.bo-form input[type=checkbox]{accent-color:var(--bo-gold);width:17px;height:17px;margin-right:8px;vertical-align:-3px}
.bo-input-label{display:block;margin:0 0 32px}
.bo-input-label input{width:100%;padding:15px 16px;border:1px solid #c7bea8;border-radius:0;background:#fffdf7;color:var(--bo-ink);font:300 16px var(--bo-sans)}
.bo-drinks{display:grid;grid-template-columns:1fr 1fr;gap:2px 15px}
.bo-form button{display:block;width:100%;max-width:315px;margin:35px auto 0;padding:16px 25px;border:1px solid var(--bo-ink);border-radius:18px;background:var(--bo-gold);color:#fff;cursor:pointer;font:500 14px var(--bo-sans);letter-spacing:.09em;text-transform:uppercase}
.bo-form button:hover{background:#8f672a}
.bo-form-ok,.bo-form-error{text-align:center;margin:0 auto 30px;font:400 18px var(--bo-sans)}
.bo-form-error{color:#a34432}
.bo-music{position:fixed;top:22px;left:22px;z-index:100;width:62px;height:62px;border:0;border-radius:50%;background:var(--bo-gold);color:#fff;font-size:30px;cursor:pointer;box-shadow:0 4px 20px #2222}
.bo-music[aria-pressed=false]{opacity:.7}
.bo-intro-cover{position:fixed;inset:0;z-index:200;display:grid;place-items:center;overflow:hidden;background:#eee6d8}
.bo-intro-landscape{position:absolute;inset:0;background:url('/media/invite-bohema/landscape.webp') center/cover no-repeat}
.bo-intro-hill{position:absolute;left:-10%;bottom:-42vh;width:120%;height:74vh;border-radius:50% 50% 0 0;background:#a77b33}
.bo-open{position:relative;z-index:1;width:180px;height:245px;border:3px double #304027;border-radius:50%;background:#a77b33;color:#fff;cursor:pointer;box-shadow:0 0 0 8px #a77b33;font:400 120px/1 var(--bo-serif)}
.bo-open>span{display:flex;align-items:center;justify-content:center;height:100%}
.bo-monogram-script{margin-left:-28px;font:400 120px/1 var(--bo-script)}
.bo-intro-cover>p{position:absolute;bottom:25px;z-index:1;color:#fff;text-align:center;font:300 12px var(--bo-sans);letter-spacing:.07em}
.bo-intro-cover.is-open{animation:bo-cover-exit .75s ease forwards;pointer-events:none}
@keyframes bo-cover-exit{to{opacity:0;visibility:hidden}}
.bohema .foot{background:var(--bo-paper);color:#77776f;font:300 13px var(--bo-sans);padding-bottom:40px}
.bohema .links{background:var(--bo-paper)}
.bohema .links a{border-color:#bdb49e;background:transparent}
.bohema .who{position:absolute;z-index:4;top:10px;left:50%;transform:translateX(-50%);background:#fbf8eacc;padding:5px 14px}
html.ie-editing .bo-intro-cover{display:none}
@media(max-width:650px){
.bo-section{padding:65px 20px}.bo-cover{min-height:760px;padding:80px 12px 80px}.bo-arch{width:calc(100vw - 28px);min-height:610px;margin:20px auto 0;padding:175px 18px 45px;border-radius:49% 49% 35% 35%/26% 26% 7% 7%}.bo-arch .bo-garland{top:-20px;width:105%}.bo-names{margin-bottom:28px}.bo-name-first{font-size:clamp(45px,12vw,65px)}.bo-name-and{margin-left:-170px;font-size:44px}.bo-name-second{margin:-35px 0 0 60px;font-size:clamp(60px,16vw,82px)}.bo-kicker,.bo-subtitle{font-size:12px}.bo-date{margin:29px auto;font-size:30px}.bo-heading{margin-bottom:35px!important}.bo-heading span{font-size:46px}.bo-heading em{font-size:58px}.bo-list h3,.bo-text h3{font-size:26px}.bo-list p,.bo-text p,.bo-intro,.bo-small,.bo-address{font-size:14px}.bo-countdown>div{min-width:0;width:25%;padding:0 5px}.bo-countdown b{font-size:40px}.bo-venue-photo{border-radius:35px}.bo-drinks{grid-template-columns:1fr}.bo-looks figure img{max-height:260px}.bo-open{width:140px;height:190px;font-size:90px}.bo-monogram-script{font-size:90px}.bo-goodbye{font-size:60px!important}}
@media(prefers-reduced-motion:reduce){.bo-intro-cover.is-open{animation:none;display:none}}
.bo-wishlist,.bo-wishlist .bo-overline,.bo-wishlist .bo-intro{text-align:center}
`.replace(/\n/g, "");
