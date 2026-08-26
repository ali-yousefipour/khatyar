/* نسخه سامانه + بارگذارهای مشترک Web/Admin */
(function(){
'use strict';
const V='1.3.73';
function load(src,key){if(document.querySelector('script['+key+']'))return;const s=document.createElement('script');s.src=src;s.setAttribute(key,'1');s.defer=true;document.head.appendChild(s)}
function mount(){
  let host=document.getElementById('kh-version-badge-host');
  if(!host){
    host=document.createElement('div');
    host.id='kh-version-badge-host';
    host.setAttribute('aria-label','نسخه سامانه');
    host.style.cssText='position:fixed;right:12px;bottom:10px;z-index:2147483000;pointer-events:none;margin:0;padding:6px 10px;border-radius:9px;background:#f4f6fb;color:#667085;border:1px solid #e4e9f2;font:600 10px Vazirmatn,Tahoma;direction:rtl;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04)';
    document.body.appendChild(host);
  }
  host.textContent='نسخه '+V;
  load('assets/persian-date-picker.js?v='+V,'data-kh-jdp-loader');
  load('assets/persian-date-fix.js?v='+V,'data-kh-jdp-fix');
  load('assets/station-tabs-admin.js?v='+V,'data-kh-station-tabs');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
[500,1500,3000].forEach(x=>setTimeout(mount,x));
})();
