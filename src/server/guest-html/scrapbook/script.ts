/** Progressive enhancement: without JS the invitation stays readable. */
export const SCRAPBOOK_SCRIPT = `(function(){
var d=document,intro=d.querySelector('.sb-intro'),open=d.querySelector('.sb-open'),flip=d.querySelector('.sb-flip');
if(intro&&open){intro.hidden=false;if(getComputedStyle(intro).display!=='none')d.body.style.overflow='hidden';
function reveal(){intro.hidden=true;d.body.style.overflow='';open.removeEventListener('click',reveal);d.dispatchEvent(new CustomEvent('invite-open'));var a=d.querySelector('.sb-music');if(a)a.play().catch(function(){});}
open.addEventListener('click',reveal);if(flip)flip.addEventListener('click',function(){var on=flip.classList.toggle('sb-flipped');flip.setAttribute('aria-pressed',String(on));});}
var music=d.querySelector('.sb-music'),toggle=d.querySelector('.sb-music-toggle');if(music&&toggle){function sync(){toggle.setAttribute('aria-pressed',String(!music.paused));}toggle.addEventListener('click',function(){if(music.paused)music.play().catch(function(){});else music.pause();});music.addEventListener('play',sync);music.addEventListener('pause',sync);}
})()`;
