/** Gentle section reveals; the invitation opens directly on its cover. */
export function aquarelleScript(): string {
  return `(function(){
var d=document,root=d.querySelector('.aquarelle');if(!root)return;
d.documentElement.classList.add('aq-motion');
var blocks=[].slice.call(root.querySelectorAll('[data-aq-block]')),
    items=[].slice.call(root.querySelectorAll('[data-aq-rise]'));
if('IntersectionObserver'in window){
 var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('aq-in');io.unobserve(en.target)}})},{threshold:.08});
 blocks.forEach(function(b){io.observe(b)});
 var io2=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('aq-rise');io2.unobserve(en.target)}})},{threshold:.12});
 items.forEach(function(i){io2.observe(i)});
}else{blocks.forEach(function(b){b.classList.add('aq-in')});items.forEach(function(i){i.classList.add('aq-rise')})}
})()`.replace(/\n/g, "");
}
