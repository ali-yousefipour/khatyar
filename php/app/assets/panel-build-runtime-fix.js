/* خطیار — runtime guard for panel build/cache identity and dynamic report formatting */
(function(){
'use strict';
var BUILD='2026-09-03-v220';
window.__KHATYAR_PANEL_BUILD__=BUILD;
try{
  var old=console.log;
  console.log=function(){
    try{
      var a=[].slice.call(arguments),s=String(a[0]||'');
      if(s.indexOf('PANEL BUILD:')===0){a[0]='PANEL BUILD: '+BUILD+' (attendance-ui-stability)';}
      return old.apply(console,a);
    }catch(e){return old.apply(console,arguments);}
  };
}catch(e){}
function fix(v){return String(v==null?'':v).replace(/([0-9۰-۹])[٬,](?=[0-9۰-۹])/g,'$1').replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d);});}
function scan(){
  document.querySelectorAll('table.khar-real-attendance-report, .khar-real-attendance-report, .khar-attendance-person-info').forEach(function(root){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false),n=[];while(w.nextNode())n.push(w.currentNode);
    n.forEach(function(x){var p=x.parentElement,t=(p&&p.tagName||'').toLowerCase();if(t!=='script'&&t!=='style'&&t!=='input'&&t!=='textarea'){var q=fix(x.nodeValue);if(q!==x.nodeValue)x.nodeValue=q;}});
  });
}
function start(){scan();[100,300,700,1200,2000,3500,5000].forEach(function(t){setTimeout(scan,t);});if(document.body)new MutationObserver(function(){setTimeout(scan,20);}).observe(document.body,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
