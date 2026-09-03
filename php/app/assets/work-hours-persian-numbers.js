/* گزارش شیفت و کارکرد — تبدیل فقط مقادیر زمان/مدت، بدون تخریب HTML */
(function(){
'use strict';
var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
function fa(v){return String(v).replace(/[0-9]/g,function(d){return FA[d];});}
function fixTextNode(n){if(!n||n.nodeType!==3)return;var s=n.nodeValue||'';if(!/\b\d{1,4}:\d{2}\b/.test(s))return;var p=n.parentElement;if(!p||p.closest('script,style,textarea'))return;var r=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);if(r.currentNode===n||true)n.nodeValue=s.replace(/\b(\d{1,4}:\d{2})\b/g,function(x){return fa(x);});}
function scan(root){root=root||document;var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())nodes.push(w.currentNode);nodes.forEach(fixTextNode);}
function start(){scan(document);var ob=new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')fixTextNode(m.target);(m.addedNodes||[]).forEach(function(n){if(n.nodeType===3)fixTextNode(n);else if(n.nodeType===1)scan(n);});});});if(document.body)ob.observe(document.body,{subtree:true,childList:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
