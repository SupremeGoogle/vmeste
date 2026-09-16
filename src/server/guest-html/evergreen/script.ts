export const EVERGREEN_SCRIPT = `(function(){var d=document,r=d.documentElement;r.classList.add('eg-motion');var es=d.querySelectorAll('[data-evergreen-block]');if(!('IntersectionObserver'in window)){for(var i=0;i<es.length;i++)es[i].classList.add('eg-in')}else{var o=new IntersectionObserver(function(xs){xs.forEach(function(x){if(x.isIntersecting){x.target.classList.add('eg-in');o.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -6%'});for(var i=0;i<es.length;i++)o.observe(es[i])}var bar=d.querySelector('.eg-progress i'),pics=d.querySelectorAll('[data-eg-parallax]'),intro=d.querySelector('.eg-intro'),sheet=d.querySelector('.sheet.evergreen'),ring=d.querySelector('.eg-journey-ring'),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,busy=0;function draw(){busy=0;var max=d.documentElement.scrollHeight-innerHeight,ratio=max>0?scrollY/max:0;if(bar)bar.style.transform='scaleX('+Math.max(0,Math.min(1,ratio))+')';if(!reduce){for(var j=0;j<pics.length;j++){var box=pics[j].getBoundingClientRect(),mid=box.top+box.height/2-innerHeight/2,shift=Math.max(-28,Math.min(28,-mid*.045));pics[j].style.setProperty('--eg-parallax',shift+'px')}if(ring&&intro&&sheet){var ib=intro.getBoundingClientRect(),start=scrollY+ib.top-innerHeight*.58,end=Math.max(start+1,d.documentElement.scrollHeight-innerHeight*.92),p=Math.max(0,Math.min(1,(scrollY-start)/(end-start))),swing=Math.min(220,sheet.clientWidth*.36),x=Math.sin(p*Math.PI*5)*swing+Math.sin(p*Math.PI)*35,y=innerHeight*(.07+p*.75),scale=.62+Math.sin(p*Math.PI)*.34,opacity=Math.min(1,p*11,(1-p)*12);ring.style.setProperty('--eg-ring-x',x+'px');ring.style.setProperty('--eg-ring-y',y+'px');ring.style.setProperty('--eg-ring-spin',(p*2160)+'deg');ring.style.setProperty('--eg-ring-tilt',(Math.sin(p*Math.PI*6)*36)+'deg');ring.style.setProperty('--eg-ring-scale',scale);ring.style.setProperty('--eg-ring-opacity',Math.max(0,opacity))}}}function ask(){if(!busy){busy=requestAnimationFrame(draw)}}addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);draw()})()`;

export const EVERGREEN_EDITOR_SCRIPT = `(function(){
document.documentElement.classList.add('eg-editing');
var active=null,original='';
function send(payload){parent.postMessage(Object.assign({source:'evergreen-canvas'},payload),'*')}
document.addEventListener('click',function(e){
 var tool=e.target.closest('[data-block-action]');
 if(tool){e.preventDefault();e.stopPropagation();send({kind:'block-action',action:tool.dataset.blockAction,blockId:tool.closest('[data-block-id]').dataset.blockId});return}
 var image=e.target.closest('[data-image-edit]');
 if(image){e.preventDefault();e.stopPropagation();send({kind:'image-edit',blockId:image.dataset.blockId,path:image.dataset.path,current:image.getAttribute('src')||''});return}
 var field=e.target.closest('[data-inline-edit]');
 if(!field)return;
 e.preventDefault();e.stopPropagation();
 if(active&&active!==field)active.blur();
 active=field;original=field.innerText;field.contentEditable='true';field.focus();
 var range=document.createRange();range.selectNodeContents(field);range.collapse(false);var sel=getSelection();sel.removeAllRanges();sel.addRange(range)
});
document.addEventListener('keydown',function(e){if(!active)return;if(e.key==='Escape'){active.innerText=original;active.blur()}if(e.key==='Enter'&&!e.shiftKey&&active.dataset.multiline!=='true'){e.preventDefault();active.blur()}});
document.addEventListener('focusout',function(e){var field=e.target.closest&&e.target.closest('[data-inline-edit]');if(!field||field!==active)return;field.contentEditable='false';var value=field.innerText.trim();if(value!==original)send({kind:'text-edit',blockId:field.dataset.blockId,path:field.dataset.path,value:value});active=null});
window.addEventListener('message',function(e){var m=e.data||{};if(m.source!=='evergreen-editor')return;if(m.kind==='image-saved'){var image=document.querySelector('[data-image-edit][data-block-id="'+CSS.escape(m.blockId)+'"][data-path="'+CSS.escape(m.path)+'"]');if(image)image.src=m.value}})
})()`;
