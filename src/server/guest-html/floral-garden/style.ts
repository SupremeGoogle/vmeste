export const FLORAL_GARDEN_FONTS_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">';

export const FLORAL_GARDEN_CSS = `
body:has(.sheet.floral-garden){margin:0;background:#657265 url('/media/invite-floral-garden/garden.webp') center center/cover fixed no-repeat;color:#641b2c}
body:has(.sheet.floral-garden) .bits-ambient,body:has(.sheet.floral-garden) .bits-spotlight{display:none!important}
.sheet.floral-garden{max-width:none;min-height:100vh;margin:0;padding:0;overflow:visible;background:transparent;box-shadow:none;color:#641b2c;font:400 21px/1.46 "Cormorant Garamond",Georgia,serif}
.floral-garden *{box-sizing:border-box}
.floral-garden .fg-section{position:relative;width:min(650px,calc(100% - 32px));margin:0 auto;padding:48px 52px;background:#fcf9f5;text-align:center;overflow:hidden}
.floral-garden .fg-section h1,.floral-garden .fg-section h2,.floral-garden .fg-section h3,.floral-garden .fg-section h4{color:#641b2c;font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;text-transform:none;letter-spacing:-.035em}
.floral-garden .fg-section h2{margin:0 0 18px;font-size:clamp(46px,6vw,69px);line-height:.98}
.floral-garden .fg-section h2::after,.floral-garden .fg-section h3::after{display:none}
.floral-garden .fg-section p{margin:0 auto;max-width:540px;line-height:1.4;white-space:pre-line}
.floral-garden .fg-section:not(.fg-cover):not(.fg-greeting):not(.fg-calendar-section):not(.fg-countdown):not(.fg-rsvp)::before{content:"♡";display:block;width:100%;margin:-8px auto 33px;border-top:1px solid #d8c6c2;padding-top:4px;color:#641b2c;font:italic 20px "Cormorant Garamond",serif;letter-spacing:.06em}
.floral-garden .fg-cover{width:100%;min-height:100svh;margin:0;padding:0;background:#485447;color:#fff;text-align:left;overflow:hidden}
.floral-garden .fg-cover-picture{position:absolute;inset:0;display:block}
.floral-garden .fg-cover-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
.floral-garden .fg-cover-shade{position:absolute;inset:0;background:linear-gradient(90deg,#1c2820a3,#1e2b2360 55%,#1e2b2350),linear-gradient(0deg,#18231daa,transparent 50%)}
.floral-garden .fg-cover-content{position:relative;z-index:1;width:min(690px,calc(100% - 52px));margin:0 auto;padding-top:9vh;color:#fff}
.floral-garden .fg-cover-kicker{max-width:230px!important;margin:0 0 25px!important;color:#fff;text-transform:uppercase;letter-spacing:.3em;font:500 11px/1.8 "Manrope",Arial,sans-serif!important}
.floral-garden .fg-cover h1{margin:0;color:#fff;font-size:clamp(68px,9vw,124px);line-height:.75;text-transform:uppercase;letter-spacing:-.055em;text-shadow:0 2px 14px #1a211a54}
.floral-garden .fg-cover h1 em{display:block;margin:13px 0 8px 3px;color:#fff;font-size:.52em;font-weight:400;text-transform:none}
.floral-garden .fg-cover-date{display:flex;flex-direction:column;gap:54px;max-width:360px;margin:40px 0 0 72px;padding-left:16px;border-left:1px solid #fff}
.floral-garden .fg-cover-date strong{font:500 23px/1.15 "Cormorant Garamond",serif;text-transform:uppercase;letter-spacing:.08em}
.floral-garden .fg-cover-date small{display:block;margin-top:7px;font:500 18px/1 "Cormorant Garamond",serif;text-transform:uppercase;letter-spacing:.08em}
.floral-garden .fg-cover-date span{font:500 11px/1.7 "Manrope",Arial,sans-serif;text-transform:uppercase;letter-spacing:.24em}
.floral-garden .fg-unlock{position:absolute;z-index:2;bottom:7vh;left:50%;display:flex;flex-direction:column;align-items:center;gap:8px;transform:translateX(-50%);color:#fff;text-decoration:none;width:max-content;max-width:calc(100% - 40px);text-align:center;white-space:normal;font:500 12px "Manrope",Arial,sans-serif}
.floral-garden .fg-unlock>span[aria-hidden]{display:grid;place-items:center;width:48px;height:48px;border:1px solid #fff;border-radius:50%;font-size:27px;line-height:1}
.floral-garden #fg-music-toggle{position:fixed;z-index:30;top:18px;right:18px;display:grid;place-items:center;width:42px;height:42px;border:1px solid #ffffffaa;border-radius:50%;background:#4a393bb3;color:#fff;font-size:21px;cursor:pointer}
.floral-garden .fg-greeting{margin-top:0;padding-top:62px;padding-bottom:6px;border-radius:28px 28px 0 0}
.floral-garden .fg-greeting .fg-copy{max-width:560px;margin:auto}
.floral-garden .fg-signature{margin:18px auto 0!important;font-size:38px;line-height:1.05!important}
.floral-garden .fg-calendar-section{padding-top:19px;padding-bottom:45px}
.floral-garden .fg-calendar{width:280px;max-width:100%;margin:0 auto;padding:24px 21px 23px;border:1px solid #e8ded8;border-radius:24px;background:#fffdf9;box-shadow:0 10px 24px #673b3b1a,inset 0 0 0 5px #fcf7f1}
.floral-garden .fg-calendar h3{margin:0 0 17px;font:italic 27px/1 "Cormorant Garamond",serif}
.floral-garden .fg-calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:7px 0;align-items:center;font:400 12px "Cormorant Garamond",serif}
.floral-garden .fg-calendar-grid small{font:500 7px "Manrope",Arial,sans-serif;letter-spacing:.04em}
.floral-garden .fg-calendar-day{position:relative;display:grid;place-items:center;height:24px;color:#4d3032}
.floral-garden .fg-muted-day{color:#c9c0bc}
.floral-garden .fg-day-heart{color:#fff}
.floral-garden .fg-day-heart span{position:absolute;inset:-6px;font-size:37px;line-height:1;color:#741c32;filter:drop-shadow(0 2px 2px #49202a55)}
.floral-garden .fg-day-heart b{position:relative;font:500 11px "Cormorant Garamond",serif}
.floral-garden .fg-calendar-message{display:none}
.floral-garden .fg-timeline{padding-top:8px;padding-bottom:48px}
.floral-garden .fg-timeline h2{margin-bottom:28px}
.floral-garden .fg-timeline-items{position:relative;max-width:430px;margin:0 auto}
.floral-garden .fg-timeline-items::before{content:"";position:absolute;top:22px;bottom:20px;left:50%;width:1px;background:#741c32;transform:translateX(-50%) rotate(4deg)}
.floral-garden .fg-event{position:relative;width:50%;min-height:165px;padding:2px 25px 15px 0;text-align:right}
.floral-garden .fg-event:nth-child(even){margin-left:50%;padding:2px 0 15px 25px;text-align:left}
.floral-garden .fg-event time{display:block;color:#741c32;font-size:46px;line-height:1}
.floral-garden .fg-event h3{margin:8px 0 7px;font:600 14px "Manrope",Arial,sans-serif!important;letter-spacing:.18em;text-transform:uppercase!important}
.floral-garden .fg-event p{font-size:18px;line-height:1.25}
.floral-garden .fg-event-heart{position:absolute;z-index:1;top:0;right:-11px;color:#741c32;font-size:27px;line-height:1}
.floral-garden .fg-event:nth-child(even) .fg-event-heart{right:auto;left:-11px}
.floral-garden .fg-venue-image{display:block;width:275px;height:275px;max-width:90%;margin:26px auto 23px;border-radius:50%;border:1px solid #b89da0;object-fit:cover;box-shadow:0 9px 24px #4d2c341a}
.floral-garden .fg-venue h3{margin:0 0 7px;font:600 17px "Manrope",Arial,sans-serif!important;letter-spacing:.15em;text-transform:uppercase!important}
.floral-garden .fg-address{max-width:350px!important;margin-bottom:18px!important}
.floral-garden .fg-button{display:inline-block;min-width:215px;margin:12px auto 0;padding:13px 22px;border:1px solid #9d6e77;border-radius:16px;background:#741c32;color:#fff;text-decoration:none;text-transform:uppercase;font:600 11px "Manrope",Arial,sans-serif;letter-spacing:.12em;box-shadow:0 5px 12px #60222b22;cursor:pointer}
.floral-garden .fg-button:hover{background:#5b1728}
.floral-garden .fg-venue h4{margin:45px 0 5px;font-size:33px}
.floral-garden .fg-venue-note{max-width:440px!important}
.floral-garden .fg-text{padding-top:34px;padding-bottom:34px}
.floral-garden .fg-dress{padding-top:30px;padding-bottom:47px}
.floral-garden .fg-palette{display:flex;justify-content:center;gap:10px;margin-top:25px}
.floral-garden .fg-palette span{width:39px;height:39px;border:1px solid #d6c9c1;border-radius:50%;box-shadow:0 4px 10px #44272b16}
.floral-garden .fg-wishes .fg-copy p{margin-bottom:22px}
.floral-garden .fg-wishes .fg-copy p:last-child{margin-bottom:0}
.floral-garden .fg-contact-links{display:flex;justify-content:center;gap:15px;flex-wrap:wrap;margin-top:25px}
.floral-garden .fg-contact-links a,.floral-garden .fg-contact-links span{min-width:155px;padding:12px 15px;border-top:1px solid #d8c6c2;color:#641b2c;text-decoration:none;text-transform:uppercase;font:600 10px/1.8 "Manrope",Arial,sans-serif;letter-spacing:.1em}
.floral-garden .fg-contact-links strong{font:400 20px "Cormorant Garamond",Georgia,serif;letter-spacing:0;text-transform:none}
.floral-garden .fg-photos .fg-lead{margin-bottom:22px}
.floral-garden .fg-gallery{display:flex;gap:14px;width:min(400px,100%);margin:auto;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.floral-garden .fg-gallery::-webkit-scrollbar{display:none}
.floral-garden .fg-gallery figure{flex:0 0 100%;margin:0;scroll-snap-align:center}
.floral-garden .fg-gallery img{display:block;width:100%;height:365px;object-fit:cover;border-radius:190px 190px 8px 8px}
.floral-garden .fg-gallery figcaption{margin-top:9px;font:italic 21px "Cormorant Garamond",serif}
.floral-garden .fg-gallery-controls{display:flex;justify-content:center;gap:12px;margin-top:12px}
.floral-garden .fg-gallery-controls button{width:37px;height:37px;border:1px solid #bea7a6;border-radius:50%;background:transparent;color:#641b2c;cursor:pointer}
.floral-garden .fg-rsvp{width:min(650px,calc(100% - 32px));margin:32px auto 0;padding:47px 38px;border-radius:24px;background:#f8f1eb}
.floral-garden .fg-rsvp .fg-lead{margin-bottom:20px}
.floral-garden .fg-form{max-width:500px;margin:0 auto;text-align:left;font:500 13px "Manrope",Arial,sans-serif}
.floral-garden .fg-form fieldset{margin:0 0 19px;padding:0;border:0}
.floral-garden .fg-form legend,.floral-garden .fg-field>span{display:block;margin:0 0 8px;color:#641b2c;font-weight:600}
.floral-garden .fg-field{display:block;margin:0 0 20px}
.floral-garden .fg-field input{width:100%;height:48px;padding:0 16px;border:1px solid #e3d4d0;border-radius:13px;background:#fff;color:#4d2731;font:400 14px "Manrope",Arial,sans-serif}
.floral-garden .fg-choices,.floral-garden .fg-drinks{display:flex;flex-wrap:wrap;gap:8px}
.floral-garden .fg-choices label,.floral-garden .fg-drinks label{cursor:pointer}
.floral-garden .fg-choices input,.floral-garden .fg-drinks input{position:absolute;opacity:0}
.floral-garden .fg-choices span,.floral-garden .fg-drinks span{display:block;padding:9px 15px;border:1px solid #d8c3c3;border-radius:999px;background:#fff;color:#641b2c}
.floral-garden .fg-choices input:checked+span,.floral-garden .fg-drinks input:checked+span{background:#741c32;color:#fff}
.floral-garden .fg-choices input:focus-visible+span,.floral-garden .fg-drinks input:focus-visible+span{outline:2px solid #741c32;outline-offset:2px}
.floral-garden .fg-form .fg-button{display:block;width:100%;margin-top:22px}
.floral-garden .fg-form-ok,.floral-garden .fg-form-error{margin-bottom:17px!important;padding:12px;border-radius:8px;background:#fff}
.floral-garden .fg-countdown{width:100%;margin:0;padding:65px 20px 80px;background:transparent;color:#fff;text-shadow:0 2px 10px #1d291d99}
.floral-garden .fg-countdown h2{color:#fff}
.floral-garden .fg-clock{display:flex;justify-content:center;gap:20px;margin-top:20px}
.floral-garden .fg-clock strong{display:block;color:#fff;font-size:50px;line-height:1}
.floral-garden .fg-clock span{font-size:16px}
.floral-garden .fg-finale{display:block;margin-top:45px;font-size:28px}
body:has(.sheet.floral-garden) .foot{margin:0;padding:20px;text-align:center;background:#302d29;color:#ddd;font-size:12px}
@media(max-width:700px){body:has(.sheet.floral-garden){background-image:url('/media/invite-floral-garden/garden-mobile.webp');background-position:center;background-attachment:scroll}.floral-garden .fg-cover{min-height:100svh}.floral-garden .fg-cover-content{padding-top:12vh}.floral-garden .fg-cover h1{font-size:clamp(51px,13vw,84px)}.floral-garden .fg-cover-date{margin-left:15px;gap:34px}.floral-garden .fg-section:not(.fg-cover):not(.fg-countdown){width:calc(100% - 24px);padding-left:25px;padding-right:25px}.floral-garden .fg-section h2{font-size:clamp(42px,11vw,59px)}.floral-garden .fg-signature{font-size:30px}.floral-garden .fg-event{min-height:155px;padding-right:17px}.floral-garden .fg-event:nth-child(even){padding-left:17px}.floral-garden .fg-event time{font-size:36px}.floral-garden .fg-event h3{font-size:11px!important;letter-spacing:.1em}.floral-garden .fg-clock{gap:10px}.floral-garden .fg-clock strong{font-size:34px}}
@media(prefers-reduced-motion:reduce){.floral-garden *{scroll-behavior:auto!important}}
`;
