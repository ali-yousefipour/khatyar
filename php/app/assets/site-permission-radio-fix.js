/* KhatYar - site section permission UI patch
 * Keeps Radio (بی‌سیم) in the EXISTING site-section permissions UI.
 * This is intentionally separate from role-app-items.
 */
(function(){
  'use strict';
  const API='/api';
  const token=()=>localStorage.token||'';
  const auth=()=>({Authorization:'Bearer '+token()});
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();

  async function settings(){
    const r=await fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'});
    if(!r.ok) throw new Error('settings '+r.status);
    return r.json();
  }
  async function saveRole(id, values){
    const s=await settings();
    const all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};
    all[String(id)]=Array.from(new Set(values));
    const r=await fetch(API+'/admin/settings',{method:'PUT',headers:{'content-type':'application/json',...auth()},body:JSON.stringify({role_perms:all})});
    if(!r.ok) throw new Error('save '+r.status);
  }
  function panel(){
    return [...document.querySelectorAll('div,section,article')].find(el=>{
      const t=norm(el.textContent);
      return t.includes('سطح دسترسی سمت‌ها به بخش‌های سایت') && t.includes('برای هر سمت تعیین کنید');
    })||null;
  }
  function roleSelect(p){
    return p&&[...p.querySelectorAll('select')].find(s=>[...s.options].some(o=>norm(o.textContent).includes('یک سمت را انتخاب کنید')));
  }
  function permissionRows(p){
    return [...p.querySelectorAll('label,.row,div')].filter(el=>{
      const t=norm(el.textContent);
      return t && !t.includes('سطح دسترسی سمت‌ها به بخش‌های سایت') && !t.includes('یک سمت را انتخاب کنید') && el.querySelector('input[type="checkbox"]');
    });
  }
  async function sync(row, sel){
    const id=sel&&sel.value;
    if(!id){row.style.display='none';return;}
    try{
      const s=await settings();
      const p=s.role_perms&&Array.isArray(s.role_perms[String(id)])?s.role_perms[String(id)]:[];
      row.querySelector('input').checked=p.includes('radio');
      row.style.display='flex';
    }catch(e){row.style.display='none';}
  }
  function install(){
    const p=panel(); if(!p)return;
    const sel=roleSelect(p); if(!sel)return;
    let row=p.querySelector('[data-khatyar-site-radio]');
    if(!row){
      row=document.createElement('label');
      row.setAttribute('data-khatyar-site-radio','1');
      row.className='row';
      row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 2px;margin-top:4px;border-bottom:1px solid var(--line,#e4e7ec);font-size:13px;cursor:pointer;';
      const text=document.createElement('span'); text.textContent='بی‌سیم';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.setAttribute('aria-label','دسترسی به بخش بی‌سیم');
      cb.addEventListener('change',async()=>{
        const id=sel.value;if(!id){cb.checked=false;return;}
        try{
          const s=await settings();
          const all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};
          const cur=Array.isArray(all[String(id)])?all[String(id)].slice():[];
          const i=cur.indexOf('radio');
          if(cb.checked&&i<0)cur.push('radio');
          if(!cb.checked&&i>=0)cur.splice(i,1);
          await saveRole(id,cur);
        }catch(e){cb.checked=!cb.checked;alert('ذخیره دسترسی بی‌سیم ناموفق بود.');}
      });
      row.append(text,cb);
      const saveBtn=[...p.querySelectorAll('button')].find(b=>norm(b.textContent).includes('ذخیرهٔ دسترسی‌ها')||norm(b.textContent).includes('ذخیره دسترسی‌ها'));
      if(saveBtn) saveBtn.parentElement?.before(row); else p.appendChild(row);
    }
    if(!sel.dataset.khatyarRadioPermissionBound){
      sel.dataset.khatyarRadioPermissionBound='1';
      sel.addEventListener('change',()=>setTimeout(()=>sync(row,sel),50));
    }
    sync(row,sel);
  }
  function boot(){
    install();
    const mo=new MutationObserver(()=>install());
    if(document.body)mo.observe(document.body,{childList:true,subtree:true});
    setInterval(install,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));
  else setTimeout(boot,250);
})();
