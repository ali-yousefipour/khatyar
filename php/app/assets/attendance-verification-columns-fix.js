/* خطیار — صحت‌سنجی حضور: حذف ستون تاریخ و تغییر عنوان زمان ثبت */
(function(){
  'use strict';

  function norm(v){
    return String(v||'')
      .replace(/[يى]/g,'ی')
      .replace(/[ك]/g,'ک')
      .replace(/[\u200c\u200e\u200f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function fixTable(table){
    if(!table || table.dataset.khatyarVerificationColumnsFixed==='1') return false;
    var headerRow=table.tHead && table.tHead.rows[0];
    if(!headerRow) headerRow=table.querySelector('thead tr');
    if(!headerRow) return false;

    var headers=Array.from(headerRow.cells).map(function(cell){return norm(cell.textContent);});
    var dateIndex=headers.findIndex(function(h){return h==='تاریخ';});
    var registeredIndex=headers.findIndex(function(h){return h==='زمان ثبت (تهران)' || h==='زمان ثبت تهران';});
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

    table.dataset.khatyarVerificationColumnsFixed='1';
    return true;
  }

  function scan(root){
    var tables=Array.from((root||document).querySelectorAll('table'));
    tables.forEach(fixTable);
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
    observer.observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else setTimeout(start,0);
})();
