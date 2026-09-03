/* خطیار — لینک سراسری «ارسال صحت‌سنجی فوری»؛ مستقل از رندر پنل */
(function(){
  'use strict';
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function nav(){return document.querySelector('.nav,nav[role="navigation"],aside nav,aside');}
  function ensure(){
    var n=nav();if(!n)return;
    var a=document.querySelector('[data-khatyar-immediate-link]');
    if(!a){
      a=document.createElement('a');a.href='#';a.dataset.khatyarImmediateLink='1';a.textContent='⚡ ارسال صحت‌سنجی فوری';
      a.style.cssText='display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;';
      var anchor=Array.prototype.find.call(n.querySelectorAll('a,button'),function(x){return /صحت.?سنجی حضور/.test(norm(x.textContent));});
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(a,anchor.nextSibling);else n.appendChild(a);
      a.addEventListener('click',function(e){
        e.preventDefault();
        var card=document.getElementById('khatyar-immediate-presence');
        var tab=document.querySelector('#khatyar-presence-tabs [data-kpt="immediate"]');
        if(tab){tab.click();setTimeout(function(){card&&card.scrollIntoView({behavior:'smooth',block:'start'});},50);return;}
        var p=document.querySelector('#khatyar-immediate-presence');if(p){p.hidden=false;p.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    }
    a.style.display='block';
  }
  function run(){ensure();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,500);},{once:true});else setTimeout(run,500);
  var timer=0;if(document.documentElement)new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;run();},180);}).observe(document.documentElement,{childList:true,subtree:true});
})();
