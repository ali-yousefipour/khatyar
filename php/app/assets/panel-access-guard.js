/* خطیار: بخش قدیمی این فایل (پنهان‌کردن لینک‌های سایدبار بر اساس role_perms، و تزریق چک‌باکس تکراری «بی‌سیم»
   در تب دسترسی‌ها) حذف شد — خودِ پنل React اکنون این منطق را به‌درستی و مستقیم انجام می‌دهد (بخش SECTIONS
   و تابع can() در کد اصلی پنل)، و داشتن دو سیستم موازی برای مخفی/نمایش‌کردن آیتم‌ها دقیقاً همان نوع
   ناهماهنگی و رفتار غیرمنتظره‌ای را ایجاد می‌کرد که باعث سردرگمی در تب‌های تنظیمات می‌شد.
   فقط فیلتر تاریخ تولد (که ربطی به دسترسی‌ها ندارد) نگه داشته شده است. */
(function(){
  'use strict';
  // فیلتر داشبورد تولد: فقط تولدهای امروز یا بعد از آن در ماه شمسی جاری را نگه می‌دارد.
  (function installBirthdayDashboardFilter(){
    const originalFetch=window.fetch;
    if(typeof originalFetch!=='function')return;
    window.fetch=function(){
      return originalFetch.apply(this,arguments).then(async response=>{
        try{
          const input=arguments[0];
          const rawUrl=typeof input==='string' ? input : (input&&input.url);
          const url=new URL(rawUrl||'',window.location.href);
          if(url.pathname==='/api/admin/birthdays-month' && response.ok){
            const data=await response.clone().json();
            if(data && Array.isArray(data.people)){
              const today=Number(data.today);
              data.people=data.people.filter(person=>{
                const daysLeft=Number(person&&person.days_left);
                if(Number.isFinite(daysLeft))return daysLeft>=0;
                const day=Number(person&&person.day);
                return Number.isFinite(day) && Number.isFinite(today) && day>=today;
              });
              data.count=data.people.length;
              const headers=new Headers(response.headers);
              headers.set('content-type','application/json; charset=utf-8');
              return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
            }
          }
        }catch(e){}
        return response;
      });
    };
  })();
})();
