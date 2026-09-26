/* خطیار — runtime guard for report formatting, build identity and legacy icon fallback */
(function(){
'use strict';
/* Capture the browser-native fetch before feature patches wrap window.fetch. */
try{if(!window.__KHATYAR_NATIVE_FETCH__&&typeof window.fetch==='function')window.__KHATYAR_NATIVE_FETCH__=window.fetch.bind(window);}catch(_){}
var PATCH='2026-09-27-v225';
window.__KHATYAR_PANEL_RUNTIME_PATCH__=PATCH;
try{var old=console.log;console.log=function(){try{var a=[].slice.call(arguments),s=String(a[0]||'');if(s.indexOf('PANEL BUILD:')===0&&s.indexOf('RUNTIME PATCH:')<0)a[0]=s+' | RUNTIME PATCH: '+PATCH;return old.apply(console,a);}catch(e){return old.apply(console,arguments);}};}catch(e){}
function fix(v){return String(v==null?'':v).replace(/([0-9۰-۹])[٬,](?=[0-9۰-۹])/g,'$1').replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d);});}
function iconFallback(e){try{var t=e&&e.target;if(!t||t.tagName!=='IMG')return;var src=String(t.getAttribute('src')||'');var fallback='';if(src.indexOf('/assets/icons3d/radio-tower.png')!==-1)fallback='/assets/icons3d/activity-wave.png';else if(src.indexOf('/assets/icons3d/school-service.png')!==-1)fallback='/assets/icons3d/checklist.png';else return;if(t.dataset.khIconFallback==='1')return;t.dataset.khIconFallback='1';e.stopImmediatePropagation();t.src=fallback;}catch(_){} }
document.addEventListener('error',iconFallback,true);
function scan(){document.querySelectorAll('table.khar-real-attendance-report, .khar-real-attendance-report, .khar-attendance-person-info').forEach(function(root){var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false),n=[];while(w.nextNode())n.push(w.currentNode);n.forEach(function(x){var p=x.parentElement,t=(p&&p.tagName||'').toLowerCase();if(t!=='script'&&t!=='style'&&t!=='input'&&t!=='textarea'&&t!=='select'&&t!=='option'){var q=fix(x.nodeValue);if(q!==x.nodeValue)x.nodeValue=q;}});});}
function start(){scan();[100,300,700,1200,2000,3500,5000].forEach(function(t){setTimeout(scan,t);});if(document.body)new MutationObserver(function(){setTimeout(scan,20);}).observe(document.body,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
