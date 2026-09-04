/* خطیار — اصلاح نهایی ظاهر ساعت عقربه‌ای و ترتیب ساعت/دقیقه */
(function(){
'use strict';
function apply(){
 var s=document.getElementById('khatyar-clock-ui-fix-style');
 if(!s){s=document.createElement('style');s.id='khatyar-clock-ui-fix-style';document.head.appendChild(s);}
 s.textContent=''
 +'.kh-time-picker{width:min(500px,96vw)!important;padding:24px!important;border-radius:28px!important}'
 +'.kh-tp-display{direction:ltr!important;display:grid!important;grid-template-columns:1fr 24px 1fr!important;align-items:center!important;justify-items:center!important;width:100%!important}'
 +'.kh-tp-display .kh-tp-hour{grid-column:3!important;grid-row:1!important;direction:ltr!important;unicode-bidi:isolate!important}'
 +'.kh-tp-display b{grid-column:2!important;grid-row:1!important}'
 +'.kh-tp-display .kh-tp-minute{grid-column:1!important;grid-row:1!important;direction:ltr!important;unicode-bidi:isolate!important}'
 +'.kh-tp-num{min-width:105px!important;font-size:48px!important;font-weight:950!important;line-height:1.05!important;color:#17212f!important}'
 +'.kh-tp-display b{font-size:42px!important;color:#475467!important}'
 +'.kh-tp-clock{width:330px!important;height:330px!important;margin:12px auto 18px!important;box-shadow:inset 0 0 0 10px #f8fafc,0 10px 30px rgba(16,24,40,.10)!important}'
 +'.kh-tp-ring-outer{width:280px!important;height:280px!important}'
 +'.kh-tp-ring-inner{width:190px!important;height:190px!important}'
 +'.kh-tp-tick{width:48px!important;height:48px!important;font-size:15px!important;font-weight:900!important;color:#182230!important;box-shadow:0 2px 5px rgba(16,24,40,.08)!important}'
 +'.kh-tp-minute-tick{width:38px!important;height:38px!important;font-size:12px!important}'
 +'.kh-tp-tick.selected{font-weight:950!important}'
 +'.kh-tp-hand-hour{height:95px!important;width:7px!important}'
 +'.kh-tp-hand-minute{height:125px!important;width:4px!important}'
 +'.kh-tp-center{width:18px!important;height:18px!important;left:calc(50% - 9px)!important;top:calc(50% - 9px)!important}'
 +'.kh-tp-help{font-size:13px!important;font-weight:600!important}'
 +'.kh-tp-mode button{font-size:14px!important;padding:9px 22px!important}'
 +'.kh-tp-footer button{font-size:14px!important;padding:11px 20px!important}';
}
function start(){apply();var n=0,t=setInterval(function(){apply();if(++n>=30)clearInterval(t);},300);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
