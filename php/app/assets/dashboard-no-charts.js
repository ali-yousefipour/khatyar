/* خطیار — حذف تب نمودارها و جمع‌شدن پیش‌فرض وضعیت لحظه‌ای حضور */
(function(){
  'use strict';
  var STYLE_ID='kh-dashboard-clean-v4';
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    var st=document.createElement('style');st.id=STYLE_ID;
    st.textContent='body.kh-hide-dashboard-charts [data-khatyar-chart-tab],body.kh-hide-dashboard-charts [data-view="presentchart"],body.kh-hide-dashboard-charts [data-key="presentchart"]{display:none!important}.khatyar-live-presence-collapsed>*:not(.khatyar-live-presence-toggle):not(h1):not(h2):not(h3):not(h4):not(h5):not(h6){display:none!important}.khatyar-live-presence-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:#f5f7fa;color:inherit;border-radius:10px;padding:9px 12px;margin-bottom:8px;font:inherit;font-weight:700;cursor:pointer;direction:rtl}';
    document.head.appendChild(st);
  }
  function isDashboard(){
    var active=Array.prototype.find.call(document.querySelectorAll('a,button,[role="tab"],.nav-item,.navitem'),function(el){return el.classList.contains('active')||el.classList.contains('on')||el.getAttribute('aria-current')==='page';});
    return !!(active&&/داشبورد|dashboard/i.test(norm(active.textContent)));
  }
  function hideChartTab(){
    Array.prototype.forEach.call(document.querySelectorAll('a,button,[role="tab"],.nav-item,.navitem'),function(el){var t=norm(el.textContent);if(/^(📊\s*)?نمودارها$/.test(t)||t.indexOf('📊 نمودارها')>=0)el.setAttribute('data-khatyar-chart-tab','1');});
  }
  function collapseLive(){
    var panel=Array.prototype.find.call(Array.prototype.slice.call(document.querySelectorAll('.panel,.card,section,article,div')),function(el){var t=norm(el.textContent);return t.length<1600&&/وضعیت لحظه.?ای حضور|حضور لحظه.?ای پرسنل|وضعیت حضور لحظه.?ای/.test(t);});
    if(!panel||panel.getAttribute('data-khatyar-live-presence')==='1')return;
    panel.setAttribute('data-khatyar-live-presence','1');
    var btn=document.createElement('button');btn.type='button';btn.className='khatyar-live-presence-toggle';btn.textContent='نمایش وضعیت لحظه‌ای حضور';
    btn.onclick=function(){var c=panel.classList.toggle('khatyar-live-presence-collapsed');btn.textContent=c?'نمایش وضعیت لحظه‌ای حضور':'پنهان کردن وضعیت لحظه‌ای حضور';};
    panel.insertBefore(btn,panel.firstChild);panel.classList.add('khatyar-live-presence-collapsed');
  }
  function apply(){if(!document.body)return;ensureStyle();var dash=isDashboard();document.body.classList.toggle('kh-hide-dashboard-charts',dash);if(dash)hideChartTab();collapseLive();}
  var timer=0;function queue(){if(timer)return;timer=setTimeout(function(){timer=0;apply();},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current']});
})();
