/* خطیار — نمایش ایمن اعداد فارسی؛ بدون دستکاری مقدار کنترل‌های React */
(function(){
  'use strict';
  var FA='۰۱۲۳۴۵۶۷۸۹';
  var MOJI=/[ÛÙÃÂ]/;

  function repairMojibake(v){
    var s=String(v==null?'':v);
    if(!MOJI.test(s)) return s;
    try{
      var repaired=decodeURIComponent(escape(s));
      return repaired.indexOf('\ufffd')>=0?s:repaired;
    }catch(e){return s;}
  }
  function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA.charAt(Number(d));});}
  function stripThousands(v){return String(v==null?'':v).replace(/([0-9۰-۹])[٬,](?=[0-9۰-۹])/g,'$1');}
  function fixString(v){return fa(stripThousands(repairMojibake(v)));}
  function skip(el){
    if(!el)return true;
    var t=(el.tagName||'').toLowerCase();
    return t==='script'||t==='style'||t==='textarea'||t==='input'||t==='select'||t==='option'||t==='pre'||t==='code';
  }
  function fixText(n){
    if(!n||n.nodeType!==3||skip(n.parentElement))return;
    var a=n.nodeValue||'',b=fixString(a);
    if(a!==b)n.nodeValue=b;
  }
  function scan(root){
    if(!root)return;
    if(root.nodeType===3){fixText(root);return;}
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false),nodes=[];
    while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(fixText);
  }
  function start(){
    scan(document);
    var target=document.body||document.documentElement;if(!target)return;
    var queued=false;
    new MutationObserver(function(ms){
      if(queued)return;queued=true;
      setTimeout(function(){
        queued=false;
        ms.forEach(function(m){
          if(m.type==='characterData')fixText(m.target);
          Array.prototype.forEach.call(m.addedNodes||[],function(n){
            if(n.nodeType===3)fixText(n);
            else if(n.nodeType===1&&!skip(n))scan(n);
          });
        });
      },20);
    }).observe(target,{subtree:true,childList:true,characterData:true});
  }
  window.KhatyarNumberFormat={fa:fa,stripThousands:stripThousands,repairMojibake:repairMojibake,fixString:fixString,scan:scan};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
