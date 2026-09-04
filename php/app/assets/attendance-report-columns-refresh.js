/* خطیار — refresh layer؛ بدون MutationObserver و setInterval */
(function(){'use strict';
if(window.addEventListener){window.addEventListener('khatyar:attendance-report-updated',function(){
  var t=document.querySelector('table[data-kc-v2],table.khar-real-attendance-report');
  if(t)delete t.dataset.kcV2;
});}
})();
