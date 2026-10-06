/**
 * Перехват ошибок браузера на гостевых страницах — без Sentry в браузере.
 * Не больше пяти отчётов со страницы, отправка `sendBeacon`, чтобы не
 * задерживать уход со страницы. Включается, только если задан Sentry.
 */
export function errorReporterScript(template: string): string {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return "";
  const tag = JSON.stringify(template.slice(0, 40)).replace(/</g, "\\u003c");
  return `<script>(function(){var sent=0;function send(p){if(sent++>4)return;p.template=${tag};p.page=location.pathname;var b=JSON.stringify(p);try{if(navigator.sendBeacon&&navigator.sendBeacon('/api/client-error',new Blob([b],{type:'application/json'})))return}catch(e){}try{fetch('/api/client-error',{method:'POST',body:b,keepalive:true,headers:{'content-type':'application/json'}})}catch(e){}}
addEventListener('error',function(e){if(!e||!e.message)return;send({message:String(e.message),source:String(e.filename||''),line:e.lineno,column:e.colno,stack:e.error&&e.error.stack?String(e.error.stack):''})});
addEventListener('unhandledrejection',function(e){var r=e&&e.reason;send({message:'Unhandled rejection: '+String(r&&r.message||r),stack:r&&r.stack?String(r.stack):''})});})()</script>`;
}
