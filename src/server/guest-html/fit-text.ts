/**
 * Крупный текст, который не влезает в ширину экрана (стандарт, §9).
 *
 * Шаблоны рисуют имена и заголовки крупно, под образец «Валерия и Давид».
 * У пары может быть «Александра и Константин» — одно длинное слово шире
 * телефона, и оно режется краем экрана. Переносить имя по буквам некрасиво,
 * поэтому такой текст уменьшается ровно настолько, чтобы самое длинное слово
 * поместилось в свой блок. Проверяется только крупный текст (от 22px) —
 * обычные абзацы и бегущие строки не трогаются.
 */
export const FIT_TEXT_SCRIPT = `(function(){
var MIN=22;
function own(el){for(var n=el.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.textContent.trim())return true;return false}
function inner(b){var cs=getComputedStyle(b);return b.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)}
function avail(el){var b=el;while(b&&(getComputedStyle(b).display.indexOf('inline')===0||(b.parentElement&&/flex/.test(getComputedStyle(b.parentElement).display))))b=b.parentElement;if(!b||!b.offsetWidth)return 0;var w=inner(b);for(var p=b.parentElement,i=0;p&&p!==document.body&&i<4;p=p.parentElement,i++){if(p.offsetWidth)w=Math.min(w,inner(p))}var scale=b.getBoundingClientRect().width/b.offsetWidth||1;return Math.min(w*scale,document.documentElement.clientWidth-16)}
function fit(){
  var done=document.querySelectorAll('[data-vm-fit]');for(var i=0;i<done.length;i++){done[i].style.removeProperty('font-size');done[i].removeAttribute('data-vm-fit')}
  var els=document.body.querySelectorAll('h1,h2,h3,h4,p,span,div,a,i,em,strong,b,small,li,blockquote');
  var list=[];
  for(var j=0;j<els.length;j++){var el=els[j];if(!own(el)||el.closest('script,style,svg,[data-editor-ui]'))continue;var cs=getComputedStyle(el);var fs=parseFloat(cs.fontSize);if(fs<MIN||cs.visibility==='hidden'||!el.offsetWidth)continue;var p=el.parentElement;if(p&&/auto|scroll/.test(getComputedStyle(p).overflowX))continue;list.push([el,fs])}
  for(var k=0;k<list.length;k++){var e=list[k][0],f=list[k][1];var a=avail(e);if(!a)continue;var r=document.createRange();r.selectNodeContents(e);var w=r.getBoundingClientRect().width;if(w<=a+1||w>a*2.2)continue;var next=Math.max(f*a/w*.97,f*.5);e.style.setProperty('font-size',next+'px','important');e.setAttribute('data-vm-fit','')}
}
var t;function later(d){clearTimeout(t);t=setTimeout(fit,d)}
if(document.readyState==='complete')later(0);else addEventListener('load',function(){later(0)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){later(50)});
addEventListener('resize',function(){later(150)});
// Заставка открывается первым нажатием — после неё страница перестраивается.
addEventListener('click',function(){later(700)},{once:true});
})();`;
