export const ISKRA_SCRIPT = `(function(){
var d=document,intro=d.querySelector('.ik-intro'),open=d.querySelector('.ik-open'),editing=d.documentElement.classList.contains('ie-editing');
var music=d.querySelector('.ik-music'),toggle=d.querySelector('.ik-music-toggle');
function play(){if(music){music.play().then(function(){if(toggle)toggle.setAttribute('aria-pressed','true')}).catch(function(){})}}
function reveal(){if(!intro||intro.hidden)return;intro.classList.add('ik-opening');intro.inert=true;d.body.style.overflow='';var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;setTimeout(function(){intro.hidden=true;var title=d.querySelector('.ik-cover h1');if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true})}},reduce?0:650);play()}
if(intro&&open&&!editing){intro.hidden=false;d.body.style.overflow='hidden';open.addEventListener('click',reveal);open.focus({preventScroll:true});intro.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();open.focus()}if(e.key==='Escape')reveal()});addEventListener('pageshow',function(e){if(e.persisted&&intro.hidden)d.body.style.overflow=''})}
if(toggle&&music)toggle.addEventListener('click',function(){if(music.paused)play();else{music.pause();toggle.setAttribute('aria-pressed','false')}});
})()`;
