export const EVERGREEN_SCRIPT = `(function(){var d=document,r=d.documentElement;r.classList.add('eg-motion');var es=d.querySelectorAll('[data-evergreen-block]');if(!('IntersectionObserver'in window)){for(var i=0;i<es.length;i++)es[i].classList.add('eg-in')}else{var o=new IntersectionObserver(function(xs){xs.forEach(function(x){if(x.isIntersecting){x.target.classList.add('eg-in');o.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -6%'});for(var i=0;i<es.length;i++)o.observe(es[i])}var bar=d.querySelector('.eg-progress i'),pics=d.querySelectorAll('[data-eg-parallax]'),timeline=d.querySelector('.eg-timeline'),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,busy=0;function draw(){busy=0;var max=d.documentElement.scrollHeight-innerHeight,ratio=max>0?scrollY/max:0;if(bar)bar.style.transform='scaleX('+Math.max(0,Math.min(1,ratio))+')';if(!reduce){for(var j=0;j<pics.length;j++){var box=pics[j].getBoundingClientRect(),mid=box.top+box.height/2-innerHeight/2,shift=Math.max(-28,Math.min(28,-mid*.045));pics[j].style.setProperty('--eg-parallax',shift+'px')}if(timeline){var tb=timeline.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.82-tb.top)/(tb.height+innerHeight*.55))),x=-76+p*(timeline.clientWidth+70)+Math.sin(p*Math.PI)*38,y=20+p*Math.max(0,timeline.offsetHeight-135),scale=.72+Math.sin(p*Math.PI)*.38,opacity=Math.sin(p*Math.PI)*.96;timeline.style.setProperty('--eg-ring-x',x+'px');timeline.style.setProperty('--eg-ring-y',y+'px');timeline.style.setProperty('--eg-ring-spin',(p*620)+'deg');timeline.style.setProperty('--eg-ring-scale',scale);timeline.style.setProperty('--eg-ring-opacity',opacity)}}}function ask(){if(!busy){busy=requestAnimationFrame(draw)}}addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);draw()})()`;

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
