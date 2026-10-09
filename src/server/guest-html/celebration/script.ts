/** No external runtime. Content remains visible without JavaScript. */
export const CELEBRATION_SCRIPT = `(function(){
var d=document,root=d.documentElement,sheet=d.querySelector('.celebration');if(!sheet)return;
var reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches,editing=root.classList.contains('ie-editing');
var intro=sheet.querySelector('.cl-intro'),open=sheet.querySelector('.cl-open'),audio=sheet.querySelector('.cl-music'),toggle=sheet.querySelector('.cl-music-toggle');
function sound(){if(!audio||!toggle)return;var playing=!audio.paused;toggle.setAttribute('aria-pressed',String(playing));toggle.classList.toggle('is-playing',playing)}
function play(){if(audio)audio.play().then(sound).catch(function(){sound()})}
if(toggle&&audio){toggle.addEventListener('click',function(){if(audio.paused)play();else{audio.pause();sound()}})}
function begin(){root.classList.add('cl-started');if(!editing&&!reduced&&'IntersectionObserver'in window){root.classList.add('cl-motion');var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('cl-in');io.unobserve(x.target)}})},{threshold:.08});sheet.querySelectorAll('.cl-section').forEach(function(s){io.observe(s)})}}
function enter(){if(intro){intro.classList.add('cl-leaving');d.body.style.overflow='';setTimeout(function(){intro.hidden=true},reduced?0:850)}begin();play()}
if(open)open.addEventListener('click',enter);
if(intro&&!editing){intro.hidden=false;if(getComputedStyle(intro).display!=='none')d.body.style.overflow='hidden';else begin()}else begin();
// Keep the animated copies in sync with the one editable caption, including blank captions.
sheet.querySelectorAll('[data-cl-label-copy]').forEach(function(copy){var key=copy.dataset.clLabelCopy;var source=sheet.querySelector('[data-component-key="label:'+key+'"], [data-path="label:'+key+'"]');if(source){copy.textContent=source.textContent;if(!editing)new MutationObserver(function(){copy.textContent=source.textContent}).observe(source,{childList:true,characterData:true,subtree:true})}});
})()`;
