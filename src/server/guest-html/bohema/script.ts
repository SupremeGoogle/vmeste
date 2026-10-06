export const BOHEMA_SCRIPT = `(function(){
var d=document,cover=d.getElementById('bo-intro-cover'),open=d.querySelector('.bo-open');
if(cover&&open){
  var reveal=function(){cover.classList.add('is-open');setTimeout(function(){cover.remove()},800)};
  open.addEventListener('click',reveal);
  if(location.hash==='#rsvp')reveal();
}
var counter=d.querySelector('.bo-countdown');
if(counter){
  var tick=function(){var left=Math.max(0,Number(counter.dataset.until)-Date.now());
    if(!left){counter.textContent=counter.dataset.done||'Сегодня наш праздник!';return}
    var sec=Math.floor(left/1000),values={days:Math.floor(sec/86400),hours:Math.floor(sec/3600)%24,minutes:Math.floor(sec/60)%60,seconds:sec%60};
    Object.keys(values).forEach(function(k){var el=counter.querySelector('[data-unit='+k+']');if(el)el.textContent=String(values[k]).padStart(2,'0')})};
  tick();setInterval(tick,1000);
}
var form=d.querySelector('.bo-form[data-demo]');
if(form)form.addEventListener('submit',function(e){e.preventDefault();var note=form.querySelector('.bo-demo-note');if(note)note.hidden=false});
var music=d.querySelector('.bo-music'),audio=d.getElementById('bo-audio');
if(music&&audio)music.addEventListener('click',function(){if(audio.paused){audio.play().then(function(){music.setAttribute('aria-pressed','true');music.setAttribute('aria-label','Выключить музыку')}).catch(function(){})}else{audio.pause();music.setAttribute('aria-pressed','false');music.setAttribute('aria-label','Включить музыку')}});
})()`;
