/* خطیار — اصلاح نهایی مودال اصلاح ساعت: حذف کامل AM/PM و نمایش ۲۴ ساعته فارسی */
(function(){
'use strict';
var FA='۰۱۲۳۴۵۶۷۸۹',EN='0123456789';
function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(x){return FA[x.charCodeAt(0)-48];});}
function en(v){return String(v==null?'':v).replace(/[۰-۹]/g,function(x){return EN[FA.indexOf(x)];});}
function normalizeTime(input){
 if(!input)return;
 var raw=en(input.value||'').trim();
 var m=raw.match(/(\d{1,2}):(\d{1,2})/);
 if(m){
  var h=Math.max(0,Math.min(23,parseInt(m[1],10)||0));
  var mm=Math.max(0,Math.min(59,parseInt(m[2],10)||0));
  input.value=fa(String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0'));
 }else if(raw){input.value=fa(raw.replace(/[^0-9:]/g,''));}
 if(input.type!=='text'){
  try{input.type='text';}catch(e){}
 }
 input.setAttribute('type','text');
 input.setAttribute('inputmode','numeric');
 input.setAttribute('maxlength','5');
 input.setAttribute('dir','ltr');
 input.setAttribute('placeholder','۰۰:۰۰');
 input.setAttribute('pattern','[۰-۹0-9]{2}:[۰-۹0-9]{2}');
 input.style.fontFamily='Vazirmatn,Tahoma,sans-serif';
 input.style.direction='ltr';
 input.style.textAlign='center';
 input.style.fontVariantNumeric='normal';
}
function normalizeAll(){
 document.querySelectorAll('#khar-edit-v6 input,#khar-manual-v6 input,#khar-detail-v6 input,input[data-ma-in],input[data-ma-out]').forEach(normalizeTime);
 document.querySelectorAll('#khar-detail-v6 .khar-punch-card strong').forEach(function(x){
  var v=en(x.textContent||'').trim(),m=v.match(/^(\d{1,2}):(\d{1,2})$/);
  if(m){var h=Math.max(0,Math.min(23,+m[1])),mm=Math.max(0,Math.min(59,+m[2]));x.textContent=fa(String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0'));}
 });
}
function beforeSave(e){
 var b=e.target&&e.target.closest?e.target.closest('[data-khar-save],[data-khar-manual-save],[data-ma-save]'):null;
 if(!b)return;
 document.querySelectorAll('#khar-edit-v6 input,#khar-manual-v6 input,input[data-ma-in],input[data-ma-out]').forEach(function(x){x.value=en(x.value||'');});
}
function cleanDuplicateSettings(){
 var a=Array.from(document.querySelectorAll('button,a,[role="button"]')).filter(function(x){return /تنظیم\s*ستون/.test((x.textContent||'').replace(/\s+/g,' ').trim());});
 var keep=a.find(function(x){return x.classList.contains('khar-column-settings-v6');})||a[0];
 a.forEach(function(x){if(x!==keep)x.remove();});
}
function cleanExcelButtons(){
 document.querySelectorAll('button,a,[role="button"]').forEach(function(x){
  var t=(x.textContent||'').replace(/\s+/g,' ').trim();
  if(/خروجی\s*(XLSX|Excel)|Excel\s*۲۹|گزارش تردد.*ستونه/.test(t))x.remove();
 });
}
function interceptDownload(e){
 var b=e.target&&e.target.closest?e.target.closest('button,a,[role="button"]'):null;
 if(!b||!/دانلود\s*گزارش/.test((b.textContent||b.getAttribute('aria-label')||b.title||'').replace(/\s+/g,' ').trim()))return;
 var d=window.__khatyarAttendancePayload;
 if(!d||!window.XLSX||!XLSX.utils||!Array.isArray(d.days))return;
 e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();e.stopPropagation();
 var head=['تاریخ','روز هفته','ورود','خروج','محل ورود','محل خروج','حضور در شیفت','کسری کار','غیبت','جمع غیبت و کسری کار','شب کاری','اضافه کاری','موظفی','ماموریت','مرخصی استحقاقی','مرخصی استعلاجی','مرخصی بدون حقوق','مازاد حضور','کل حضور','اضافه کاری تعطیل','اضافه کاری جمعه','جمع اضافه کاری','اضافه کاری تعطیل و جمعه','جمعه کاری','روزکارکرد جمعه','تهاتر مازاد حضور','تهاتر کسری کار','اولین ورود','آخرین خروج'];
 var rows=[head];
 d.days.forEach(function(x){var p=Array.isArray(x.punches)?x.punches:[],ins=p.map(function(q){return q&&q.in||'';}).filter(Boolean),outs=p.map(function(q){return q&&q.out||'';}).filter(Boolean);rows.push([x.jdate||'',x.weekday||'',ins[0]||'',outs.length?outs[outs.length-1]:'',((p.find(function(q){return q&&q.in_station;})||{}).in_station)||'',((p.slice().reverse().find(function(q){return q&&q.out_station;})||{}).out_station)||'',x.in_shift||'00:00',x.shortage||'00:00',x.absent||0,x.absence_shortage||'00:00',x.night||'00:00',x.overtime||'00:00',x.expected||'00:00',x.mission||'00:00',x.annual_leave||'00:00',x.sick_leave||'00:00',x.unpaid_leave||'00:00',x.surplus||'00:00',x.worked||'00:00',x.holiday_overtime||'00:00',x.friday_overtime||'00:00',x.total_overtime||'00:00',x.holiday_friday_overtime||'00:00',x.friday_work||'00:00',x.friday_workday||0,x.adjusted_surplus||x.adjusted_ot||'00:00',x.adjusted_shortage||'00:00',x.first_in||ins[0]||'',x.last_out||(outs.length?outs[outs.length-1]:'')]);});
 var ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'گزارش تردد ۲۹ ستونه');XLSX.writeFile(wb,'گزارش تردد پرسنل - ۲۹ ستونه.xlsx');
}
document.addEventListener('click',beforeSave,true);
document.addEventListener('click',interceptDownload,true);
function tick(){normalizeAll();cleanDuplicateSettings();cleanExcelButtons();}
function start(){tick();var n=0,t=setInterval(function(){tick();if(++n>=100)clearInterval(t);},300);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
var css=document.createElement('style');css.textContent='#khar-edit-v6 .khar-edit-grid,#khar-manual-v6 .khar-edit-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important}#khar-edit-v6 .khar-edit-grid label,#khar-manual-v6 .khar-edit-grid label{display:flex!important;flex-direction:column!important;gap:7px!important}#khar-edit-v6 input,#khar-manual-v6 input,input[data-ma-in],input[data-ma-out]{font-family:Vazirmatn,Tahoma,sans-serif!important;direction:ltr!important;text-align:center!important;font-variant-numeric:normal!important}#khar-edit-v6 input[type=time],#khar-manual-v6 input[type=time]{appearance:none!important;-webkit-appearance:none!important}';document.head.appendChild(css);
})();