/**
 * «Новый посетитель» — одна отметка на браузер, для уведомления владельцу
 * в Telegram (`app/api/visit/route.ts`).
 *
 * Скрипт в странице, а не проверка на сервере: лендинг и приглашения
 * отдаются из кеша nginx, и до приложения такой заход не доходит вовсе.
 *
 * Отметка уходит, только когда посетитель ведёт себя как человек: двигал
 * мышью, листал, касался экрана или нажимал клавиши — и пробыл на
 * странице хотя бы 3 секунды. Роботы и «браузеры без головы» так не
 * делают, а `navigator.webdriver` выдаёт автоматизацию прямо. Шлём при
 * уходе (вкладка скрыта) — тогда уже известно поведение: сколько пробыл,
 * как глубоко долистал, что нажимал (только подписи ссылок и кнопок, не
 * содержимое полей). Если вкладку не закрывают — сама через 5 минут.
 * Флаг — в localStorage: тот же человек завтра уже не «новый».
 */
export const VISIT_BEACON = `(function(){try{if(navigator.webdriver||localStorage.getItem("vm_seen"))return}catch(e){return}var t=Date.now(),p=location.pathname,a=0,d=0,c=[],done=0;function sc(){var h=document.documentElement,v=Math.round((scrollY+innerHeight)/Math.max(h.scrollHeight,1)*100);if(v>d)d=Math.min(v,100)}function on(){a++}["pointermove","pointerdown","keydown","touchstart","scroll"].forEach(function(e){addEventListener(e,on,{passive:true})});addEventListener("scroll",sc,{passive:true});addEventListener("click",function(e){var el=e.target&&e.target.closest&&e.target.closest("a,button");if(!el||c.length>=6)return;var s=(el.getAttribute("aria-label")||el.textContent||"").replace(/\\s+/g," ").trim().slice(0,40);if(s&&c[c.length-1]!==s)c.push(s)},true);function send(){if(done||!a||Date.now()-t<3000)return;done=1;try{localStorage.setItem("vm_seen",String(Date.now()))}catch(e){}sc();var b=JSON.stringify({p:p,f:location.pathname,r:document.referrer,w:screen.width,l:navigator.language,s:Math.round((Date.now()-t)/1000),d:d,c:c});if(!(navigator.sendBeacon&&navigator.sendBeacon("/api/visit",b)))fetch("/api/visit",{method:"POST",body:b,keepalive:true})}addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")send()});addEventListener("pagehide",send);setTimeout(send,300000)})()`;

export const visitBeaconTag = (enabled: boolean) => (enabled ? `<script>${VISIT_BEACON}</script>` : "");
