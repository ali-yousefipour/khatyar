/* Shared version badge. */
(function(){
 'use strict';
 var V='1.3.91';
 function mount(){var host=document.getElementById('kh-version-badge-host');if(host)host.textContent='نسخه '+V;}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
