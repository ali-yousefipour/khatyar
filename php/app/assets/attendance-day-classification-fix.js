/* خطیار — نمایش صحیح روز جمعه و تعطیل در گزارش تردد */
(function(){
'use strict';
function norm(v){return String(v==null?'':v).replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function friday(d){return !!(d&&((d.is_friday===true)||d.weekday_index===6||norm(d.weekday)==='جمعه'));}
function fix(){var data=window.__khatyarAttendancePayload;if(!data||!Array.isArray(data.days))return;var map={};data.days.forEach(function(d){if(d&&d.jdate)map[String(d.jdate)]=d;});document.querySelectorAll('table.khar-real-attendance-report tbody tr').forEach(function(tr){var cells=tr.children;if(cells.length<8)return;var j=String(cells[0].textContent||'').replace(/\s/g,'');var d=map[j]||null;if(!d)return;var label=friday(d)?'جمعه':(d.is_holiday?'تعطیل':'—');cells[1].setAttribute('data-weekday',friday(d)?'جمعه':String(d.weekday||''));cells[7].textContent=label;if(friday(d))cells[7].setAttribute('title',d.holiday_title?'جمعه — '+d.holiday_title:'جمعه');else if(d.is_holiday)cells[7].setAttribute('title',d.holiday_title||'تعطیل');});}
function start(){fix();var root=document.querySelector('#root')||document.body;if(!root)return;new MutationObserver(function(){fix();}).observe(root,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else setTimeout(start,0);
})();