/* خطیار — اصلاح نهایی ظاهر ساعت عقربه‌ای، ترتیب ساعت/دقیقه و حذف دکمه تنظیم ستون تکراری */
(function(){
'use strict';
function cleanSettings(){
 var all=Array.from(document.querySelectorAll('button,a,[role="button"]')).filter(function(x){
  return /تنظیم\s*ستون/.test((x.textContent||'').replace(/\s+/g,' ').trim());
 });
 if(all.length<2)return;
 var stable=all.find(function(x){
  var c=getComputedStyle(x),cls=String(x.className||'').toLowerCase();
  return c.animationName==='none' && c.opacity!=='0' && !/(blink|pulse|flash|animate)/.test(cls);
 });
 var keep=stable||all.find(function(x){return x.classList.contains('khar-column-settings-v6');})||all[0];
 all.forEach(function(x){if(x!==keep)x.remove();});
}
function apply(){
 var s=document.getElementById('khatyar-clock-ui-fix-style');
 if(!s){s=document.createElement('style');s.id='khatyar-clock-ui-fix-style';document.head.appendChild(s);}
 s.textContent=''
 +'.kh-time-picker{width:min(540px,96vw)!important;padding:26px!important;border-radius:28px!important;max-height:94vh!important;overflow:auto!important}'
 +'.kh-tp-display{direction:ltr!important;display:grid!important;grid-template-columns:1fr 28px 1fr!important;align-items:center!important;justify-items:center!important;width:100%!important}'
 +'.kh-tp-display .kh-tp-hour{grid-column:1!important;grid-row:1!important;direction:ltr!important;unicode-bidi:isolate!important;order:1!important}'
 +'.kh-tp-display b{grid-column:2!important;grid-row:1!important;order:2!important}'
 +'.kh-tp-display .kh-tp-minute{grid-column:3!important;grid-row:1!important;direction:ltr!important;unicode-bidi:isolate!important;order:3!important}'
 +'.kh-tp-num{min-width:115px!important;font-size:50px!important;font-weight:950!important;line-height:1.05!important;color:#17212f!important;text-align:center!important}'
 +'.kh-tp-display b{font-size:44px!important;color:#475467!important}'
 +'.kh-tp-clock{width:350px!important;height:350px!important;margin:14px auto 20px!important;box-shadow:inset 0 0 0 10px #f8fafc,0 10px 30px rgba(16,24,40,.10)!important}'
 +'.kh-tp-face{width:100%!important;height:100%!important;position:absolute!important;inset:0!important}'
 +'.kh-tp-ring-outer{width:280px!important;height:280px!important}'
 +'.kh-tp-ring-inner{width:200px!important;height:200px!important}'
 +'.kh-tp-tick{width:50px!important;height:50px!important;font-size:16px!important;font-weight:900!important;color:#101828!important;box-shadow:0 2px 6px rgba(16,24,40,.10)!important;line-height:1!important;z-index:5!important}'
 +'.kh-tp-minute-tick{width:40px!important;height:40px!important;font-size:13px!important}'
 +'.kh-tp-tick.selected{font-weight:950!important;transform:scale(1.06)!important}'
 +'.kh-tp-hand-hour{height:105px!important;width:8px!important}'
 +'.kh-tp-hand-minute{height:135px!important;width:5px!important}'
 +'.kh-tp-center{width:20px!important;height:20px!important;left:calc(50% - 10px)!important;top:calc(50% - 10px)!important}'
 +'.kh-tp-help{font-size:13px!important;font-weight:600!important;line-height:1.8!important}'
 +'.kh-tp-mode button{font-size:14px!important;padding:9px 22px!important}'
 +'.kh-tp-footer button{font-size:14px!important;padding:11px 20px!important}'
 +'.kh-tp-hour-tick,.kh-tp-minute-tick{font-family:Vazirmatn,Tahoma,sans-serif!important;direction:ltr!important;unicode-bidi:isolate!important}'
 +'.kh-tp-hour-tick.kh-tp-inner{font-size:15px!important;font-weight:950!important}'
 +'.kh-tp-minute-tick.minor{opacity:.9!important}';
}
function start(){
 apply();cleanSettings();
 var n=0,t=setInterval(function(){apply();cleanSettings();if(++n>=120)clearInterval(t);},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
