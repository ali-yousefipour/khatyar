(function(){'use strict';
function payload(){try{const p=(localStorage.token||'').split('.')[1];return p?JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g,'+').replace(/_/g,'/'))))):null}catch(e){return null}}
function roleId(){const me=payload()||{};return me.role_id??me.roleId??me.role}
function isAllowed(settings){const id=roleId();if(id==null)return false;const p=settings&&settings.role_perms||{};const list=p[String(id)]??p[id];return Array.isArray(list)&&list.includes('radio')}
function makeLink(){const a=document.createElement('a');a.href='radio-admin.html';a.target='_self';a.dataset.khatyarRadioAdmin='1';a.dataset.khatyarRadioLink='1';a.innerHTML='<span aria-hidden="true">📻</span><span>تنظیمات بی‌سیم</span>';a.style.cssText='display:flex;align-items:center;gap:8px;margin:4px 8px;padding:9px 12px;border-radius:10px;color:inherit;font:700 12px Vazirmatn,Tahoma;text-decoration:none;text-align:right;position:relative;z-index:20';return a}
function findHumanResourcesHost(){const roots=[...document.querySelectorAll('aside,nav,[role="navigation"],.sidebar,.side-bar,.drawer')].filter(x=>x.offsetParent!==null);for(const root of roots){const nodes=[...root.querySelectorAll('*')];const label=nodes.find(x=>String(x.textContent||'').trim()==='منابع انسانی');if(label){let host=label.parentElement||label;let submenu=host.querySelector(':scope > div,:scope > ul,:scope > section');if(!submenu)submenu=host;return submenu}}return null}
function addSidebar(){if(document.querySelector('[data-khatyar-radio-admin]'))return;const link=makeLink();const host=findHumanResourcesHost();if(host){host.appendChild(link);return}const candidates=[...document.querySelectorAll('aside,nav,[role="navigation"],.sidebar,.side-bar,.drawer')].filter(x=>x.offsetParent!==null&&x.clientHeight>100);(candidates[0]||document.body).appendChild(link)}
function injectPermissionOption(settings){
  const headings=[...document.querySelectorAll('*')].filter(x=>String(x.textContent||'').trim()==='سطح دسترسی سمت‌ها به بخش‌های سایت');
  if(!headings.length||document.querySelector('[data-khatyar-radio-permission]'))return;
  const heading=headings[0];
  let box=heading.parentElement;while(box&&box!==document.body&&!/داشبورد/.test(String(box.textContent||'')))box=box.parentElement;
  if(!box)box=heading.parentElement;
  const wrap=document.createElement('label');wrap.dataset.khatyarRadioPermission='1';wrap.style.cssText='display:flex;align-items:center;gap:8px;margin:8px 0;padding:8px 10px;border:1px solid #e4e7ec;border-radius:8px;cursor:pointer';
  const cb=document.createElement('input');cb.type='checkbox';cb.dataset.permissionKey='radio';cb.checked=isAllowed(settings);cb.setAttribute('aria-label','بی‌سیم');
  const text=document.createElement('span');text.textContent='بی‌سیم';wrap.append(cb,text);
  const save=[...document.querySelectorAll('button')].find(b=>String(b.textContent||'').includes('ذخیرهٔ دسترسی‌ها')||String(b.textContent||'').includes('ذخیره دسترسی‌ها'));
  (save&&save.parentElement?save.parentElement:box).insertBefore(wrap,save||null);
}
async function ready(){const token=localStorage.token||'';if(!token)return;const h={Authorization:'Bearer '+token};try{const r=await fetch('/api/admin/settings',{headers:h,cache:'no-store'});if(!r.ok)return;const settings=await r.json();if(!isAllowed(settings))return;addSidebar();injectPermissionOption(settings)}catch(e){}}
function boot(){setTimeout(ready,1000);setTimeout(ready,2500);setTimeout(ready,5000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();