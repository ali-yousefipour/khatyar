/* خطیار — ماژول قدیمی «مجوز ثبت موقعیت و تصویر خطوط» بازنشسته شد.
 * تنظیم نمایش قابلیت فقط از App Items / آیتم‌های اپ هر سمت انجام می‌شود.
 * این فایل عمداً هیچ API تنظیم مجوز قدیمی را فراخوانی نمی‌کند.
 */
(function(){
  'use strict';
  const re=/مجوز\s*ثبت\s*موقعیت\s*و\s*تصویر\s*خطوط|مجوز\s*ثبت\s*موقعیت\s*خطوط/;
  function hide(){
    document.querySelectorAll('h1,h2,h3,h4,h5,h6,section,article,.card,div').forEach(function(el){
      const t=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
      if(!t||!re.test(t)||/ثبت\s*ایستگاه‌ها/.test(t))return;
      let x=el;
      for(let i=0;i<5&&x.parentElement;i++){
        if(x.matches('section,article,.card,[class*=card]'))break;
        x=x.parentElement;
      }
      if(x&&x!==document.body)x.style.display='none';
    });
  }
  new MutationObserver(hide).observe(document.documentElement,{childList:true,subtree:true});
  [0,500,1500,3000].forEach(function(t){setTimeout(hide,t)});
})();
