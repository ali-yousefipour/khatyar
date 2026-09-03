/* خطیار — نمایش یکنواخت اعداد فارسی و حذف قطعی جداکننده هزارگان */
(function(){
  'use strict';
  var FA='۰۱۲۳۴۵۶۷۸۹';
  function fa(v){
    return String(v == null ? '' : v).replace(/[0-9]/g,function(d){ return FA.charAt(Number(d)); });
  }
  function stripThousands(v){
    return String(v == null ? '' : v).replace(/([0-9۰-۹])[٬,](?=[0-9۰-۹])/g,'$1');
  }
  function fixString(v){ return fa(stripThousands(v)); }
  function shouldSkip(el){
    if(!el) return true;
    var tag=(el.tagName||'').toLowerCase();
    return tag==='script'||tag==='style'||tag==='textarea'||tag==='pre'||tag==='code';
  }
  function fixText(node){
    if(!node || node.nodeType!==3) return;
    var parent=node.parentElement;
    if(shouldSkip(parent)) return;
    var old=node.nodeValue||'';
    var next=fixString(old);
    if(next!==old) node.nodeValue=next;
  }
  function fixControl(el){
    if(!el || !el.tagName) return;
    var tag=el.tagName.toLowerCase();
    if(tag==='textarea'||tag==='script'||tag==='style'||tag==='pre'||tag==='code') return;
    if(tag==='select'){
      Array.prototype.forEach.call(el.options||[],function(o){
        var old=o.textContent||'', next=fixString(old);
        if(next!==old) o.textContent=next;
      });
      return;
    }
    if(tag==='input'){
      var type=(el.type||'').toLowerCase();
      if(type==='date'||type==='time'||type==='datetime-local'||type==='file') return;
      var old=el.value||'', next=fixString(old);
      if(next!==old) el.value=next;
    }
  }
  function scan(root){
    if(!root) return;
    if(root.nodeType===3){ fixText(root); return; }
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false), nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(fixText);
    if(root.querySelectorAll){
      Array.prototype.forEach.call(root.querySelectorAll('input,select'),fixControl);
    }
  }
  function start(){
    scan(document);
    var target=document.body||document.documentElement;
    if(!target) return;
    var queued=false;
    var observer=new MutationObserver(function(mutations){
      if(queued) return;
      queued=true;
      setTimeout(function(){
        queued=false;
        mutations.forEach(function(m){
          if(m.type==='characterData') fixText(m.target);
          if(m.addedNodes) Array.prototype.forEach.call(m.addedNodes,function(n){
            if(n.nodeType===3) fixText(n);
            else if(n.nodeType===1 && !shouldSkip(n)) scan(n);
          });
        });
      },25);
    });
    observer.observe(target,{subtree:true,childList:true,characterData:true});
  }
  window.KhatyarNumberFormat={fa:fa,stripThousands:stripThousands,fixString:fixString};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
