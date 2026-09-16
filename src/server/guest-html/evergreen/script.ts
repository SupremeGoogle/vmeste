export const EVERGREEN_SCRIPT = `(function(){
var d=document,r=d.documentElement;
r.classList.add('eg-motion');
var es=d.querySelectorAll('[data-evergreen-block]');
if(!('IntersectionObserver'in window)){
 for(var i=0;i<es.length;i++)es[i].classList.add('eg-in');
}else{
 var o=new IntersectionObserver(function(xs){xs.forEach(function(x){if(x.isIntersecting){x.target.classList.add('eg-in');o.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -6%'});
 for(var i=0;i<es.length;i++)o.observe(es[i]);
}
var bar=d.querySelector('.eg-progress i'),pics=d.querySelectorAll('[data-eg-parallax]'),intro=d.querySelector('.eg-intro'),sheet=d.querySelector('.sheet.evergreen'),ringOne=d.querySelector('.eg-ring-one'),ringTwo=d.querySelector('.eg-ring-two'),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,busy=0;
function mix(a,b,t){return a+(b-a)*t}
function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function place(ring,x,y,spin,tilt,scale,opacity){ring.style.setProperty('--eg-ring-x',x+'px');ring.style.setProperty('--eg-ring-y',y+'px');ring.style.setProperty('--eg-ring-spin',spin+'deg');ring.style.setProperty('--eg-ring-tilt',tilt+'deg');ring.style.setProperty('--eg-ring-scale',scale);ring.style.setProperty('--eg-ring-opacity',opacity)}
function draw(){
 busy=0;
 var max=d.documentElement.scrollHeight-innerHeight,ratio=max>0?scrollY/max:0;
 if(bar)bar.style.transform='scaleX('+Math.max(0,Math.min(1,ratio))+')';
 if(!reduce){
  for(var j=0;j<pics.length;j++){var box=pics[j].getBoundingClientRect(),mid=box.top+box.height/2-innerHeight/2,shift=Math.max(-28,Math.min(28,-mid*.045));pics[j].style.setProperty('--eg-parallax',shift+'px')}
  if(ringOne&&ringTwo&&intro&&sheet){
   var ib=intro.getBoundingClientRect(),start=scrollY+ib.top-innerHeight*.58,end=Math.max(start+1,max),p=Math.max(0,Math.min(1,(scrollY-start)/(end-start))),merge=smooth((p-.78)/.22),swing=Math.min(245,sheet.clientWidth*.39),baseY=innerHeight*(.08+p*.68),finalY=innerHeight*.43,opacity=Math.min(1,p*12);
   var x1=Math.sin(p*Math.PI*7.4)*swing+Math.cos(p*Math.PI*17)*34-54,y1=baseY+Math.sin(p*Math.PI*9.2)*62;
   var x2=Math.cos(p*Math.PI*6.6)*swing*.92+Math.sin(p*Math.PI*15)*42+58,y2=baseY+Math.cos(p*Math.PI*8.4)*68;
   x1=mix(x1,-24,merge);x2=mix(x2,24,merge);y1=mix(y1,finalY-5,merge);y2=mix(y2,finalY+5,merge);
   var scale=mix(.58+Math.sin(p*Math.PI*4)*.09,1.48,merge);
   place(ringOne,x1,y1,mix(p*1980,-24,merge),mix(Math.sin(p*Math.PI*8)*42,-8,merge),scale,opacity);
   place(ringTwo,x2,y2,mix(-p*1740,31,merge),mix(Math.cos(p*Math.PI*7)*38,12,merge),scale,opacity);
  }
 }
}
function ask(){if(!busy){busy=requestAnimationFrame(draw)}}
addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);draw();
})()`.replace(/\n/g, "");

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
