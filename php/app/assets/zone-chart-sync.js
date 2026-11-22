/* Region chart sync control: live regional graph, never modify the manual chart. */
(function(){
'use strict';
const boardSelector='.kh-region-board';
const token=()=>localStorage.getItem('token')||'';
const fa=value=>String(value).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[n]);
let zones=[],loading=false,lastFetch=0,updating=false;
function normalize(value){return String(value||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();}
async function api(path,options={}){
 const auth=token();if(!auth)throw Error('برای همسان‌سازی چارت ابتدا وارد سامانه شوید.');
 const response=await fetch('/api/admin/'+path,{...options,cache:'no-store',headers:{'Authorization':'Bearer '+auth,'Content-Type':'application/json',...(options.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok===false)throw Error(data.error||('خطای سرور: '+response.status));
 return data;
}
async function loadZones(){
 if(loading||Date.now()-lastFetch<45000)return;
 loading=true;
 try{const data=await api('zones');zones=Array.isArray(data)?data:(Array.isArray(data.zones)?data.zones:[]);lastFetch=Date.now();}
 catch(_){zones=[];lastFetch=Date.now()-40000;}
 finally{loading=false;}
}
function matchZone(card){
 // The real Zones component renders <h4><span>{zone.name}</span><span>action buttons</span></h4>.
 // Reading h4.textContent also includes button labels and never matches the zone.
 const title=card.querySelector(':scope > h4 > span:first-child');
 const name=normalize(title?.textContent);
 if(!name)return null;
 const exact=zones.filter(z=>normalize(z.name)===name);
 if(exact.length===1)return exact[0];
 // Never attach the control to the wrong zone if names are duplicated.
 return null;
}
function message(card,content,isError){
 let el=card.querySelector(':scope > .kh-chart-sync-status');
 if(!el){el=document.createElement('p');el.className='kh-chart-sync-status';el.setAttribute('role','status');card.prepend(el);}
 el.textContent=content;el.style.color=isError?'#a32424':'#076548';
}
async function synchronize(button,card,zone){
 if(button.disabled)return;
 const name=normalize(zone.name);
 if(!confirm('روابط چارت ذخیره‌شده برای نیروهای منطقه «'+name+'» و زیرمنطقه‌های آن، بر اساس مسئولان و سمت‌های فعلی جایگزین شوند؟\nروابط دستی همین نیروها بازنویسی می‌شوند؛ مناطق دیگر بدون تغییر می‌مانند.'))return;
 button.disabled=true;button.textContent='در حال همسان‌سازی…';card.setAttribute('aria-busy','true');
 try{
  const result=await api('zones/'+encodeURIComponent(zone.id)+'/sync-chart',{method:'POST',body:'{}'});
  if(result.persisted!==true)throw new Error('سرور ذخیره‌سازی چارت را تأیید نکرد. عملیات کامل نشده است.');
  message(card,'همسان‌سازی در چارت ذخیره شد: '+fa(result.updated_users)+' نیرو و '+fa(result.saved_relations)+' ارتباط مدیریتی. صفحه چارت سازمانی را باز کنید.',false);
  window.dispatchEvent(new CustomEvent('khatyar:regional-chart-synchronized',{detail:{zone_id:Number(zone.id),refreshed_at:result.refreshed_at}}));
 }catch(error){message(card,error.message||'همسان‌سازی چارت انجام نشد.',true);}
 finally{button.disabled=false;button.textContent='همسان‌سازی چارت';card.removeAttribute('aria-busy');}
}
async function mount(){
 if(updating||!document.querySelector(boardSelector))return;
 updating=true;
 try{
  await loadZones();
  for(const card of document.querySelectorAll(boardSelector+' .col')){
   if(card.querySelector(':scope > .kh-chart-sync-button'))continue;
   const zone=matchZone(card);if(!zone)continue;
   const button=document.createElement('button');button.type='button';button.className='kh-chart-sync-button';
   button.textContent='همسان‌سازی چارت';button.title='بازمحاسبه چارت منطقه و زیرمنطقه‌ها بر اساس سمت افراد';
   button.addEventListener('click',()=>synchronize(button,card,zone));
   card.prepend(button);
  }
 }finally{updating=false;}
}
const css=document.createElement('style');css.textContent='.kh-chart-sync-button{display:block;width:100%;margin:0 0 10px;padding:10px 12px;border:1px solid #077959;border-radius:11px;background:#e8f6ef;color:#075e48;text-align:center;cursor:pointer;font:700 12px Vazirmatn,Tahoma,sans-serif}.kh-chart-sync-button:hover{background:#d2eee0}.kh-chart-sync-button:disabled{cursor:progress;opacity:.6}.kh-chart-sync-status{font:500 11px Vazirmatn,Tahoma,sans-serif;line-height:1.9;margin:0 0 8px}@media(max-width:600px){.kh-chart-sync-button{min-height:44px}}';document.head.appendChild(css);
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mount().catch(()=>{});},300);}
function start(){const observer=new MutationObserver(schedule);observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();