/* خطیار — خروجی استاندارد XLSX برای گزارش تردد و کارکرد پرسنل؛ تولید نهایی در Backend */
(function(){
'use strict';
var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
function norm(v){return String(v==null?'':v).replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function days(data){if(!data||typeof data!=='object')return [];if(Array.isArray(data.days))return data.days;if(data.data&&Array.isArray(data.data.days))return data.data.days;if(Array.isArray(data.rows))return data.rows;return [];}
function friday(d){return !!(d&&((d.is_friday===true)||norm(d.weekday)==='جمعه'||d.weekday_index===6));}
function safeName(s){return norm(s).replace(/[\\/:*?"<>|]/g,'-').slice(0,80)||'گزارش';}
function token(){try{return localStorage.token||localStorage.access_token||'';}catch(e){return '';}}
async function backendExport(type,data,name){
  var r=await fetch('/api/admin-attendance-xlsx.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({type:type,data:data})});
  if(!r.ok){var j=await r.json().catch(function(){return{};});throw new Error(j.error||j.message||'تولید فایل Excel ناموفق بود');}
  var blob=await r.blob();var cd=r.headers.get('Content-Disposition')||'';var m=cd.match(/filename="?([^";]+)"?/i);var fn=m&&m[1]?m[1]:safeName(name)+'.xlsx';
  var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function button(text,cls){var b=document.createElement('button');b.type='button';b.className='khatyar-xlsx-btn '+(cls||'');b.innerHTML='<span aria-hidden="true">▣</span> '+text;return b;}
function addAttendance(){var data=window.__khatyarAttendancePayload;if(!data||!days(data).length)return;var tables=Array.from(document.querySelectorAll('table')).filter(function(t){return /حضور کل/.test(norm(t.innerText||''))&&/شب کاری/.test(norm(t.innerText||''));});tables.forEach(function(t){var host=t.parentElement;if(!host||host.querySelector('.khatyar-xlsx-attendance'))return;var b=button('خروجی XLSX گزارش تردد','khatyar-xlsx-attendance');b.onclick=async function(){try{var name='گزارش تردد پرسنل'+(data.user&&data.user.name?' - '+data.user.name:'');b.disabled=true;await backendExport('attendance',data,name);}catch(e){alert(e.message||'خطا در تولید فایل Excel');}finally{b.disabled=false;}};host.insertBefore(b,t);});}
function addWork(){var data=window.__khatyarWorkSummaryPayload;if(!data||!days(data).length)return;var root=document.querySelector('#root');if(!root)return;var candidates=Array.from(root.querySelectorAll('table,section,div')).filter(function(x){var t=norm(x.innerText||'');return /کارکرد/.test(t)&&(/ماهانه/.test(t)||/جمعه/.test(t)||/تعطیل/.test(t));});var anchor=candidates[candidates.length-1];if(!anchor||!anchor.parentElement)return;var host=anchor.parentElement;if(host.querySelector('.khatyar-xlsx-work'))return;var b=button('خروجی XLSX گزارش کارکرد','khatyar-xlsx-work');b.onclick=async function(){try{var name='گزارش کارکرد پرسنل'+(data.user&&data.user.name?' - '+data.user.name:'');b.disabled=true;await backendExport('work',data,name);}catch(e){alert(e.message||'خطا در تولید فایل Excel');}finally{b.disabled=false;}};host.insertBefore(b,anchor);}
function run(){addAttendance();addWork();}
var st=document.createElement('style');st.textContent='.khatyar-xlsx-btn{display:inline-flex;align-items:center;gap:7px;margin:0 0 10px 8px;padding:9px 14px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;color:#344054;font:700 13px Vazirmatn,Tahoma;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.05)}.khatyar-xlsx-btn:hover{box-shadow:0 3px 10px rgba(16,24,40,.10);transform:translateY(-1px)}.khatyar-xlsx-btn:disabled{opacity:.6;cursor:wait}';document.head.appendChild(st);
var ob=new MutationObserver(run);if(document.body)ob.observe(document.body,{childList:true,subtree:true});setInterval(run,1000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
