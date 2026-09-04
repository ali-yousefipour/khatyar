/* خطیار — بهینه‌سازی گزارش تردد: حذف درخواست‌های تکراری و بارگذاری سریع پرسنل */
(function(){
'use strict';

/*
 * 1) در صفحه گزارش تردد، درخواست فهرست کامل کاربران را به endpoint سبک تبدیل می‌کنیم.
 *    AttendanceReport داخل bundle قدیمی هنوز db.users() را صدا می‌زند؛ تغییر اینجا
 *    بدون دستکاری bundle، لیست سبک /admin/users-lite را استفاده می‌کند.
 * 2) درخواست‌های یکسان گزارش که هم‌زمان از چند لایه عبور می‌کنند، single-flight می‌شوند.
 *    برای هر مصرف‌کننده clone مستقل برگردانده می‌شود تا body یک Response دوبار مصرف نشود.
 */

var reportInflight=Object.create(null);
var nativeFetch=window.fetch;

function isAttendanceView(){
  try{
    var h=document.querySelector('.top h2');
    return !!(h&&/گزارش تردد پرسنل/.test(h.textContent||''));
  }catch(e){return false;}
}

function normalizeUrl(input){
  try{return new URL(typeof input==='string'?input:input.url,location.href).toString();}
  catch(e){return String(input||'');}
}

if(nativeFetch){
  window.fetch=function(input,init){
    var url=normalizeUrl(input);
    var path='';
    try{path=new URL(url,location.href).pathname;}catch(e){path=url;}

    /* فهرست سبک پرسنل فقط در گزارش تردد */
    if(isAttendanceView() && /\/api\/admin\/users(?:\?|$)/.test(path)){
      try{
        var u=new URL(url,location.href);
        u.pathname=u.pathname.replace(/\/admin\/users$/,'/admin/users-lite');
        url=u.toString();
        if(typeof input==='string')input=url;
        else input=new Request(url,input);
      }catch(e){}
    }

    /* single-flight فقط برای GET گزارش تردد */
    var method=(init&&init.method)||(input&&input.method)||'GET';
    var isReport=/\/api\/admin\/attendance-report(?:\?|$)/.test(url);
    if(String(method).toUpperCase()!=='GET'||!isReport)return nativeFetch.call(this,input,init);

    var key=url;
    if(reportInflight[key]){
      return reportInflight[key].then(function(r){return r.clone();});
    }
    var p=nativeFetch.call(this,input,init);
    reportInflight[key]=p.then(function(r){return r.clone();},function(e){delete reportInflight[key];throw e;});
    p.then(function(){delete reportInflight[key];},function(){delete reportInflight[key];});
    return p;
  };
}

/* invalidate فقط بعد دریافت گزارش جدید؛ بدون polling و MutationObserver */
if(window.addEventListener){
  window.addEventListener('khatyar:attendance-report-updated',function(){
    var t=document.querySelector('table[data-kc-v2],table.khar-real-attendance-report');
    if(t)delete t.dataset.kcV2;
  });
}
})();