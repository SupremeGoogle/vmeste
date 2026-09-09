/** No network, tracking, or form interception. Motion is optional progressive enhancement. */
export const PROMISE_SCRIPT = `(function(){
var d=document,root=d.documentElement,m=window.matchMedia('(prefers-reduced-motion: reduce)');
var sections=d.querySelectorAll('[data-promise-block]');
if(!sections.length)return;
var progress=d.createElement('div');progress.className='promise-progress';progress.setAttribute('aria-hidden','true');d.body.appendChild(progress);
var ticking=false;
function update(){var height=root.scrollHeight-root.clientHeight;progress.style.transform='scaleX('+(height>0?Math.min(1,Math.max(0,window.scrollY/height)):0)+')';ticking=false}
window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
window.addEventListener('resize',update);update();
function reveal(){
root.classList.remove('promise-motion');
if(m.matches||!('IntersectionObserver' in window))return;
var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('promise-seen');io.unobserve(e.target)}})},{threshold:0,rootMargin:'0px 0px -24px 0px'});
sections.forEach(function(section){io.observe(section)});
root.classList.add('promise-motion');
}
reveal();if(m.addEventListener)m.addEventListener('change',reveal);
})()`;
