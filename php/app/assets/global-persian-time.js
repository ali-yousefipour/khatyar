/* خطیار — اصلاح سراسری نمایش ساعت و مدت زمان در کل پنل */
(function(){
'use strict';
var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
var DIG='0-9۰-۹';
function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA[d];});}
function fixString(s){
  return String(s==null?'':s).replace(new RegExp('(^|[^'+DIG+'])((?:[0-9۰-۹]{1,4}):(?:[0-9۰-۹]{2}))(?=$|[^'+DIG+'])','g'),function(_,p,t){return p+fa(t);});
}
function fixText(n){
  if(!n||n.nodeType!==3)return;
  var p=n.parentElement;
  if(!p||p.closest('script,style,textarea,code,pre'))return;
  var s=n.nodeValue||'', x=fixString(s);
  if(x!==s)n.nodeValue=x;
}
function fixValue(el){
  if(!el||!('value' in el))return;
  if(el.tagName==='TEXTAREA')return;
  var v=String(el.value||'');
  if(/(?:^|[^0-9۰-۹])(?:[0-9۰-۹]{1,4}):(?:[0-9۰-۹]{2})(?:$|[^0-9۰-۹])/.test(v)){
    var x=fixString(v);if(x!==v)el.value=x;
  }
}
function scan(root){
  root=root||document;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];
  while(w.nextNode())a.push(w.currentNode);
  a.forEach(fixText);
  if(root.querySelectorAll)root.querySelectorAll('input,select').forEach(function(el){
    if(el.tagName==='SELECT')Array.prototype.forEach.call(el.options||[],function(o){o.textContent=fixString(o.textContent);});
    else fixValue(el);
  });
}
function start(){
  scan(document);
  var timer=0;
  var ob=new MutationObserver(function(ms){
    if(timer)clearTimeout(timer);
    timer=setTimeout(function(){
      ms.forEach(function(m){
        if(m.type==='characterData')fixText(m.target);
        (m.addedNodes||[]).forEach(function(n){
          if(n.nodeType===3)fixText(n);else if(n.nodeType===1)scan(n);
        });
      });
    },20);
  });
  if(document.body)ob.observe(document.body,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
