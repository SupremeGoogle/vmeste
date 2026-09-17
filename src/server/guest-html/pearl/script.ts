export const PEARL_SCRIPT = `(function(){
var d=document,r=d.documentElement;r.classList.add('pearl-motion');
var sections=d.querySelectorAll('.pearl>section'),photos=d.querySelectorAll('[data-pearl-parallax]'),bar=d.querySelector('.pearl-progress i'),busy=0,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
if(!('IntersectionObserver'in window)){for(var i=0;i<sections.length;i++)sections[i].classList.add('pearl-in')}else{var io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('pearl-in');io.unobserve(entry.target)}})},{threshold:.1,rootMargin:'0px 0px -6%'});for(var i=0;i<sections.length;i++)io.observe(sections[i])}
function draw(){busy=0;var max=d.documentElement.scrollHeight-innerHeight,ratio=max>0?scrollY/max:0;if(bar)bar.style.transform='scaleX('+Math.max(0,Math.min(1,ratio))+')';if(reduce)return;for(var j=0;j<photos.length;j++){var box=photos[j].getBoundingClientRect(),mid=box.top+box.height/2-innerHeight/2,shift=Math.max(-26,Math.min(26,-mid*.032));photos[j].style.setProperty('--pearl-parallax',shift+'px')}}
function ask(){if(!busy)busy=requestAnimationFrame(draw)}addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);draw();
})()`.replace(/\n/g, "");
