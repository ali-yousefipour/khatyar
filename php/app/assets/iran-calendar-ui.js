/* خطیار — اتصال DatePicker به تقویم مرکزی ایرانCalendar
 * منبع تعطیلات: API مرکزی خطیار که از IranCalendar استفاده می‌کند.
 * منبع مناسبت‌ها/تعطیلات دیگر: همان داده تقویم مرکزی؛ بدون وابستگی به تقویم شخص ثالث.
 * روزهای هفته در DatePicker به‌صورت شمسی و الگوریتمی محاسبه می‌شوند تا برای سال‌های آینده نیز نیاز به بروزرسانی نداشته باشند.
 */
(function(){
'use strict';
var CACHE={};
var TTL=86400000;

function css(){
  if(document.getElementById('kh-iran-calendar-ui-css'))return;
  var s=document.createElement('style');
  s.id='kh-iran-calendar-ui-css';
  s.textContent='.kh-safe-day.iran-holiday,.kh-safe-day.iran-occasion{color:#d92d20!important;background:#fff1f0!important;font-weight:900!important}.kh-safe-day.iran-holiday{box-shadow:inset 0 0 0 1px #fda29b}.kh-safe-day.iran-holiday:hover,.kh-safe-day.iran-occasion:hover{background:#fee4e2!important}.kh-safe-day.sel.iran-holiday,.kh-safe-day.sel.iran-occasion{background:#d92d20!important;color:#fff!important}.kh-safe-day[data-event-title]{position:relative}';
  document.head.appendChild(s);
}

function normalize(v){
  return String(v||'')
    .replace(/[۰-۹]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);})
    .replace(/[٠-٩]/g,function(d){return '٠١٢٣٤٥٦٧٨٩'.indexOf(d);})
    .replace(/\//g,'-');
}

function asMap(payload){
  var map={};
  var rows=[];
  if(Array.isArray(payload)) rows=payload;
  else if(payload && Array.isArray(payload.data)) rows=payload.data;
  else if(payload && Array.isArray(payload.holidays)) rows=payload.holidays;
  else if(payload && Array.isArray(payload.events)) rows=payload.events;
  else if(payload && payload.data && typeof payload.data==='object') rows=Object.keys(payload.data).map(function(k){var x=payload.data[k];return typeof x==='object'?Object.assign({jdate:k},x):{jdate:k,title:String(x),is_holiday:true};});
  else if(payload && typeof payload==='object') rows=Object.keys(payload).map(function(k){var x=payload[k];return typeof x==='object'?Object.assign({jdate:k},x):{jdate:k,title:String(x),is_holiday:true};});

  rows.forEach(function(row){
    if(!row)return;
    var d=normalize(row.jdate||row.jDate||row.jalali_date||row.persian_date||row.date||row.key||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;
    var title=row.title||row.event_name||row.eventName||row.text||row.description||row.occasion||row.name||'';
    var holiday=row.is_holiday===true||row.isHoliday===true||row.holiday===true||String(row.is_holiday||row.isHoliday||row.holiday||'').toLowerCase()==='true'||String(row.is_holiday||row.isHoliday||row.holiday||'')==='1';
    if(!holiday && /تعطیل/.test(String(title)))holiday=true;
    map[d]={title:String(title||'تعطیل رسمی'),holiday:holiday};
  });
  return map;
}

function loadYear(y,done){
  y=+y;
  var hit=CACHE[y];
  if(hit && Date.now()-hit.t<TTL){done(hit.map);return;}

  /* این endpoint باید همان IranCalendar::holidays()/events() مرکزی را برگرداند. */
  fetch('/api/admin/holidays?year='+encodeURIComponent(y),{cache:'no-store',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('calendar '+r.status);return r.json();})
    .then(function(payload){
      var map=asMap(payload);
      CACHE[y]={t:Date.now(),map:map};
      done(map);
    })
    .catch(function(){
      /* در صورت خطای شبکه، آخرین داده موفق نگه داشته می‌شود؛
       * DatePicker نباید تقویم شخص ثالث یا داده ثابت سال خاص را نمایش دهد. */
      done(hit?hit.map:{});
    });
}

function paint(cal){
  if(!cal)return;
  var ys=cal.querySelector('[data-y]'),ms=cal.querySelector('[data-m]');
  if(!ys||!ms)return;
  var y=+ys.value,m=+ms.value;
  loadYear(y,function(map){
    cal.querySelectorAll('.kh-safe-day[data-d]').forEach(function(btn){
      btn.classList.remove('iran-holiday','iran-occasion');
      btn.removeAttribute('data-event-title');
      var key=y+'-'+String(m).padStart(2,'0')+'-'+String(+btn.getAttribute('data-d')).padStart(2,'0');
      var item=map[key];
      if(!item)return;
      btn.classList.add(item.holiday?'iran-holiday':'iran-occasion');
      btn.setAttribute('data-event-title',item.title||'مناسبت');
      btn.title=item.title||'مناسبت';
    });
  });
}

function watch(){
  css();
  var ob=new MutationObserver(function(ms){
    ms.forEach(function(m){
      (m.addedNodes||[]).forEach(function(n){
        if(n.nodeType===1&&n.classList&&n.classList.contains('kh-safe-jdp'))paint(n);
      });
      if(m.target&&m.target.closest){
        var cal=m.target.closest('.kh-safe-jdp');
        if(cal)paint(cal);
      }
    });
  });
  if(document.body)ob.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['value']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
