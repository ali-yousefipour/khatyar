/* خطیار — انتقال گزارش تردد به endpoint سریع و فقط‌خواندنی */
(function(){
  'use strict';
  if (window.__khatyarAttendanceEndpointFix) return;
  window.__khatyarAttendanceEndpointFix = true;
  function rewrite(url){
    if (!url) return url;
    var s=String(url);
    /* خطیار: پیاده‌سازی نهایی و پایدار گزارش تردد الان admin-attendance-report.php است (بازنویسی کامل، بدون وابستگی به routes.php).
       هر آدرس قدیمی (چه مسیرِ روتر اصلی، چه هر یک از نسخه‌های safe/fast/v2/v3) به همین فایل هدایت می‌شود. */
    if (/\/api\/admin\/attendance-report(?:\?|$)/.test(s)) {
      return s.replace('/api/admin/attendance-report','/api/admin-attendance-report.php');
    }
    if (/\/api\/admin-attendance-report-(?:safe|fast|fast-safe-v2|fast-safe-v3)\.php(?:\?|$)/.test(s)) {
      return s.replace(/\/api\/admin-attendance-report-(?:safe|fast|fast-safe-v2|fast-safe-v3)\.php/, '/api/admin-attendance-report.php');
    }
    return s;
  }
  if (window.fetch) {
    var nativeFetch=window.fetch;
    window.fetch=function(input,init){
      var u=typeof input==='string'?input:(input&&input.url)||'';
      var nu=rewrite(u);
      if(nu!==u){
        if(typeof input==='string') input=nu;
        else if(window.Request) input=new Request(nu,input);
      }
      return nativeFetch.call(this,input,init);
    };
  }
  if(window.XMLHttpRequest){
    var open=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(method,url){
      arguments[1]=rewrite(url);
      return open.apply(this,arguments);
    };
  }
})();
