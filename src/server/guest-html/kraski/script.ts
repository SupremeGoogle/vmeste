export const KRASKI_SCRIPT = `(function(){
var counter=document.querySelector('.kl-countdown');
if(counter){var tick=function(){var ms=Math.max(0,Number(counter.dataset.until)-Date.now());
 if(!ms){counter.textContent=counter.dataset.done||(document.documentElement.lang==='en'?'Today is our wedding day!':'Сегодня наша свадьба!');return}
 var s=Math.floor(ms/1000),values={days:Math.floor(s/86400),hours:Math.floor(s/3600)%24,minutes:Math.floor(s/60)%60,seconds:s%60};
 Object.keys(values).forEach(function(k){var el=counter.querySelector('[data-unit='+k+']');if(el)el.textContent=String(values[k]).padStart(2,'0')})};tick();setInterval(tick,1000)}
var demo=document.querySelector('.kl-form[data-demo]');
if(demo)demo.addEventListener('submit',function(e){e.preventDefault();var message=demo.querySelector('.kl-demo-note');if(message)message.hidden=false});
})()`;
