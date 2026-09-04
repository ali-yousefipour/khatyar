/* خطیار — صحت‌سنجی حضور: اصلاح ستون‌ها بدون observer دائمی */
(function(){
  'use strict';
  var FA_DIGITS='۰۱۲۳۴۵۶۷۸۹';
  function faDigits(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA_DIGITS[d];});}
  function norm(v){return String(v||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
  function findTable(){return Array.from(document.querySelectorAll('table')).find(function(t){var h=norm(t.innerText||'');return / نیرو|نام نیرو/.test(h)&&/موقعیت/.test(h)&&/تصاویر/.test(h)&&/تاریخ و زمان انجام|زمان ثبت/.test(h);});}
  function fixTable(table){
    if(!table)return false;
    var headerRow=table.tHead&&table.tHead.rows[0]||table.querySelector('thead tr');
    if(!headerRow)return false;
    var headers=Array.from(headerRow.cells).map(function(c){return norm(c.textContent);});
    var dateIndex=headers.findIndex(function(h){return h==='تاریخ';});
    var registeredIndex=headers.findIndex(function(h){return h==='تاریخ و زمان انجام'||h==='زمان ثبت (تهران)'||h==='زمان ثبت تهران';});
    var locationIndex=headers.findIndex(function(h){return h==='موقعیت'||h.indexOf('موقعیت')===0;});
    var imagesIndex=headers.findIndex(function(h){return h==='تصاویر'||h.indexOf('تصاویر')===0;});
    var personnelIndex=headers.findIndex(function(h){return h==='نیرو'||h==='نام نیرو';});
    if(personnelIndex<0||locationIndex<0||imagesIndex<0||registeredIndex<0)return false;
    if(dateIndex>=0){Array.from(table.rows).forEach(function(row){if(row.cells[dateIndex])row.deleteCell(dateIndex);});if(registeredIndex>dateIndex)registeredIndex--;}
    var h2=table.tHead&&table.tHead.rows[0]||table.querySelector('thead tr');
    if(h2&&h2.cells[registeredIndex])h2.cells[registeredIndex].textContent='تاریخ و زمان انجام';
    Array.from(table.rows).forEach(function(row){var cell=row.cells[registeredIndex];if(!cell)return;if(row.parentElement&&row.parentElement.tagName==='THEAD')cell.textContent='تاریخ و زمان انجام';else cell.textContent=faDigits(cell.textContent);});
    table.dataset.khatyarVerificationColumnsFixed='1';
    return true;
  }
  function start(){var tries=0,max=8;function run(){var t=findTable();if(fixTable(t)||tries++>=max)return;setTimeout(run,250);}run();}
  function rerun(){setTimeout(function(){var t=findTable();if(t&&!t.dataset.khatyarVerificationColumnsFixed)fixTable(t);},0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('khatyar:attendance-report-updated',rerun);
})();