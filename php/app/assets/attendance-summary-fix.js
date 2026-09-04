/* گزارش تردد پرسنل — اصلاح نمایش زمان بدون MutationObserver یا اسکن مداوم DOM */
(function(){
'use strict';
var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA[d];});}
function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function convertText(n){if(!n||n.nodeType!==3)return;var s=n.nodeValue||'';if(!/[0-9]{1,4}:[0-9]{2}/.test(s))return;var p=n.parentElement;if(!p||p.closest('script,style,textarea,input'))return;n.nodeValue=s.replace(/[0-9]{1,4}:[0-9]{2}/g,function(x){return fa(x);});}
function scan(root){if(!root)return;var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(convertText);}
function mark(root){var scope=root||document;if(!scope.querySelectorAll)return;scope.querySelectorAll('table').forEach(function(t){var h=norm(t.innerText||'');if(/حضور کل/.test(h)&&/حضور در شیفت/.test(h)&&/کسری کار/.test(h)&&/شب کاری/.test(h)){t.classList.add('khatyar-attendance-report');if(t.parentNode)t.parentNode.classList.add('khatyar-attendance-report');}});}
function fix(){var t=document.querySelector('table.khar-real-attendance-report');if(!t){mark(document);t=document.querySelector('table.khar-real-attendance-report');}if(t)scan(t);}
var st=document.createElement('style');st.textContent='.khatyar-attendance-report{direction:rtl!important;text-align:right!important}.khatyar-attendance-report table{direction:rtl!important}.khatyar-attendance-report th,.khatyar-attendance-report td{vertical-align:middle!important}.khatyar-attendance-report .khatyar-time{direction:rtl!important;unicode-bidi:plaintext!important}';document.head.appendChild(st);
if(window.addEventListener)window.addEventListener('khatyar:attendance-report-updated',fix);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else setTimeout(fix,0);
})();
