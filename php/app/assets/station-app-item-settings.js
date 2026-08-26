/* Unified Role App Items integration: station items live inside the existing app-item list. */
(function(){
'use strict';
if(window.__KH_UNIFIED_STATION_ITEMS__)return;window.__KH_UNIFIED_STATION_ITEMS__=true;
const API='/api/admin/role-app-items';
const ITEMS=[['StationCapture','📍 ثبت موقعیت و تصویر خطوط'],['MyStations','🗺️ ایستگاه‌های ثبت‌شده من']];
const token=()=>localStorage.getItem('token')||localStorage.getItem('access')||localStorage.getItem('access_token')||'';
const txt=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
async function api(method,body){const r=await fetch(API,{method,cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:'Bearer '+token()},body:body?JSON.stringify(body):undefined});const t=await r.text();let d={};try{d=JSON.parse(t||'{}')}catch(e){throw Error('پاسخ نامعتبر از سرور')};if(!r.ok)throw Error(d.error||'خطای سرور');return d}
function roleSelect(){return [...document.querySelectorAll('select')].find(s=>/سمت/.test(txt(s.parentElement)||txt(s.previousElementSibling))||[...s.options].some(o=>/اپراتور|بازرس|مدیر کل|ناظر/.test(o.textContent||'')))||null}
function listHost(){const cb=[...document.querySelectorAll('input[type="checkbox"]')].find(x=>/جستجوی تاکسی و تاکسیران/.test(txt(x.parentElement)));if(!cb)return null;let p=cb.parentElement;for(let i=0;i<5&&p;i++,p=p.parentElement){if((p.querySelectorAll?.('input[type="checkbox"]').length||0)>=10)return p}return cb.parentElement}
function selectedRole(){const s=roleSelect();return s?.value?String(s.value):null}
async function get(){try{return await api('GET')}catch(e){return null}}
function removeRows(){document.querySelectorAll('[data-kh-unified-station-item]').forEach(x=>x.remove())}
async function render(){const host=listHost();if(!host)return;const d=window.__KH_ROLE_ITEMS_DATA__||await get();if(!d)return;window.__KH_ROLE_ITEMS_DATA__=d;const cfg=d.config&&typeof d.config==='object'?d.config:{};const rid=selectedRole();const explicit=rid!=null&&Object.prototype.hasOwnProperty.call(cfg,rid)&&Array.isArray(cfg[rid]);const current=explicit?cfg[rid]:null;removeRows();let anchor=[...host.querySelectorAll('input[type="checkbox"]')].at(-1)?.closest('label,div')||host;ITEMS.forEach(([key,label])=>{const row=document.createElement('label');row.dataset.khUnifiedStationItem=key;row.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 4px;cursor:pointer;direction:rtl;';const cb=document.createElement('input');cb.type='checkbox';cb.dataset.khStationKey=key;cb.checked=current===null?true:current.includes(key);const span=document.createElement('span');span.textContent=label;span.style.fontFamily='Vazirmatn,Tahoma';row.append(cb,span);anchor.parentNode.insertBefore(row,anchor.nextSibling);anchor=row;});}
async function saveStationState(rid,state){const d=await get();if(!d)return;const cfg=JSON.parse(JSON.stringify(d.config&&typeof d.config==='object'?d.config:{}));const old=Array.isArray(cfg[rid])?[...cfg[rid]]:Array.isArray(d.items)?[...d.items]:[];const base=old.filter(x=>x!=='LineLocation'&&x!=='StationCapture'&&x!=='MyStations');state.forEach(([key,on])=>{if(on)base.push(key)});cfg[rid]=[...new Set(base)];await api('POST',{config:cfg});window.__KH_ROLE_ITEMS_DATA__=Object.assign({},d,{config:cfg})}
document.addEventListener('change',e=>{if(e.target?.tagName==='SELECT'&&e.target===roleSelect())setTimeout(()=>render(),150)});
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b||!/ذخیره/.test(txt(b))||!listHost())return;const rid=selectedRole();if(!rid)return;const state=[...document.querySelectorAll('[data-kh-unified-station-item] input[data-kh-station-key]')].map(x=>[x.dataset.khStationKey,!!x.checked]);setTimeout(()=>saveStationState(rid,state).catch(()=>{}),500)});
setTimeout(render,900);setTimeout(render,1800);
})();
