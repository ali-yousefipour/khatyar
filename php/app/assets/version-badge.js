/* Shared version badge. The version is read from panel.html. */
(function(){
 'use strict';
 function mount(){
  var host=document.getElementById('kh-version-badge-host');
  if(!host) return;
  var text=(host.textContent||'').trim();
  var match=text.match(/نسخه\s+([0-9]+(?:\.[0-9]+)*)/);
  if(!match) return;
  host.textContent='نسخه '+match[1];
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
