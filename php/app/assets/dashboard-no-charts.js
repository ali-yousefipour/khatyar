/* خطیار — حذف نمودارهای داشبورد بدون دست‌کاری نمودارهای سایر بخش‌ها */
(function(){'use strict';
function isDashboard(){
  const active=[...document.querySelectorAll('a,.nav-item,.navitem,button')].find(el=>el.classList.contains('active')||el.classList.contains('on'));
  return !!(active&&/داشبورد|dashboard/i.test((active.textContent||'')));
}
function removeDashboardCharts(){
  if(!isDashboard()) return;
  document.querySelectorAll('#root canvas').forEach(function(canvas){
    let box=canvas.closest('.card,.panel,.dashboard-card,[class*="card"],[class*="panel"]')||canvas.parentElement;
    if(box) box.remove(); else canvas.remove();
  });
}
function run(){removeDashboardCharts();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});
})();
