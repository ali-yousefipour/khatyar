/* خطیار — پل رویداد گزارش تردد؛ تنها یک سیگنال برای تمام لایه‌های نمایش */
(function(){
'use strict';
if(window.__khatyarAttendanceReportEventBridge)return;
window.__khatyarAttendanceReportEventBridge=true;
function isReportUrl(u){return /\/api\/admin(?:\/attendance-report(?:\?|$)|-attendance-report-(?:safe|fast)\.php(?:\?|$))/.test(String(u||''));}
var seq=0;
function emit(){
 var token=++seq;
 setTimeout(function(){
  try{window.dispatchEvent(new CustomEvent('khatyar:attendance-report-updated',{detail:{token:token,version:window.__khatyarAttendanceVersion||0}}));}catch(e){
   try{var ev=document.createEvent('Event');ev.initEvent('khatyar:attendance-report-updated',false,false);window.dispatchEvent(ev);}catch(ignore){}
  }
 },0);
}
if(window.fetch){
 var nf=window.fetch;
 window.fetch=function(){
  var args=arguments;
  return nf.apply(this,args).then(function(r){
   try{var u=typeof args[0]==='string'?args[0]:(args[0]&&args[0].url)||'';if(isReportUrl(u)&&r&&r.ok)emit();}catch(e){}
   return r;
  });
 };
}
if(window.XMLHttpRequest){
 var O=XMLHttpRequest.prototype.open,S=XMLHttpRequest.prototype.send;
 XMLHttpRequest.prototype.open=function(m,u){this.__khatyarAttendanceEventUrl=u;return O.apply(this,arguments);};
 XMLHttpRequest.prototype.send=function(){
  this.addEventListener('load',function(){try{if(isReportUrl(this.__khatyarAttendanceEventUrl)&&this.status>=200&&this.status<300)emit();}catch(e){}});
  return S.apply(this,arguments);
 };
}
if(window.addEventListener)window.addEventListener('khatyar:attendance-report-updated',function(){
 var t=document.querySelector('table[data-kc-v2],table.khar-real-attendance-report');
 if(t)delete t.dataset.kcV2;
});
})();
