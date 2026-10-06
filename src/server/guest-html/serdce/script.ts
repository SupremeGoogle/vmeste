export const SERDCE_SCRIPT = `(function(){
var clock=document.querySelector('.sc-clock');
if(clock){var tick=function(){var ms=Math.max(0,Number(clock.dataset.until)-Date.now());if(!ms){clock.textContent=clock.dataset.done||'Сегодня наша свадьба!';return}var s=Math.floor(ms/1000),v={days:Math.floor(s/86400),hours:Math.floor(s/3600)%24,minutes:Math.floor(s/60)%60,seconds:s%60};Object.keys(v).forEach(function(k){var el=clock.querySelector('[data-unit='+k+']');if(el)el.textContent=String(v[k]).padStart(2,'0')})};tick();setInterval(tick,1000)}
var demo=document.querySelector('.sc-form[data-demo]');if(demo)demo.addEventListener('submit',function(e){e.preventDefault();var note=demo.querySelector('.sc-demo-note');if(note)note.hidden=false});
var music=document.querySelector('.sc-music-toggle'),audio=null,timer=null;
if(music)music.addEventListener('click',function(){
 if(timer){clearInterval(timer);timer=null;music.setAttribute('aria-pressed','false');music.setAttribute('aria-label','Включить музыку');music.textContent='♪';if(audio)audio.close();audio=null;return}
 var C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio=new C();
 var phrase=function(){if(!audio)return;var now=audio.currentTime;[392,493.88,587.33,493.88,440].forEach(function(freq,i){var o=audio.createOscillator(),g=audio.createGain(),start=now+i*.31;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.045,start+.04);g.gain.exponentialRampToValueAtTime(.0001,start+.65);o.connect(g);g.connect(audio.destination);o.start(start);o.stop(start+.7)})};
 phrase();timer=setInterval(phrase,3000);music.setAttribute('aria-pressed','true');music.setAttribute('aria-label','Выключить музыку');music.textContent='♫';
});
})()`;
