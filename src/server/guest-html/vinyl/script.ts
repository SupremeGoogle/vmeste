/**
 * Скрипт шаблона «Винил».
 *
 * Заставку с пластинкой ставит он, а не разметка: нет JavaScript — нет
 * и заставки, приглашение открывается сразу (то же решение, что у
 * конверта в `invite-intro.ts`). Открыть можно касанием в любом месте
 * и любой клавишей, а не только попаданием в пластинку.
 *
 * Музыка включается там же: браузер разрешает звук только в ответ на
 * действие человека, и нажатие на пластинку — ровно оно.
 */
export const VINYL_SCRIPT = `(function(){
var d=document,root=d.querySelector('.vinyl');if(!root)return;
d.documentElement.classList.add('vinyl-motion');
var reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
var audio=d.getElementById('vinyl-audio'),toggle=d.querySelector('.vinyl-music');

function reveal(){
 var blocks=[].slice.call(root.querySelectorAll('[data-vinyl-block]')),
     items=[].slice.call(d.querySelectorAll('[data-vinyl-rise]'));
 if(!('IntersectionObserver'in window)){blocks.forEach(function(b){b.classList.add('vinyl-in')});items.forEach(function(i){i.classList.add('vinyl-rise')});return}
 var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('vinyl-in');io.unobserve(en.target)}})},{threshold:.12});
 blocks.forEach(function(b){io.observe(b)});
 var io2=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('vinyl-rise');io2.unobserve(en.target)}})},{threshold:.2});
 items.forEach(function(i){io2.observe(i)});
}

var photos=[].slice.call(root.querySelectorAll('[data-vinyl-parallax]')),ticking=false;
function paint(){photos.forEach(function(p){var host=p.parentElement;if(!host)return;var b=host.getBoundingClientRect();
 var shift=Math.max(-16,Math.min(16,(innerHeight/2-(b.top+b.height/2))*.03));p.style.setProperty('--vinyl-parallax',shift+'px')});ticking=false}
function onScroll(){if(!ticking&&!reduced){requestAnimationFrame(paint);ticking=true}}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);

function music(on){if(!audio)return;
 if(on){var p=audio.play();if(p&&p.catch)p.catch(function(){})}else{audio.pause()}
 if(toggle)toggle.setAttribute('aria-pressed',on?'true':'false')}
if(toggle&&audio)toggle.addEventListener('click',function(){music(audio.paused)});

var intro=d.createElement('div');intro.id='vinyl-intro';
intro.setAttribute('role','button');intro.setAttribute('tabindex','0');
intro.setAttribute('aria-label',d.documentElement.lang==='en'?'Open the invitation':'Открыть приглашение');
intro.innerHTML='<i class="vinyl-spark vinyl-spark-a"></i><i class="vinyl-spark vinyl-spark-b"></i><i class="vinyl-spark vinyl-spark-c"></i>'+
'<span class="vinyl-disc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 14.2a2 2 0 1 0 1.4 1.9V8.4l6-1.3v5.1a2 2 0 1 0 1.4 1.9V4l-8.8 2z" fill="#fff"/></svg><i class="vinyl-disc-hole"></i></span>'+
'<p>'+(d.getElementById('vinyl-intro-copy')?d.getElementById('vinyl-intro-copy').innerHTML:'Нажмите на пластинку,<br>чтобы открыть приглашение')+'</p>';
d.body.appendChild(intro);d.body.style.overflow='hidden';
if(!reduced)intro.classList.add('vinyl-playing');

function open(){
 intro.classList.add('vinyl-gone');d.body.style.overflow='';
 music(true);
 setTimeout(function(){if(intro.parentNode)intro.remove()},1000);
 d.removeEventListener('keydown',onKey);
}
function onKey(e){if(e.key==='Tab')return;open()}
intro.addEventListener('click',open);
d.addEventListener('keydown',onKey);

reveal();paint();
})()`.replace(/\n/g, "");
