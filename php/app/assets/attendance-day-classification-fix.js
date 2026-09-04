/* خطیار — نمایش صحیح روز جمعه و تعطیل در گزارش تردد؛ event-driven */
(function(){
'use strict';
function norm(v){return String(v==null?'':v).replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function friday(d){return !!(d&&((d.is_friday===true)||d.weekday_index===6||norm(d.weekday)==='جمعه'));}
function fix(){
 var data=window.__khatyarAttendancePayload;
 if(!data||!Array.isArray(data.days))return;
 var map={};
 data.days.forEach(function(d){if(d&&d.jdate)map[String(d.jdate).replace(/-/g,'/')]=d;});
 document.querySelectorAll('table.khar-real-attendance-report tbody tr').forEach(function(tr){
  var cells=tr.children;if(cells.length<8)return;
  var j=String(cells[0].textContent||'').replace(/\s/g,'');
  var d=map[j]||map[j.replace(/-/g,'/')]||null;if(!d)return;
  var isFri=friday(d),label=isFri?'جمعه':(d.is_holiday?'تعطیل':'—');
  var weekday=isFri?'جمعه':String(d.weekday||'');
  if(cells[1].getAttribute('data-weekday')!==weekday)cells[1].setAttribute('data-weekday',weekday);
  if(cells[7].textContent!==label)cells[7].textContent=label;
  var title=isFri?(d.holiday_title?'جمعه — '+d.holiday_title:'جمعه'):(d.is_holiday?(d.holiday_title||'تعطیل'): '');
  if(cells[7].title!==title)cells[7].title=title;
 });
}
function start(){fix();}
if(window.addEventListener)window.addEventListener('khatyar:attendance-report-updated',fix);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else setTimeout(start,0);
})();
