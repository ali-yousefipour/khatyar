/* خطیار — اصلاح نمایش فهرست انتخاب پرسنل */
(function(){
'use strict';
function isPersonnelList(el){
  if(!el)return false;
  var t=(el.innerText||el.textContent||'').replace(/\s+/g,' ');
  return /انتخاب پرسنل/.test(t) || (/مدیر کل/.test(t) && /رضا معلم زاده/.test(t));
}
function apply(root){
  root=root||document;
  var selects=root.querySelectorAll?root.querySelectorAll('select'):[];
  Array.prototype.forEach.call(selects,function(s){
    var t=Array.prototype.map.call(s.options||[],function(o){return o.textContent||'';}).join(' ');
    if(/مدیر کل/.test(t) || /رضا معلم زاده/.test(t)){
      s.classList.add('kh-personnel-select');
      Array.prototype.forEach.call(s.options||[],function(o){
        o.style.padding='10px 12px';
        o.style.lineHeight='1.9';
        o.style.minHeight='40px';
      });
    }
  });
  var nodes=root.querySelectorAll?root.querySelectorAll('[role="option"],.dropdown-item,.select-option,.option,.MuiMenuItem-root'):[];
  Array.prototype.forEach.call(nodes,function(n){
    var p=n.parentElement;
    if(isPersonnelList(p)||isPersonnelList(n.closest('[role="listbox"],.dropdown-menu,.select-menu,.options'))){
      n.classList.add('kh-personnel-option');
    }
  });
}
function css(){
  if(document.getElementById('kh-personnel-selector-css'))return;
  var s=document.createElement('style');s.id='kh-personnel-selector-css';
  s.textContent='.kh-personnel-select{min-height:42px!important;line-height:1.9!important;padding:7px 12px!important}.kh-personnel-select option{padding:9px 12px!important;line-height:1.9!important;white-space:normal!important}.kh-personnel-option{display:flex!important;align-items:center!important;min-height:40px!important;padding:9px 12px!important;line-height:1.8!important;white-space:normal!important;border-bottom:1px solid #eef2f6!important}.kh-personnel-option:last-child{border-bottom:0!important}';
  document.head.appendChild(s);
}
function start(){css();apply(document);var ob=new MutationObserver(function(ms){ms.forEach(function(m){(m.addedNodes||[]).forEach(function(n){if(n.nodeType===1)apply(n);});});});if(document.body)ob.observe(document.body,{subtree:true,childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
