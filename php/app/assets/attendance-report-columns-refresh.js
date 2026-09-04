/* خطیار — بهینه‌سازی گزارش تردد: حذف درخواست‌های تکراری و بارگذاری سریع پرسنل */
(function(){
'use strict';
var reportInflight=Object.create(null);
var nativeFetch=window.fetch;
function isAttendanceView(){
  try{var h=document.querySelector('.top h2');return !!(h&&/گزارش تردد پرسنل/.test(h.textContent||''));}
  catch(e){return false;}
}
function normalizeUrl(input){
  try{return new URL(typeof input==='string'?input:input.url,location.href).toString();}
  catch(e){return String(input||'');}
}
if(nativeFetch){
  window.fetch=function(input,init){
    var url=normalizeUrl(input),path='';
    try{path=new URL(url,location.href).pathname;}catch(e){path=url;}
    /* AttendanceReport قدیمی db.users() را فراخوانی می‌کند؛ فقط در همین صفحه از users-lite استفاده شود. */
    if(isAttendanceView()&&/\/api\/admin\/users(?:\?|$)/.test(path)){
      try{
        var u=new URL(url,location.href);u.pathname=u.pathname.replace(/\/admin\/users$/,'/admin/users-lite');url=u.toString();
        if(typeof input==='string')input=url;else if(window.Request)input=new Request(url,input);
      }catch(e){}
    }
    /* endpoint اصلی قبل از این لایه به safe تبدیل می‌شود؛ هر دو نام را پوشش می‌دهیم. */
    var method=(init&&init.method)||(input&&input.method)||'GET';
    var isReport=/\/api\/admin\/attendance-report(?:\?|$)|\/api\/admin-attendance-report-(?:safe|fast)\.php(?:\?|$)/.test(url);
    if(String(method).toUpperCase()!=='GET'||!isReport)return nativeFetch.call(this,input,init);
    var key=url;
    if(reportInflight[key])return reportInflight[key].then(function(r){return r.clone();});
    var p=nativeFetch.call(this,input,init);
    reportInflight[key]=p.then(function(r){return r.clone();},function(e){delete reportInflight[key];throw e;});
    p.then(function(){delete reportInflight[key];},function(){delete reportInflight[key];});
    return p;
  };
}
if(window.addEventListener){window.addEventListener('khatyar:attendance-report-updated',function(){var t=document.querySelector('table[data-kc-v2],table.khar-real-attendance-report');if(t)delete t.dataset.kcV2;});}
})();