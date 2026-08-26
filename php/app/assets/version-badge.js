/* Shared version badge. Never inject scripts or mutate React-owned DOM. */
(function(){
'use strict';
const V='1.3.73';
function mount(){
  const host=document.getElementById('kh-version-badge-host');
  if(host) host.textContent='نسخه '+V;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
