/* خطیار — صحت‌سنجی حضور: حذف ستون تاریخ، تغییر عنوان و یکدست‌سازی اعداد تاریخ/زمان */
(function(){
  'use strict';

  var FA_DIGITS='۰۱۲۳۴۵۶۷۸۹';
  function faDigits(v){
    return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA_DIGITS[d];});
  }

  function norm(v){
    return String(v||'')
      .replace(/[يى]/g,'ی')
      .replace(/[ك]/g,'ک')
      .replace(/[\u200c\u200e\u200f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function findRegisteredCell(table){
    var headerRow=table.tHead && table.tHead.rows[0];
    if(!headerRow) headerRow=table.querySelector('thead tr');
    if(!headerRow) return -1;
    var headers=Array.from(headerRow.cells).map(function(cell){return norm(cell.textContent);});
    return headers.findIndex(function(h){return h==='تاریخ و زمان انجام' || h==='زمان ثبت (تهران)' || h==='زمان ثبت تهران';});
  }

  function normalizeRegisteredColumn(table,index){
    if(index<0) return;
    Array.from(table.rows).forEach(function(row){
      var cell=row.cells[index];
      if(!cell) return;
      if(row.parentElement && row.parentElement.tagName==='THEAD'){
        cell.textContent='تاریخ و زمان انجام';
        return;
      }
      // فقط ستون «تاریخ و زمان انجام» تبدیل می‌شود؛ مختصات نقشه و سایر اعداد نباید تغییر کنند.
      cell.textContent=faDigits(cell.textContent);
    });
  }

  function fixTable(table){
    if(!table) return false;
    var headerRow=table.tHead && table.tHead.rows[0];
    if(!headerRow) headerRow=table.querySelector('thead tr');
    if(!headerRow) return false;

    var headers=Array.from(headerRow.cells).map(function(cell){return norm(cell.textContent);});
    var dateIndex=headers.findIndex(function(h){return h==='تاریخ';});
    var registeredIndex=headers.findIndex(function(h){return h==='تاریخ و زمان انجام' || h==='زمان ثبت (تهران)' || h==='زمان ثبت تهران';});
    var locationIndex=headers.findIndex(function(h){return h==='موقعیت' || h.indexOf('موقعیت')===0;});
    var imagesIndex=headers.findIndex(function(h){return h==='تصاویر' || h.indexOf('تصاویر')===0;});
    var personnelIndex=headers.findIndex(function(h){return h==='نیرو' || h==='نام نیرو';});

    if(personnelIndex<0 || locationIndex<0 || imagesIndex<0 || registeredIndex<0) return false;

    if(dateIndex>=0){
      Array.from(table.rows).forEach(function(row){
        if(row.cells[dateIndex]) row.deleteCell(dateIndex);
      });
      if(registeredIndex>dateIndex) registeredIndex--;
    }

    var newHeader=table.tHead && table.tHead.rows[0] || table.querySelector('thead tr');
    if(newHeader && newHeader.cells[registeredIndex]){
      newHeader.cells[registeredIndex].textContent='تاریخ و زمان انجام';
    }

    normalizeRegisteredColumn(table,registeredIndex);
    table.dataset.khatyarVerificationColumnsFixed='1';
    table.dataset.khatyarVerificationRegisteredIndex=String(registeredIndex);
    return true;
  }

  function resync(table){
    if(!table) return;
    var index=Number(table.dataset.khatyarVerificationRegisteredIndex);
    if(!Number.isInteger(index) || index<0) index=findRegisteredCell(table);
    if(index>=0) normalizeRegisteredColumn(table,index);
  }

  function scan(root){
    var tables=Array.from((root||document).querySelectorAll('table'));
    tables.forEach(function(table){
      if(!fixTable(table)) resync(table);
    });
  }

  function start(){
    scan(document);
    var target=document.querySelector('#root')||document.body;
    if(!target) return;
    var queued=false;
    var observer=new MutationObserver(function(){
      if(queued) return;
      queued=true;
      requestAnimationFrame(function(){queued=false;scan(target);});
    });
    observer.observe(target,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else setTimeout(start,0);
})();
