/* خطیار — runtime guard for report formatting, build identity and legacy icon fallback */
(function(){
'use strict';
/* Capture the browser-native fetch before feature patches wrap window.fetch. */
try{if(!window.__KHATYAR_NATIVE_FETCH__&&typeof window.fetch==='function')window.__KHATYAR_NATIVE_FETCH__=window.fetch.bind(window);}catch(_){}
var PATCH='2026-10-11-v272';
window.__KHATYAR_PANEL_RUNTIME_PATCH__=PATCH;
try{var old=console.log;console.log=function(){try{var a=[].slice.call(arguments),s=String(a[0]||'');if(s.indexOf('PANEL BUILD:')===0&&s.indexOf('RUNTIME PATCH:')<0)a[0]=s+' | RUNTIME PATCH: '+PATCH;return old.apply(console,a);}catch(e){return old.apply(console,arguments);}};}catch(e){}
function fix(v){return String(v==null?'':v).replace(/([0-9۰-۹])[٬,](?=[0-9۰-۹])/g,'$1').replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d);});}
function iconFallback(e){try{var t=e&&e.target;if(!t||t.tagName!=='IMG')return;var src=String(t.getAttribute('src')||'');var fallback='';if(src.indexOf('/assets/icons3d/radio-tower.png')!==-1)fallback='/assets/icons3d/activity-wave.png';else if(src.indexOf('/assets/icons3d/school-service.png')!==-1)fallback='/assets/icons3d/checklist.png';else if(src.indexOf('/assets/icons3d/complaints.png')!==-1)fallback='/assets/icons3d/chat-message.png';else return;if(t.dataset.khIconFallback==='1')return;t.dataset.khIconFallback='1';e.stopImmediatePropagation();t.src=fallback;}catch(_){} }
document.addEventListener('error',iconFallback,true);
/* گزارش تردد اکنون کاملاً توسط React رندر می‌شود؛ این runtime نباید DOM تحت مالکیت React را تغییر دهد. */
function scan(){}
function start(){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
