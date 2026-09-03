/* Shared version badge + attendance endpoint guard. */
(function(){
'use strict';
var V='1.3.83';
function mount(){var host=document.getElementById('kh-version-badge-host');if(host)host.textContent='نسخه '+V;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
if(window.__khatyarAttendanceEndpointFix)return;window.__khatyarAttendanceEndpointFix=true;
function rewrite(url){var s=String(url||'');return /\/api\/admin\/attendance-report(?:\?|$)/.test(s)?s.replace('/api/admin/attendance-report','/api/admin-attendance-report-safe.php'):s;}
if(window.fetch){var nativeFetch=window.fetch;window.fetch=function(input,init){var u=typeof input==='string'?input:(input&&input.url)||'';var nu=rewrite(u);if(nu!==u){if(typeof input==='string')input=nu;else if(window.Request)input=new Request(nu,input);}return nativeFetch.call(this,input,init);};}
if(window.XMLHttpRequest){var open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){arguments[1]=rewrite(url);return open.apply(this,arguments);};}
})();
