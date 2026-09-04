/* خطیار — فقط دکمهٔ کمکی تکراری را حذف می‌کند؛ دکمهٔ اصلی سامانه حفظ می‌شود. */
(function(){'use strict';function run(){document.querySelectorAll('button.khatyar-xlsx-attendance').forEach(function(b){b.remove();});}if(document.body){new MutationObserver(run).observe(document.body,{childList:true,subtree:true});run();}else document.addEventListener('DOMContentLoaded',run,{once:true});})();
