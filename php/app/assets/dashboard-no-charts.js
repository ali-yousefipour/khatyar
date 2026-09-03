/* خطیار — حذف امن نمودارهای داشبورد فقط با CSS؛ هرگز DOM تحت مالکیت React را mutate نمی‌کند. */
(function(){'use strict';
  const STYLE_ID='kh-dashboard-no-charts-style-v2';
  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=[
      'body.kh-dashboard-no-charts #root canvas{display:none!important}',
      'body.kh-dashboard-no-charts #root [data-chart]{display:none!important}',
      'body.kh-dashboard-no-charts #root .chart-container{display:none!important}',
      'body.kh-dashboard-no-charts #root .chartjs-render-monitor{display:none!important}'
    ].join('');
    document.head.appendChild(style);
  }
  function isDashboard(){
    const active=[...document.querySelectorAll('a,.nav-item,.navitem,button,[role="tab"]')]
      .find(el=>el.classList.contains('active')||el.classList.contains('on')||el.getAttribute('aria-current')==='page');
    return !!(active&&/داشبورد|dashboard/i.test((active.textContent||'')));
  }
  function apply(){
    if(!document.body) return;
    ensureStyle();
    document.body.classList.toggle('kh-dashboard-no-charts',isDashboard());
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current']});
})();
