/* KhatYar - Radio site-section restoration
 * Radio is an ADMIN/SITE section, not an app-item permission.
 * This patch deliberately restores it in both the sidebar and the existing
 * "سطح دسترسی سمت‌ها به بخش‌های سایت" panel, using role_perms.radio.
 */
(function(){
  'use strict';
  const API='/api';
  const token=()=>localStorage.token||'';
  const auth=()=>({Authorization:'Bearer '+token()});
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();

  async function getSettings(){
    const r=await fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'});
    if(!r.ok)throw new Error('settings '+r.status);
    return r.json();
  }
  async function saveRolePerms(id,values){
    const s=await getSettings();
    const all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};
    all[String(id)]=Array.from(new Set(values));
    const r=await fetch(API+'/admin/settings',{method:'PUT',headers:{'content-type':'application/json',...auth()},body:JSON.stringify({role_perms:all})});
    if(!r.ok)throw new Error('save '+r.status);
  }

  function accessPanel(){
    return document.querySelector('.t-access') || [...document.querySelectorAll('.panel,section,article,div')].find(el=>{
      const t=norm(el.textContent);
      return t.includes('سطح دسترسی سمت‌ها به بخش‌های سایت');
    }) || null;
  }
  function roleSelect(panel){
    if(!panel)return null;
    return [...panel.querySelectorAll('select')].find(s=>
      [...s.options].some(o=>norm(o.textContent).includes('یک سمت را انتخاب کنید'))
    ) || panel.querySelector('select');
  }

  function installPermissionRow(){
    const panel=accessPanel();
    const sel=roleSelect(panel);
    if(!panel||!sel)return;

    let row=panel.querySelector('[data-khatyar-site-radio]');
    if(!row){
      row=document.createElement('label');
      row.setAttribute('data-khatyar-site-radio','1');
      row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px;margin-top:6px;border-bottom:1px solid var(--line,#e4e7ec);font-size:13px;cursor:pointer;';
      const text=document.createElement('span');
      text.textContent='بی‌سیم';
      const cb=document.createElement('input');
      cb.type='checkbox';
      cb.setAttribute('aria-label','دسترسی به بخش بی‌سیم');
      row.append(text,cb);

      const saveBtn=[...panel.querySelectorAll('button')].find(b=>{
        const t=norm(b.textContent);
        return t.includes('ذخیره') && t.includes('دسترسی');
      });
      if(saveBtn) saveBtn.parentElement?.before(row);
      else panel.appendChild(row);
    }

    const cb=row.querySelector('input[type="checkbox"]');
    if(cb&&!cb.dataset.khatyarRadioBound){
      cb.dataset.khatyarRadioBound='1';
      cb.addEventListener('change',async()=>{
        const id=sel.value;
        if(!id){cb.checked=false;return;}
        try{
          const s=await getSettings();
          const all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};
          const key=String(id);
          const cur=Array.isArray(all[key])?all[key].slice():[];
          const i=cur.indexOf('radio');
          if(cb.checked&&i<0)cur.push('radio');
          if(!cb.checked&&i>=0)cur.splice(i,1);
          await saveRolePerms(id,cur);
          window.dispatchEvent(new CustomEvent('khatyar-radio-permission-changed',{detail:{role_id:id,enabled:cb.checked}}));
        }catch(e){
          cb.checked=!cb.checked;
          alert('ذخیره دسترسی بی‌سیم ناموفق بود.');
        }
      });
    }

    const sync=async()=>{
      const id=sel.value;
      if(!id){row.style.display='none';return;}
      try{
        const s=await getSettings();
        const p=s.role_perms&&Array.isArray(s.role_perms[String(id)])?s.role_perms[String(id)]:[];
        cb.checked=p.includes('radio');
        row.style.display='flex';
      }catch(e){
        row.style.display='none';
      }
    };
    if(!sel.dataset.khatyarRadioPermissionBound){
      sel.dataset.khatyarRadioPermissionBound='1';
      sel.addEventListener('change',()=>setTimeout(sync,30));
    }
    sync();
  }

  function sidebarRoot(){
    return document.querySelector('.nav') || document.querySelector('nav[role="navigation"]') || document.querySelector('aside nav') || document.querySelector('aside');
  }
  function hasRadioLink(){
    return !!document.querySelector('[data-khatyar-radio-link]') || [...document.querySelectorAll('a,button')].some(el=>{
      const t=norm(el.textContent);
      return t==='بی‌سیم' || t.includes('بی‌سیم');
    });
  }
  function installSidebar(){
    const nav=sidebarRoot();
    if(!nav||hasRadioLink())return;

    const a=document.createElement('a');
    a.href='radio-admin.html';
    a.dataset.view='radio';
    a.dataset.key='radio';
    a.dataset.khatyarRadioLink='1';
    a.textContent='بی‌سیم';
    a.style.cssText='display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;';

    const settings=[...nav.querySelectorAll('a,button')].find(x=>norm(x.textContent)==='تنظیمات');
    if(settings)settings.before(a); else nav.appendChild(a);

    syncSidebarVisibility(a);
  }
  async function syncSidebarVisibility(link){
    try{
      const roleId=localRoleId();
      if(roleId==null){link.style.display='none';return;}
      const s=await getSettings();
      const p=s.role_perms&&Array.isArray(s.role_perms[String(roleId)])?s.role_perms[String(roleId)]:[];
      link.style.display=p.includes('radio')?'block':'none';
    }catch(e){
      link.style.display='none';
    }
  }
  function localRoleId(){
    try{
      const raw=localStorage.token||'';
      const part=raw.split('.')[1];
      if(part){
        const b64=part.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((part.length+3)%4);
        const p=JSON.parse(decodeURIComponent(escape(atob(b64))));
        const id=p.role_id??p.roleId??p.role?.id;
        if(id!=null)return id;
      }
    }catch(e){}
    for(const k of ['role_id','roleId','user_role_id','current_role_id']){
      const v=localStorage.getItem(k);
      if(v!==null&&v!=='')return v;
    }
    for(const k of ['user','currentUser','auth_user','me']){
      try{
        const v=JSON.parse(localStorage.getItem(k)||'null');
        if(v){const id=v.role_id??v.roleId??v.role?.id;if(id!=null)return id;}
      }catch(e){}
    }
    return null;
  }

  function run(){
    installPermissionRow();
    installSidebar();
    const link=document.querySelector('[data-khatyar-radio-link]');
    if(link)syncSidebarVisibility(link);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250));
  else setTimeout(run,250);
  new MutationObserver(()=>run()).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(run,2000);
})();