/* گزارش تردد پرسنل — فقط اصلاح نمایش داده‌های رندرشده، بدون تزریق اطلاعات شخص قبلی */
(function(){
'use strict';
var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
function fa(v){return String(v).replace(/[0-9]/g,function(d){return FA[d];});}
function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function mark(){document.querySelectorAll('body *').forEach(function(el){var t=norm(el.textContent);if(!t)return;if(/لیست ورود و خروج|گزارش تردد|گزارش حضور|شیفت و کارکرد/.test(t)){var box=el.closest('.card,section,article,.modal,.modal-content')||el;box.classList.add('khatyar-attendance-report');}});}
function convertText(n){if(!n||n.nodeType!==3)return;var s=n.nodeValue||'';if(!/\b\d{1,4}:\d{2}\b/.test(s))return;var p=n.parentElement;if(!p||p.closest('script,style,textarea'))return;n.nodeValue=s.replace(/\b\d{1,4}:\d{2}\b/g,function(x){return fa(x);});}
function scan(root){var w=document.createTreeWalker(root||document,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(convertText);}
function start(){mark();scan(document);var ob=new MutationObserver(function(ms){var need=false;ms.forEach(function(m){if(m.type==='characterData')convertText(m.target);if(m.addedNodes&&m.addedNodes.length){need=true;m.addedNodes.forEach(function(n){if(n.nodeType===3)convertText(n);else if(n.nodeType===1)scan(n);});}});if(need)mark();});if(document.body)ob.observe(document.body,{childList:true,subtree:true,characterData:true});}
var st=document.createElement('style');st.textContent='.khatyar-attendance-report{direction:rtl!important;text-align:right!important}.khatyar-attendance-report table{direction:rtl!important}.khatyar-attendance-report th,.khatyar-attendance-report td{vertical-align:middle!important}.khatyar-attendance-report .khatyar-time{direction:rtl!important;unicode-bidi:plaintext!important}';document.head.appendChild(st);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
