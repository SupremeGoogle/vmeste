export const SILK_SCRIPT = `(function(){
var d=document,r=d.documentElement;r.classList.add('silk-motion');
var sections=d.querySelectorAll('.silk>section'),photos=d.querySelectorAll('[data-silk-parallax]'),cover=d.querySelector('.silk-cover-photo img'),bar=d.querySelector('.silk-progress i'),busy=0,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
if(!('IntersectionObserver'in window)){for(var i=0;i<sections.length;i++)sections[i].classList.add('silk-in')}else{var io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('silk-in');io.unobserve(entry.target)}})},{threshold:.1,rootMargin:'0px 0px -5%'});for(var i=0;i<sections.length;i++)io.observe(sections[i])}
function draw(){busy=0;var max=d.documentElement.scrollHeight-innerHeight,ratio=max>0?scrollY/max:0;if(bar)bar.style.transform='scaleX('+Math.max(0,Math.min(1,ratio))+')';if(reduce)return;if(cover)cover.style.setProperty('--silk-cover-y',Math.min(55,scrollY*.055)+'px');for(var j=0;j<photos.length;j++){var box=photos[j].getBoundingClientRect(),mid=box.top+box.height/2-innerHeight/2,shift=Math.max(-24,Math.min(24,-mid*.035));photos[j].style.setProperty('--silk-parallax',shift+'px')}}
function ask(){if(!busy)busy=requestAnimationFrame(draw)}addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);draw();
})()`.replace(/\n/g, "");

