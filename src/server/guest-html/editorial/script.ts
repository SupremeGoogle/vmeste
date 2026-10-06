/** Without JavaScript the intro stays hidden and the invitation remains readable. */
export const EDITORIAL_SCRIPT = `(function(){
var d=document,intro=d.querySelector('.ed-intro'),button=d.querySelector('.ed-open');
if(intro&&button){intro.hidden=false;if(getComputedStyle(intro).display!=='none')d.body.style.overflow='hidden';button.addEventListener('click',function(){intro.hidden=true;d.body.style.overflow='';d.dispatchEvent(new CustomEvent('invite-open'));var audio=d.querySelector('.ed-music');if(audio)audio.play().catch(function(){});},{once:true});}
var music=d.querySelector('.ed-music'),toggle=d.querySelector('.ed-music-toggle');if(music&&toggle){var sync=function(){toggle.setAttribute('aria-pressed',String(!music.paused));};toggle.addEventListener('click',function(){if(music.paused)music.play().catch(function(){});else music.pause();});music.addEventListener('play',sync);music.addEventListener('pause',sync);}
})()`;
