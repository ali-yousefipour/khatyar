/* گزارش تردد پرسنل — اصلاح نمایش زمان بدون اسکن مداوم کل DOM */
(function(){
'use strict';
var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA[d];});}
function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function convertText(n){if(!n||n.nodeType!==3)return;var s=n.nodeValue||'';if(!/\b\d{1,4}:\d{2}\b/.test(s))return;var p=n.parentElement;if(!p||p.closest('script,style,textarea,input'))return;n.nodeValue=s.replace(/\b\d{1,4}:\d{2}\b/g,function(x){return fa(x);});}
function scan(root){var w=document.createTreeWalker(root||document,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(convertText);}
function mark(root){(root||document).querySelectorAll('table').forEach(function(t){var h=norm(t.innerText||'');if(/حضور کل/.test(h)&&/حضور در شیفت/.test(h)&&/کسری کار/.test(h)&&/شب کاری/.test(h)){t.classList.add('khatyar-attendance-report');var p=t.parentNode;if(p)p.classList.add('khatyar-attendance-report');}});}
function start(){mark(document);scan(document);var target=document.querySelector('#root')||document.body;if(!target)return;var queued=false;var ob=new MutationObserver(function(ms){if(queued)return;var nodes=[];ms.forEach(function(m){if(m.type==='characterData')convertText(m.target);if(m.addedNodes)Array.prototype.forEach.call(m.addedNodes,function(n){if(n.nodeType===1)nodes.push(n);else if(n.nodeType===3)convertText(n);});});if(nodes.length){queued=true;requestAnimationFrame(function(){queued=false;nodes.forEach(function(n){mark(n);scan(n);});});}});ob.observe(target,{childList:true,subtree:true,characterData:true});}
var st=document.createElement('style');st.textContent='.khatyar-attendance-report{direction:rtl!important;text-align:right!important}.khatyar-attendance-report table{direction:rtl!important}.khatyar-attendance-report th,.khatyar-attendance-report td{vertical-align:middle!important}.khatyar-attendance-report .khatyar-time{direction:rtl!important;unicode-bidi:plaintext!important}';document.head.appendChild(st);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else setTimeout(start,0);
})();
