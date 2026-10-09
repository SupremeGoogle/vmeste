/**
 * Поведение шаблона «Тили-тесто» — перенесено из `script.js` образца.
 *
 * Сохранено: конверт по нажатию с белой вспышкой, музыка на 20% громкости
 * и кнопка в углу, появление разделов при прокрутке, обратный отсчёт с
 * «тиканьем» цифр, параллакс листьев, наклон полароидов за мышью и
 * растворение фотографий пары шейдером (three.js + GSAP ScrollTrigger,
 * те же версии с того же CDN).
 *
 * Убрано: видео-заставка, квест жениха, локальное хранилище ответов и
 * Google-таблица — ответ уходит обычной формой в наш сервер.
 *
 * Прогрессивное улучшение: класс `tili-js`, который прячет страницу под
 * конвертом, ставит скрипт в <head>. Нет скрипта — приглашение открыто
 * сразу, без конверта и анимаций.
 */
export const TILI_HEAD_SCRIPT = `document.documentElement.classList.add('tili-js')`;

/** Библиотеки для шейдера — грузятся только если на странице есть фото пары. */
export const TILI_SHADER_LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/ScrollTrigger.min.js",
];

export const TILI_SCRIPT = `(function(){'use strict';
var d=document,root=d.documentElement,editing=root.classList.contains('ie-editing');
var cover=d.getElementById('cover'),main=d.getElementById('mainContent');
var music=d.getElementById('weddingMusic'),toggle=d.getElementById('musicToggle');
var opened=false;

function heroIn(){setTimeout(function(){d.querySelectorAll('.fade-in-hero').forEach(function(el){el.classList.add('show')})},200)}

function reveal(){
 if(opened)return;opened=true;
 if(cover){cover.classList.add('flash-end');setTimeout(function(){cover.classList.add('is-open')},450)}
 d.body.style.overflow='';
 if(main)main.classList.add('visible');
 if(music){music.volume=.2;music.play().catch(function(){})}
 if(toggle){toggle.classList.add('visible','playing')}
 heroIn();
}

function openEnvelope(){if(opened||!cover)return;cover.classList.add('opening');setTimeout(reveal,650)}

if(editing||!cover){opened=true;if(main)main.classList.add('visible');heroIn();if(toggle)toggle.classList.add('visible')}
else{
 d.body.style.overflow='hidden';
 cover.addEventListener('click',openEnvelope);
 cover.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openEnvelope()}});
 cover.addEventListener('touchend',function(e){e.preventDefault();openEnvelope()});
 // Вернулись после отправки анкеты — конверт второй раз не нужен.
 if(location.hash==='#rsvp'){cover.classList.add('is-open');opened=true;d.body.style.overflow='';if(main)main.classList.add('visible');heroIn();if(toggle)toggle.classList.add('visible')}
}

if(toggle&&music&&!editing){toggle.addEventListener('click',function(){
 if(music.paused){music.play();toggle.classList.add('playing');toggle.innerHTML='<span>🎵</span>'}
 else{music.pause();toggle.classList.remove('playing');toggle.innerHTML='<span>🔇</span>'}
})}

var reveals=d.querySelectorAll('.reveal');
if(editing||!('IntersectionObserver' in window)){reveals.forEach(function(el){el.classList.add('visible')})}
else{var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('visible');io.unobserve(en.target)}})},{threshold:.1,rootMargin:'0px 0px -40px 0px'});
 reveals.forEach(function(el){io.observe(el)})}

var cd=d.getElementById('countdown');
if(cd){var target=new Date(cd.getAttribute('data-target'));
 function pad(n){return n<10?'0'+n:''+n}
 function setNum(key,val){var el=cd.querySelector('[data-cd="'+key+'"]');if(!el||el.textContent===val)return;el.textContent=val;el.classList.remove('tick');void el.offsetWidth;el.classList.add('tick')}
 function tick(){var diff=target-new Date();
  if(diff<=0){cd.innerHTML='<p class="cd-done"></p>';cd.firstChild.textContent=cd.getAttribute('data-done')||'';return true}
  setNum('days',pad(Math.floor(diff/864e5)));setNum('hours',pad(Math.floor(diff%864e5/36e5)));
  setNum('mins',pad(Math.floor(diff%36e5/6e4)));setNum('secs',pad(Math.floor(diff%6e4/1e3)))}
 if(!tick()){var timer=setInterval(function(){if(tick())clearInterval(timer)},1000)}}

var leaves=d.querySelectorAll('.leaf');
window.addEventListener('scroll',function(){var y=window.scrollY||window.pageYOffset;
 leaves.forEach(function(leaf,i){var sp=.03+i*.015;leaf.style.transform='translateY('+(y*sp)+'px) rotate('+(i%2===0?-30+y*.01:30-y*.01)+'deg)'})},{passive:true});

var pl=d.querySelector('.polaroid-left'),pr=d.querySelector('.polaroid-right');
if(!editing&&window.matchMedia('(hover: hover)').matches){d.addEventListener('mousemove',function(e){
 var x=(e.clientX/window.innerWidth-.5)*12,y=(e.clientY/window.innerHeight-.5)*6;
 if(pl)pl.style.transform='rotate('+(-4.5+x*.25)+'deg) translate('+x+'px,'+y+'px)';
 if(pr)pr.style.transform='rotate('+(3-x*.25)+'deg) translate('+(-x)+'px,'+y+'px)'})}

var form=d.getElementById('rsvpForm'),again=d.getElementById('rsvpAgain'),success=d.getElementById('rsvpSuccess');
if(form&&!editing){form.addEventListener('submit',function(e){
 if(form.getAttribute('data-no-link')){e.preventDefault();var n=d.getElementById('rsvpNoLink');if(n)n.hidden=false;return}
 var b=d.getElementById('submitBtn');if(b){b.disabled=true;b.textContent=root.lang==='en'?'Sending…':'Отправка...'}})}
if(again&&form&&success){again.addEventListener('click',function(){success.classList.remove('show');form.style.display='';})}

var canvases=editing?[]:d.querySelectorAll('.msg-canvas');
function load(src){return new Promise(function(ok,fail){var s=d.createElement('script');s.src=src;s.onload=ok;s.onerror=fail;d.head.appendChild(s)})}
function shader(){if(!window.THREE)return;canvases.forEach(function(canvas){
 var box=canvas.parentElement,scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 var renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true});
 var material=new THREE.ShaderMaterial({
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float uProgress;uniform vec2 uResolution;uniform vec3 uColor;uniform float uSpread;varying vec2 vUv;'+
   'float Hash(vec2 p){vec3 p2=vec3(p.xy,1.0);return fract(sin(dot(p2,vec3(37.1,61.7,12.4)))*3758.5453123);}'+
   'float noise(in vec2 p){vec2 i=floor(p);vec2 f=fract(p);f*=f*(3.0-2.0*f);return mix(mix(Hash(i+vec2(0.0,0.0)),Hash(i+vec2(1.0,0.0)),f.x),mix(Hash(i+vec2(0.0,1.0)),Hash(i+vec2(1.0,1.0)),f.x),f.y);}'+
   'float fbm(vec2 p){float v=0.0;v+=noise(p*1.0)*0.5;v+=noise(p*2.0)*0.25;v+=noise(p*4.0)*0.125;return v;}'+
   'void main(){vec2 uv=vUv;float aspect=uResolution.x/uResolution.y;vec2 c=(uv-0.5)*vec2(aspect,1.0);'+
   'float edge=(1.0-uv.y)-uProgress*1.5+0.5;float n=fbm(c*15.0);float dd=edge+n*uSpread;float px=1.0/uResolution.y;'+
   'float alpha=1.0-smoothstep(-px,px,dd);gl_FragColor=vec4(uColor,alpha);}',
  uniforms:{uProgress:{value:0},uResolution:{value:new THREE.Vector2(box.offsetWidth,box.offsetHeight)},uColor:{value:new THREE.Vector3(.96,.93,.89)},uSpread:{value:.5}},
  transparent:true});
 scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 function resize(){var w=box.offsetWidth,h=box.offsetHeight;renderer.setSize(w,h);material.uniforms.uResolution.value.set(w,h)}
 window.addEventListener('resize',resize);resize();
 (function frame(){renderer.render(scene,camera);requestAnimationFrame(frame)})();
 if(window.gsap&&window.ScrollTrigger){gsap.to(material.uniforms.uProgress,{value:1,scrollTrigger:{trigger:box,start:'top 60%',end:'bottom 20%',scrub:true}})}
})}
if(canvases.length){var libs=${JSON.stringify(TILI_SHADER_LIBS)};
 libs.reduce(function(p,src){return p.then(function(){return load(src)})},Promise.resolve()).then(shader).catch(function(){})}
})()`;
