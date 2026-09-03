/* محل صحیح «ارسال صحت‌سنجی فوری»: کنار بخش مشاهده نتایج صحت‌سنجی */
(function(){
  'use strict';
  function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
  function findHost(){
    var exact=['مشاهده نتایج صحت‌سنجی','مشاهده نتایج صحت سنجی','نتایج صحت‌سنجی حضور','نتایج صحت سنجی حضور'];
    var nodes=Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,.card,.panel,.section,.module,.box,button,a'));
    return nodes.find(function(n){var t=norm(n.textContent);return exact.some(function(x){return t===x||t.indexOf(x)>=0;});})||null;
  }
  function move(){
    var card=document.getElementById('khatyar-immediate-presence'),host=findHost();
    if(!card||!host||!host.parentNode)return;
    var container=host.closest('.panel,.card,.section,.module,.box')||host.parentNode;
    if(card.parentNode!==container||card.previousElementSibling!==host)container.appendChild(card);
  }
  function start(){move();if(document.body)new MutationObserver(move).observe(document.body,{childList:true,subtree:true});setInterval(move,1500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
