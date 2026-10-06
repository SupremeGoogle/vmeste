export const BURGUNDY_SCRIPT = `(function(){
var d=document,env=d.querySelector('.bw-envelope');
if(env){env.addEventListener('click',function(){if(env.classList.contains('bw-opening'))return;env.classList.add('bw-opening');setTimeout(function(){env.classList.add('bw-opened');d.body.style.overflow=''},950)});if(!d.documentElement.classList.contains('ie-editing'))d.body.style.overflow='hidden'}
var clock=d.querySelector('.bw-clock');if(clock){var tick=function(){var ms=Math.max(0,Number(clock.dataset.until)-Date.now());if(!ms){clock.textContent=clock.dataset.done||'Сегодня наш день!';return}var s=Math.floor(ms/1000),v={days:Math.floor(s/86400),hours:Math.floor(s/3600)%24,minutes:Math.floor(s/60)%60,seconds:s%60};Object.keys(v).forEach(function(k){var el=clock.querySelector('[data-unit='+k+']');if(el)el.textContent=String(v[k]).padStart(2,'0')})};tick();setInterval(tick,1000)}
})()`;
