/**
 * «Новый посетитель» — одна отметка на браузер, для уведомления владельцу
 * в Telegram (`app/api/visit/route.ts`).
 *
 * Скрипт в странице, а не проверка на сервере: лендинг и приглашения
 * отдаются из кеша nginx, и до приложения такой заход не доходит вовсе.
 * Заодно отсеиваются почти все роботы — они не выполняют JavaScript.
 * Флаг — в localStorage: тот же человек завтра уже не «новый».
 */
export const VISIT_BEACON = `(function(){try{if(localStorage.getItem("vm_seen"))return;localStorage.setItem("vm_seen",String(Date.now()))}catch(e){return}try{var d=JSON.stringify({p:location.pathname,r:document.referrer,w:screen.width,l:navigator.language});if(!(navigator.sendBeacon&&navigator.sendBeacon("/api/visit",d)))fetch("/api/visit",{method:"POST",body:d,keepalive:true})}catch(e){}})()`;

export const visitBeaconTag = () => `<script>${VISIT_BEACON}</script>`;
