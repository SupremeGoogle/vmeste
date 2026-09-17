export const RUBY_SCRIPT = `<script>(function(){
document.documentElement.classList.add('ruby-motion');
var root=document.querySelector('.ruby');if(!root)return;
var blocks=[].slice.call(root.querySelectorAll('[data-ruby-block],.ruby>section:not([data-ruby-block])'));
if('IntersectionObserver'in window){var io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)entry.target.classList.add('ruby-in')})},{threshold:.14});blocks.forEach(function(block){io.observe(block)})}else{blocks.forEach(function(block){block.classList.add('ruby-in')})}
var progress=document.querySelector('.ruby-progress i');var photos=[].slice.call(root.querySelectorAll('[data-ruby-parallax]'));var ticking=false;
function paint(){var max=Math.max(1,document.documentElement.scrollHeight-innerHeight);var y=scrollY||document.documentElement.scrollTop;var p=Math.max(0,Math.min(1,y/max));if(progress)progress.style.transform='scaleX('+p+')';photos.forEach(function(photo){var r=photo.parentElement.getBoundingClientRect();var shift=Math.max(-18,Math.min(18,(innerHeight/2-(r.top+r.height/2))*.035));photo.style.setProperty('--ruby-parallax',shift+'px')});ticking=false}
function onScroll(){if(!ticking){requestAnimationFrame(paint);ticking=true}}addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);paint();
})();</script>`;
