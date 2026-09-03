/* خطیار — پنهان‌سازی نمودارهای داشبورد بدون حذف Nodeهای تحت مالکیت React */
(function(){'use strict';
  const STYLE_ID='kh-dashboard-no-charts-style';
  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='body.kh-dashboard-no-charts #root canvas{display:none!important} body.kh-dashboard-no-charts #root canvas + *, body.kh-dashboard-no-charts #root [data-chart], body.kh-dashboard-no-charts #root .chart-container{display:none!important}';
    document.head.appendChild(style);
  }
  function isDashboard(){
    const active=[...document.querySelectorAll('a,.nav-item,.navitem,button')].find(el=>el.classList.contains('active')||el.classList.contains('on'));
    return !!(active&&/داشبورد|dashboard/i.test((active.textContent||'')));
  }
  function apply(){
    ensureStyle();
    document.body.classList.toggle('kh-dashboard-no-charts',isDashboard());
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
