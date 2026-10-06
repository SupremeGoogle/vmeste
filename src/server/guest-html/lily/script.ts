/**
 * Скрипт шаблона «Лилия»: появление полос и кнопка музыки.
 *
 * Заставки здесь нет намеренно — в образце её тоже нет: приглашение
 * открывается сразу, а музыку включает кнопка в углу. Звук стартует
 * только по нажатию: браузер иначе его и не разрешит, да и включать
 * музыку человеку, который открыл ссылку в автобусе, невежливо.
 */
export const LILY_SCRIPT = `(function(){
var d=document,root=d.querySelector('.lily');if(!root)return;
d.documentElement.classList.add('lily-motion');
var secs=[].slice.call(root.querySelectorAll('.lily-sec')),
    items=[].slice.call(d.querySelectorAll('[data-lily-rise]'));
if('IntersectionObserver'in window){
 var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('lily-in');io.unobserve(en.target)}})},{threshold:.1});
 secs.forEach(function(s){io.observe(s)});
 var io2=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('lily-rise');io2.unobserve(en.target)}})},{threshold:.2});
 items.forEach(function(i){io2.observe(i)});
}else{secs.forEach(function(s){s.classList.add('lily-in')});items.forEach(function(i){i.classList.add('lily-rise')})}

var audio=d.getElementById('lily-audio'),toggle=d.querySelector('.lily-music');
if(audio&&toggle)toggle.addEventListener('click',function(){
 if(audio.paused){var p=audio.play();if(p&&p.catch)p.catch(function(){});toggle.setAttribute('aria-pressed','true')}
 else{audio.pause();toggle.setAttribute('aria-pressed','false')}
});
})()`.replace(/\n/g, "");
