/* خطیار — نمایش یکنواخت اعداد فارسی و حذف قطعی جداکننده هزارگان */
(function(){
  'use strict';
  var FA='۰۱۲۳۴۵۶۷۸۹';
  function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA.charAt(Number(d));});}
  function stripThousands(v){return String(v==null?'':v).replace(/([0-9۰-۹])[٬,](?=[0-9۰-۹])/g,'$1');}
  function fixString(v){return fa(stripThousands(v));}
  function skip(el){if(!el)return true;var t=(el.tagName||'').toLowerCase();return t==='script'||t==='style'||t==='textarea'||t==='pre'||t==='code';}
  function fixText(n){if(!n||n.nodeType!==3||skip(n.parentElement))return;var a=n.nodeValue||'',b=fixString(a);if(a!==b)n.nodeValue=b;}
  function fixControl(el){
    if(!el||skip(el))return;
    var t=el.tagName.toLowerCase();
    if(t==='select'){Array.prototype.forEach.call(el.options||[],function(o){var a=o.textContent||'',b=fixString(a);if(a!==b)o.textContent=b;});return;}
    if(t==='input'){var ty=(el.type||'').toLowerCase();if(ty==='date'||ty==='time'||ty==='datetime-local'||ty==='file')return;var a=el.value||'',b=fixString(a);if(a!==b)el.value=b;}
  }
  function scan(root){
    if(!root)return;
    if(root.nodeType===3){fixText(root);return;}
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false),nodes=[];
    while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(fixText);
    if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll('input,select'),fixControl);
  }
  function start(){
    scan(document);
    var target=document.body||document.documentElement;if(!target)return;
    var queued=false;
    new MutationObserver(function(ms){
      if(queued)return;queued=true;
      setTimeout(function(){queued=false;ms.forEach(function(m){if(m.type==='characterData')fixText(m.target);Array.prototype.forEach.call(m.addedNodes||[],function(n){if(n.nodeType===3)fixText(n);else if(n.nodeType===1&&!skip(n))scan(n);});});},20);
    }).observe(target,{subtree:true,childList:true,characterData:true});
    /* React ممکن است بعد از MutationObserver مقدار کنترل‌شده را دوباره بنویسد؛ این اسکن سبک آن را تثبیت می‌کند. */
    setInterval(function(){
      if(document.hidden)return;
      var root=document.getElementById('root')||document.body;
      if(root)scan(root);
    },1000);
  }
  window.KhatyarNumberFormat={fa:fa,stripThousands:stripThousands,fixString:fixString,scan:scan};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();