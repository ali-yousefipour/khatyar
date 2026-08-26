(function(){
'use strict';
if(window.__KH_STATION_APP_ITEM_SETTINGS__)return;
window.__KH_STATION_APP_ITEM_SETTINGS__=true;
const API='/api/admin/role-app-items',KEY='LineLocation';
const ALL=['Search','PresentList','Reports','CheckIn','Requests','RequestInbox','WorkSummary','SalarySlips','CompanyRequests','Subscription','Sms','BotMessages','MySms','Forms','Cultural','Welfare','OfficialPresence','Inventory','MyDailyMission','LineVisitProgram','LineLocation','RoleDashboard','Leaderboard','ActivityReport','ExpInsurance','ExpTaxi','ExpOplic','TeamReport','TempDrivers','Outage'];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>localStorage.getItem('token')||localStorage.getItem('access')||localStorage.getItem('access_token')||'';
async function api(method,body){const r=await fetch(API,{method,cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:'Bearer '+token()},body:body?JSON.stringify(body):undefined});const t=await r.text();let d={};try{d=JSON.parse(t||'{}')}catch(e){throw Error('پاسخ نامعتبر از سرور')};if(!r.ok)throw Error(d.error||'خطای سرور');return d}
function text(el){return (el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim()}
function removeLegacy(){
  const re=/مجوز\s*ثبت\s*موقعیت\s*و\s*تصویر\s*خطوط|مجوز\s*ثبت\s*موقعیت\s*خطوط/;
  document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,section,article').forEach(el=>{
    const t=text(el); if(!t||!re.test(t)||/ثبت\s*ایستگاه‌ها/.test(t))return;
    let x=el; for(let i=0;i<5&&x.parentElement;i++){if(x.matches('section,article,.card,[class*=card]'))break;x=x.parentElement}
    if(x&&x!==document.body)x.style.display='none';
  });
}
function findAppItemsHost(){
  const exact=/آیتم[‌\s_-]*های\s*(?:اپ|برنامه)\s*(?:هر\s*سمت|هر\s*نقش)?/i;
  const candidates=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],section,article,.card,[class*=card]')]
    .filter(x=>exact.test(text(x)) && text(x).length<2500);
  if(!candidates.length)return null;
  candidates.sort((a,b)=>{
    const score=x=>{let s=0,t=text(x);if(/هر\s*سمت/.test(t))s+=50;if(/چک|checkbox|سمت|نقش/.test(t))s+=20;if(x.querySelectorAll('input[type=checkbox]').length)s+=30;if(x.querySelectorAll('button').length)s+=5;s-=Math.min(10,t.length/250);return s};
    return score(b)-score(a);
  });
  const n=candidates[0];
  return n.closest('section,article,.card,[class*=card]')||n.parentElement;
}
function findInsertionHost(){
  const host=findAppItemsHost();
  if(!host)return null;
  if(host.querySelector('#kh-station-app-item-card'))return host;
  return host;
}
async function mount(){
  removeLegacy();
  if(document.getElementById('kh-station-app-item-card'))return;
  const host=findInsertionHost();
  if(!host)return;
  let d; try{d=await api('GET')}catch(e){return}
  const roles=Array.isArray(d.roles)?d.roles:[];
  if(!roles.length)return;
  const cfg=d.config&&typeof d.config==='object'?d.config:{};
  const card=document.createElement('section');
  card.id='kh-station-app-item-card';
  card.dir='rtl';
  card.style.cssText='margin:12px 0;padding:14px;border:1px solid #e4e9f2;border-radius:16px;background:#fff;font-family:Vazirmatn,Tahoma;';
  card.innerHTML='<div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px">📍 <span>ثبت ایستگاه‌ها</span></div><div style="font-size:11px;color:#667085;line-height:1.8;margin:6px 0 10px">این گزینه یک «آیتم اپ» است. با فعال کردن آن برای هر سمت، قابلیت ثبت موقعیت و ایستگاه‌ها در Android و Web App همان سمت نمایش داده می‌شود.</div><div id="kh-station-role-list"></div><button id="kh-station-save" style="margin-top:12px;border:0;border-radius:10px;padding:10px 16px;background:#0d7a5f;color:#fff;font:inherit;font-weight:800;cursor:pointer">ذخیره آیتم برای سمت‌ها</button><span id="kh-station-status" style="margin-right:10px;font-size:11px"></span>';
  const list=card.querySelector('#kh-station-role-list');
  roles.forEach(r=>{
    const rid=String(r.id),has=Object.prototype.hasOwnProperty.call(cfg,rid),checked=has?Array.isArray(cfg[rid])&&cfg[rid].includes(KEY):true;
    const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:9px;padding:9px 0;border-top:1px solid #eef1f6;font-size:12px;cursor:pointer';
    row.innerHTML='<input type="checkbox" data-role="'+esc(rid)+'" '+(checked?'checked':'')+'><span>'+esc(r.title)+'</span>';
    list.appendChild(row);
  });
  host.appendChild(card);
  card.querySelector('#kh-station-save').onclick=async()=>{
    const out=JSON.parse(JSON.stringify(cfg||{}));
    roles.forEach(r=>{
      const rid=String(r.id),el=card.querySelector('[data-role="'+CSS.escape(rid)+'"]'),on=!!el?.checked;
      if(on){
        if(Object.prototype.hasOwnProperty.call(out,rid)&&Array.isArray(out[rid])){if(!out[rid].includes(KEY))out[rid].push(KEY)}
        else delete out[rid];
      }else{
        if(Array.isArray(out[rid]))out[rid]=out[rid].filter(x=>x!==KEY);
        else out[rid]=ALL.filter(x=>x!==KEY);
      }
    });
    const st=card.querySelector('#kh-station-status');st.textContent='در حال ذخیره…';
    try{await api('POST',{config:out});st.textContent='ذخیره شد';st.style.color='#16804d';setTimeout(()=>st.textContent='',1800)}catch(e){st.textContent=e.message;st.style.color='#b42318'}
  };
}
const mo=new MutationObserver(()=>{removeLegacy();mount()});
mo.observe(document.documentElement,{childList:true,subtree:true});
[700,1800,3500,6000].forEach(x=>setTimeout(mount,x));
})();
