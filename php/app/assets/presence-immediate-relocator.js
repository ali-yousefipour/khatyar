/* محل صحیح «ارسال صحت‌سنجی فوری»: کنار بخش مشاهده نتایج صحت‌سنجی، نه تنظیمات. */
(function(){
'use strict';
function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
function findHost(){
  const exact=['مشاهده نتایج صحت‌سنجی','مشاهده نتایج صحت سنجی','نتایج صحت‌سنجی حضور','نتایج صحت سنجی حضور'];
  const nodes=[...document.querySelectorAll('h1,h2,h3,h4,h5,.card,.panel,.section,.module,.box,button,a')];
  return nodes.find(n=>{const t=norm(n.textContent);return exact.some(x=>t===x||t.includes(x));})||null;
}
function move(){
  const card=document.getElementById('khatyar-immediate-presence');
  const host=findHost();
  if(!card||!host||!host.parentNode)return;
  const container=host.closest('.panel,.card,.section,.module,.box')||host.parentNode;
  if(card.parentNode!==container || card.previousElementSibling!==host){
    container.appendChild(card);
  }
}
function start(){move();const ob=new MutationObserver(move);if(document.body)ob.observe(document.body,{childList:true,subtree:true});setInterval(move,1500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
